package domain

import (
	"context"
	"log/slog"
	"net/url"
	"strings"
)

const guestDispatchBatchSize = 50

type GuestNotificationService struct {
	guestNotificationRepository GuestNotificationRepository
	transactionRepository       TransactionRepository
	paymentRepository           PaymentRepository
	whatsappGatewayRepository   WhatsAppGatewayRepository
	orderWebBaseURL             string
}

func NewGuestNotificationService(
	guestNotificationRepository GuestNotificationRepository,
	transactionRepository TransactionRepository,
	paymentRepository PaymentRepository,
	whatsappGatewayRepository WhatsAppGatewayRepository,
	orderWebBaseURL string,
) GuestNotificationService {
	return GuestNotificationService{
		guestNotificationRepository: guestNotificationRepository,
		transactionRepository:       transactionRepository,
		paymentRepository:           paymentRepository,
		whatsappGatewayRepository:   whatsappGatewayRepository,
		orderWebBaseURL:             orderWebBaseURL,
	}
}

func (service GuestNotificationService) TriggerDispatch() {
	go func() {
		if err := service.DispatchPending(context.Background()); err != nil {
			slog.Error("guest notification dispatch triggered after completion failed", slog.Any("error", err))
		}
	}()
}

func (service GuestNotificationService) DispatchPending(ctx context.Context) *Error {
	notifications, err := service.guestNotificationRepository.ClaimPendingGuestNotifications(ctx, guestDispatchBatchSize)
	if err != nil {
		return err
	}

	for _, notification := range notifications {
		service.dispatchOne(ctx, notification)
	}

	return nil
}

func (service GuestNotificationService) dispatchOne(ctx context.Context, notification GuestNotification) {
	logger := slog.With(
		slog.Int64("guestNotificationId", notification.Id),
		slog.Int64("transactionId", notification.TransactionId),
	)

	if notification.WhatsappNumber == nil || *notification.WhatsappNumber == "" {
		service.markSkipped(ctx, notification.Id, "no whatsapp number for order", logger)
		return
	}

	transaction, err := service.transactionRepository.GetTransactionById(ctx, notification.TransactionId)
	if err != nil {
		service.markRejected(ctx, notification.Id, "failed to load transaction: "+err.Message, logger)
		return
	}

	payment, err := service.paymentRepository.GetPaymentByTransactionId(ctx, notification.TransactionId)
	if err != nil {
		service.markRejected(ctx, notification.Id, "failed to load payment: "+err.Message, logger)
		return
	}

	accessKey := ""
	if payment.AccessKey != nil {
		accessKey = *payment.AccessKey
	}
	orderUrl := BuildOrderStatusUrl(service.orderWebBaseURL, payment.PartnerReferenceNo, accessKey)
	message := BuildGuestWhatsappMessage(transaction, payment, orderUrl)

	result, sendErr := service.whatsappGatewayRepository.Send(ctx, WhatsAppMessage{To: *notification.WhatsappNumber, Body: message})
	if sendErr != nil {
		service.markUnknown(ctx, notification.Id, "outcome unknown: "+sendErr.Message, logger)
		return
	}

	switch result.Outcome {
	case WhatsAppSendOutcomeAccepted:
		if markErr := service.guestNotificationRepository.MarkGuestNotificationSent(ctx, notification.Id, result.ProviderMessageId); markErr != nil {
			logger.Error("failed to mark guest notification sent", slog.Any("error", markErr))
		}
		logger.Info("guest whatsapp notification sent", slog.String("providerMessageId", result.ProviderMessageId))
	case WhatsAppSendOutcomeRejected:
		if result.Detail == WhatsAppGatewayNotConfiguredDetail {
			service.markSkipped(ctx, notification.Id, result.Detail, logger)
			return
		}
		service.markRejected(ctx, notification.Id, result.Detail, logger)
	default:
		service.markUnknown(ctx, notification.Id, result.Detail, logger)
	}
}

func (service GuestNotificationService) markSkipped(ctx context.Context, id int64, detail string, logger *slog.Logger) {
	if err := service.guestNotificationRepository.MarkGuestNotificationSkipped(ctx, id, detail); err != nil {
		logger.Error("failed to mark guest notification skipped", slog.Any("error", err))
	}
	logger.Warn("guest whatsapp notification skipped", slog.String("detail", detail))
}

func (service GuestNotificationService) markRejected(ctx context.Context, id int64, detail string, logger *slog.Logger) {
	if err := service.guestNotificationRepository.MarkGuestNotificationFailed(ctx, id, detail); err != nil {
		logger.Error("failed to mark guest notification failed", slog.Any("error", err))
	}
	logger.Warn("guest whatsapp notification rejected", slog.String("detail", detail))
}

func (service GuestNotificationService) markUnknown(ctx context.Context, id int64, detail string, logger *slog.Logger) {
	if err := service.guestNotificationRepository.MarkGuestNotificationUnknownOutcome(ctx, id, detail); err != nil {
		logger.Error("failed to mark guest notification failed", slog.Any("error", err))
	}
	logger.Warn("guest whatsapp notification outcome unknown", slog.String("detail", detail))
}

func BuildOrderStatusUrl(baseUrl string, reference string, accessKey string) string {
	trimmedBaseUrl := strings.TrimRight(baseUrl, "/")

	return trimmedBaseUrl + "/orders/" + url.PathEscape(reference) + "?k=" + url.QueryEscape(accessKey)
}
