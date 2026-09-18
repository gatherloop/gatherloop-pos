package domain

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
)

// FR-4: mirrors kdsDispatchBatchSize — a bounded batch per sweep so one dispatcher tick cannot run unbounded.
const guestDispatchBatchSize = 50

type GuestNotificationUsecase struct {
	repository             GuestNotificationRepository
	subscriptionRepository WebPushSubscriptionRepository
	transactionRepository  TransactionRepository
	paymentRepository      PaymentRepository
	pushGateway            WebPushGatewayRepository
}

func NewGuestNotificationUsecase(
	repository GuestNotificationRepository,
	subscriptionRepository WebPushSubscriptionRepository,
	transactionRepository TransactionRepository,
	paymentRepository PaymentRepository,
	pushGateway WebPushGatewayRepository,
) GuestNotificationUsecase {
	return GuestNotificationUsecase{
		repository:             repository,
		subscriptionRepository: subscriptionRepository,
		transactionRepository:  transactionRepository,
		paymentRepository:      paymentRepository,
		pushGateway:            pushGateway,
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

// DispatchPending claims up to guestDispatchBatchSize pending rows, oldest first, and delivers
// each to every live subscription for its session (FR-4). Called immediately after a completion
// commits and on every notification sweeper tick from main.go.
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

func (usecase GuestNotificationUsecase) dispatchOne(ctx context.Context, notification GuestNotification) {
	logger := slog.With(
		slog.Int64("guestNotificationId", notification.Id),
		slog.Int64("transactionId", notification.TransactionId),
	)

	transaction, err := usecase.transactionRepository.GetTransactionById(ctx, notification.TransactionId)
	if err != nil {
		usecase.markFailed(ctx, notification.Id, "failed to load transaction: "+err.Message, logger)
		return
	}

	payment, err := usecase.paymentRepository.GetPaymentByTransactionId(ctx, notification.TransactionId)
	if err != nil {
		usecase.markFailed(ctx, notification.Id, "failed to load payment: "+err.Message, logger)
		return
	}

	subscriptions, err := usecase.subscriptionRepository.GetWebPushSubscriptionsBySessionId(ctx, notification.SessionId)
	if err != nil {
		usecase.markFailed(ctx, notification.Id, "failed to load subscriptions: "+err.Message, logger)
		return
	}

	// FR-4 step 3: the guest never opted in; retrying does not create a subscription.
	if len(subscriptions) == 0 {
		detail := "no active subscription for session"
		if markErr := usecase.repository.MarkGuestNotificationSkipped(ctx, notification.Id, detail); markErr != nil {
			logger.Error("failed to mark guest notification skipped", slog.Any("error", markErr))
		}
		logger.Warn("guest notification skipped", slog.String("detail", detail))
		return
	}

	message := BuildGuestPushMessage(transaction, payment.PartnerReferenceNo)
	messages := make([]WebPushMessage, len(subscriptions))
	for i, subscription := range subscriptions {
		subscriptionMessage := message
		subscriptionMessage.Endpoint = subscription.Endpoint
		subscriptionMessage.P256dhKey = subscription.P256dhKey
		subscriptionMessage.AuthKey = subscription.AuthKey
		messages[i] = subscriptionMessage
	}

	receipts, sendErr := usecase.pushGateway.Send(ctx, messages)
	if sendErr != nil {
		usecase.markFailed(ctx, notification.Id, sendErr.Message, logger)
		logger.Error("web push gateway send failed", slog.Any("error", sendErr))
		return
	}

	accepted := 0
	var failureDetails []string
	for i, receipt := range receipts {
		if i >= len(subscriptions) {
			break
		}
		subscription := subscriptions[i]

		if receipt.Status == WebPushReceiptStatusOk {
			accepted++
			continue
		}

		failureDetails = append(failureDetails, fmt.Sprintf("%s: %s", subscription.Endpoint, receipt.Message))

		// D10: the Web Push protocol's definitive "this subscription is dead" receipt, and the
		// only signal that justifies pruning a subscription the guest granted.
		if receipt.ErrorCode == WebPushErrorCodeGone {
			usecase.pruneSubscription(ctx, subscription, logger)
		}
	}

	detail := strings.Join(failureDetails, "; ")

	// FR-4 step 5: at least one accepted subscription means the guest's browser was told.
	if accepted > 0 {
		if markErr := usecase.repository.MarkGuestNotificationSent(ctx, notification.Id, detail); markErr != nil {
			logger.Error("failed to mark guest notification sent", slog.Any("error", markErr))
		}
		logger.Info("guest notification sent",
			slog.Int("acceptedSubscriptions", accepted),
			slog.Int("totalSubscriptions", len(subscriptions)),
		)
		return
	}

	usecase.markFailed(ctx, notification.Id, detail, logger)
}

func (usecase GuestNotificationUsecase) pruneSubscription(ctx context.Context, subscription WebPushSubscription, logger *slog.Logger) {
	if err := usecase.subscriptionRepository.UnsubscribeWebPush(ctx, subscription.SessionId, subscription.Endpoint); err != nil {
		logger.Error("failed to prune dead web push subscription",
			slog.Int64("webPushSubscriptionId", subscription.Id), slog.Any("error", err))
		return
	}
	logger.Info("pruned dead web push subscription", slog.Int64("webPushSubscriptionId", subscription.Id))
}

func (usecase GuestNotificationUsecase) markFailed(ctx context.Context, id int64, detail string, logger *slog.Logger) {
	if err := usecase.repository.MarkGuestNotificationFailed(ctx, id, detail); err != nil {
		logger.Error("failed to mark guest notification failed", slog.Any("error", err))
	}
	logger.Warn("guest notification delivery failed", slog.String("detail", detail))
}
