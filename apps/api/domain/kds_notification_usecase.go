package domain

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
)

// FR-4: a bounded batch per sweep so one dispatcher tick cannot run unbounded.
const kdsDispatchBatchSize = 50

type KdsNotificationUsecase struct {
	repository            KdsNotificationRepository
	deviceRepository      KdsDeviceRepository
	transactionRepository TransactionRepository
	pushGateway           KdsPushGatewayRepository
	pushSound             string
}

func NewKdsNotificationUsecase(
	repository KdsNotificationRepository,
	deviceRepository KdsDeviceRepository,
	transactionRepository TransactionRepository,
	pushGateway KdsPushGatewayRepository,
	pushSound string,
) KdsNotificationUsecase {
	return KdsNotificationUsecase{
		repository:            repository,
		deviceRepository:      deviceRepository,
		transactionRepository: transactionRepository,
		pushGateway:           pushGateway,
		pushSound:             pushSound,
	}
}

// TriggerDispatch runs DispatchPending in the background (FR-4) so payTransaction's callers never
// wait on Expo; the periodic ticker in main.go is what catches this goroutine if it is lost to a
// crash or a deploy mid-flight.
func (usecase KdsNotificationUsecase) TriggerDispatch() {
	go func() {
		if err := usecase.DispatchPending(context.Background()); err != nil {
			slog.Error("kds dispatch triggered after payment failed", slog.Any("error", err))
		}
	}()
}

// DispatchPending claims up to kdsDispatchBatchSize pending rows, oldest first, and delivers each
// to every registered device (D24). Called immediately after a payment commits and on every
// KDS_DISPATCH_INTERVAL_SECONDS tick from main.go (FR-4).
func (usecase KdsNotificationUsecase) DispatchPending(ctx context.Context) *Error {
	notifications, err := usecase.repository.ClaimPendingKdsNotifications(ctx, kdsDispatchBatchSize)
	if err != nil {
		return err
	}

	for _, notification := range notifications {
		usecase.dispatchOne(ctx, notification)
	}

	return nil
}

func (usecase KdsNotificationUsecase) dispatchOne(ctx context.Context, notification KdsNotification) {
	logger := slog.With(
		slog.Int64("kdsNotificationId", notification.Id),
		slog.Int64("transactionId", notification.TransactionId),
	)

	transaction, err := usecase.transactionRepository.GetTransactionById(ctx, notification.TransactionId)
	if err != nil {
		usecase.markFailed(ctx, notification.Id, "failed to load transaction: "+err.Message, logger)
		return
	}

	devices, err := usecase.deviceRepository.GetKdsDeviceList(ctx)
	if err != nil {
		usecase.markFailed(ctx, notification.Id, "failed to load kds devices: "+err.Message, logger)
		return
	}

	// FR-4 step 3: nobody to tell, and retrying does not create a phone.
	if len(devices) == 0 {
		detail := "no registered devices"
		if markErr := usecase.repository.MarkKdsNotificationSkipped(ctx, notification.Id, detail); markErr != nil {
			logger.Error("failed to mark kds notification skipped", slog.Any("error", markErr))
		}
		logger.Warn("kds notification skipped", slog.String("detail", detail))
		return
	}

	message := BuildKdsPushMessage(transaction, usecase.pushSound)
	messages := make([]KdsPushMessage, len(devices))
	for i, device := range devices {
		deviceMessage := message
		deviceMessage.To = device.PushToken
		messages[i] = deviceMessage
	}

	receipts, sendErr := usecase.pushGateway.Send(ctx, messages)
	if sendErr != nil {
		usecase.markFailed(ctx, notification.Id, sendErr.Message, logger)
		logger.Error("kds push gateway send failed", slog.Any("error", sendErr))
		return
	}

	accepted := 0
	var failureDetails []string
	for i, receipt := range receipts {
		if i >= len(devices) {
			break
		}
		device := devices[i]

		if receipt.Status == KdsPushReceiptStatusOk {
			accepted++
			continue
		}

		failureDetails = append(failureDetails, fmt.Sprintf("%s: %s", device.Name, receipt.Message))

		// D18: the definitive "this token is dead" receipt, and the only signal that justifies
		// deleting a device the operator registered.
		if receipt.ErrorCode == KdsPushErrorCodeDeviceNotRegistered {
			usecase.pruneDevice(ctx, device, logger)
		}
	}

	detail := strings.Join(failureDetails, "; ")

	// FR-4 step 5: every phone carries the same message (D24), so one delivered phone means the
	// venue was told — retrying over a second phone's dead token would re-buzz the first phone.
	if accepted > 0 {
		if markErr := usecase.repository.MarkKdsNotificationSent(ctx, notification.Id, detail); markErr != nil {
			logger.Error("failed to mark kds notification sent", slog.Any("error", markErr))
		}
		logger.Info("kds notification sent",
			slog.Int("acceptedDevices", accepted),
			slog.Int("totalDevices", len(devices)),
		)
		return
	}

	usecase.markFailed(ctx, notification.Id, detail, logger)
}

func (usecase KdsNotificationUsecase) pruneDevice(ctx context.Context, device KdsDevice, logger *slog.Logger) {
	if err := usecase.deviceRepository.DeleteKdsDeviceById(ctx, device.Id); err != nil {
		logger.Error("failed to prune unregistered kds device",
			slog.Int64("kdsDeviceId", device.Id), slog.Any("error", err))
		return
	}
	logger.Info("pruned unregistered kds device",
		slog.Int64("kdsDeviceId", device.Id), slog.String("kdsDeviceName", device.Name))
}

func (usecase KdsNotificationUsecase) markFailed(ctx context.Context, id int64, detail string, logger *slog.Logger) {
	if err := usecase.repository.MarkKdsNotificationFailed(ctx, id, detail); err != nil {
		logger.Error("failed to mark kds notification failed", slog.Any("error", err))
	}
	logger.Warn("kds notification delivery failed", slog.String("detail", detail))
}
