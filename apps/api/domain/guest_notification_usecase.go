package domain

import (
	"context"
	"log/slog"
	"time"
)

// FR-4: mirrors kdsDispatchBatchSize — a bounded batch per sweep so one dispatcher tick cannot run unbounded.
const guestDispatchBatchSize = 50

type GuestNotificationUsecase struct {
	repository            GuestNotificationRepository
	transactionRepository TransactionRepository
	paymentRepository     PaymentRepository
	whatsappGateway       WhatsAppGatewayRepository
	orderWebBaseURL       string
}

func NewGuestNotificationUsecase(
	repository GuestNotificationRepository,
	transactionRepository TransactionRepository,
	paymentRepository PaymentRepository,
	whatsappGateway WhatsAppGatewayRepository,
	orderWebBaseURL string,
) GuestNotificationUsecase {
	return GuestNotificationUsecase{
		repository:            repository,
		transactionRepository: transactionRepository,
		paymentRepository:     paymentRepository,
		whatsappGateway:       whatsappGateway,
		orderWebBaseURL:       orderWebBaseURL,
	}
}

// TriggerDispatch runs DispatchPending in the background (FR-4) so CompleteTransaction's caller
// never waits on a push service; the periodic sweeper in main.go is what catches this goroutine
// if it is lost to a crash or a deploy mid-flight.
func (usecase GuestNotificationUsecase) TriggerDispatch() {
	go func() {
		if err := usecase.DispatchPending(context.Background()); err != nil {
			slog.Error("guest notification dispatch triggered after completion failed", slog.Any("error", err))
		}
	}()
}

// DispatchPending claims up to guestDispatchBatchSize pending rows, oldest first, and sends each
// its WhatsApp message (FR-7). Called immediately after a completion commits and on every
// notification sweeper tick from main.go.
func (usecase GuestNotificationUsecase) DispatchPending(ctx context.Context) *Error {
	notifications, err := usecase.repository.ClaimPendingGuestNotifications(ctx, guestDispatchBatchSize)
	if err != nil {
		return err
	}

	for _, notification := range notifications {
		usecase.dispatchOne(ctx, notification)
	}

	return nil
}

// ExpireStaleSending gives up on rows a dispatcher claimed but never resolved (D8): called on
// every runMaintenanceSweeper tick alongside DispatchPending, so a claim orphaned by a crashed or
// deployed-over process does not sit in `sending` forever.
func (usecase GuestNotificationUsecase) ExpireStaleSending(ctx context.Context) *Error {
	return usecase.repository.ExpireStaleSending(ctx, time.Now().Add(-GuestNotificationStaleSendingThreshold))
}

// dispatchOne sends one claimed row's WhatsApp message and maps the outcome per FR-7/FR-8.
func (usecase GuestNotificationUsecase) dispatchOne(ctx context.Context, notification GuestNotification) {
	logger := slog.With(
		slog.Int64("guestNotificationId", notification.Id),
		slog.Int64("transactionId", notification.TransactionId),
	)

	// D16: a row enqueued before this phase shipped can still be pending with no number at
	// cut-over. It is recorded skipped on this, its first and only claim.
	if notification.WhatsappNumber == nil || *notification.WhatsappNumber == "" {
		usecase.markSkipped(ctx, notification.Id, "no whatsapp number for order", logger)
		return
	}

	transaction, err := usecase.transactionRepository.GetTransactionById(ctx, notification.TransactionId)
	if err != nil {
		usecase.markRejected(ctx, notification.Id, "failed to load transaction: "+err.Message, logger)
		return
	}

	payment, err := usecase.paymentRepository.GetPaymentByTransactionId(ctx, notification.TransactionId)
	if err != nil {
		usecase.markRejected(ctx, notification.Id, "failed to load payment: "+err.Message, logger)
		return
	}

	accessKey := ""
	if payment.AccessKey != nil {
		accessKey = *payment.AccessKey
	}
	orderUrl := BuildOrderStatusUrl(usecase.orderWebBaseURL, payment.PartnerReferenceNo, accessKey)
	message := BuildGuestWhatsappMessage(transaction, payment, orderUrl)

	result, sendErr := usecase.whatsappGateway.Send(ctx, WhatsAppMessage{To: *notification.WhatsappNumber, Body: message})
	if sendErr != nil {
		usecase.markUnknown(ctx, notification.Id, "outcome unknown: "+sendErr.Message, logger)
		return
	}

	switch result.Outcome {
	case WhatsAppSendOutcomeAccepted:
		if markErr := usecase.repository.MarkGuestNotificationSent(ctx, notification.Id, result.ProviderMessageId); markErr != nil {
			logger.Error("failed to mark guest notification sent", slog.Any("error", markErr))
		}
		logger.Info("guest whatsapp notification sent", slog.String("providerMessageId", result.ProviderMessageId))
	case WhatsAppSendOutcomeRejected:
		// D10: the disabled gateway's sentinel detail is a configuration fact, not a delivery
		// failure — it is recorded skipped and never retried.
		if result.Detail == WhatsAppGatewayNotConfiguredDetail {
			usecase.markSkipped(ctx, notification.Id, result.Detail, logger)
			return
		}
		usecase.markRejected(ctx, notification.Id, result.Detail, logger)
	default:
		usecase.markUnknown(ctx, notification.Id, result.Detail, logger)
	}
}

func (usecase GuestNotificationUsecase) markSkipped(ctx context.Context, id int64, detail string, logger *slog.Logger) {
	if err := usecase.repository.MarkGuestNotificationSkipped(ctx, id, detail); err != nil {
		logger.Error("failed to mark guest notification skipped", slog.Any("error", err))
	}
	logger.Warn("guest whatsapp notification skipped", slog.String("detail", detail))
}

// markRejected retries up to GuestNotificationMaxAttempts (FR-7 step 4, "rejected"): Fonnte
// stated outright that nothing was sent, so trying again risks nothing that wasn't already lost.
func (usecase GuestNotificationUsecase) markRejected(ctx context.Context, id int64, detail string, logger *slog.Logger) {
	if err := usecase.repository.MarkGuestNotificationFailed(ctx, id, detail); err != nil {
		logger.Error("failed to mark guest notification failed", slog.Any("error", err))
	}
	logger.Warn("guest whatsapp notification rejected", slog.String("detail", detail))
}

// markUnknown never retries (D9): an ambiguous outcome may already have reached the guest's phone.
func (usecase GuestNotificationUsecase) markUnknown(ctx context.Context, id int64, detail string, logger *slog.Logger) {
	if err := usecase.repository.MarkGuestNotificationUnknownOutcome(ctx, id, detail); err != nil {
		logger.Error("failed to mark guest notification failed", slog.Any("error", err))
	}
	logger.Warn("guest whatsapp notification outcome unknown", slog.String("detail", detail))
}
