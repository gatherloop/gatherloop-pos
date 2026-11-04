package domain

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
)

const kdsDispatchBatchSize = 50

type KdsNotificationService struct {
	repository            KdsNotificationRepository
	deviceRepository      KdsDeviceRepository
	transactionRepository TransactionRepository
	pushGateway           KdsPushGatewayRepository
	pushSound             string
}

func NewKdsNotificationService(
	repository KdsNotificationRepository,
	deviceRepository KdsDeviceRepository,
	transactionRepository TransactionRepository,
	pushGateway KdsPushGatewayRepository,
	pushSound string,
) KdsNotificationService {
	return KdsNotificationService{
		repository:            repository,
		deviceRepository:      deviceRepository,
		transactionRepository: transactionRepository,
		pushGateway:           pushGateway,
		pushSound:             pushSound,
	}
}

func (service KdsNotificationService) TriggerDispatch() {
	go func() {
		if err := service.DispatchPending(context.Background()); err != nil {
			slog.Error("kds dispatch triggered after payment failed", slog.Any("error", err))
		}
	}()
}

func (service KdsNotificationService) DispatchPending(ctx context.Context) *Error {
	notifications, err := service.repository.ClaimPendingKdsNotifications(ctx, kdsDispatchBatchSize)
	if err != nil {
		return err
	}

	for _, notification := range notifications {
		service.dispatchOne(ctx, notification)
	}

	return nil
}

func (service KdsNotificationService) dispatchOne(ctx context.Context, notification KdsNotification) {
	logger := slog.With(
		slog.Int64("kdsNotificationId", notification.Id),
		slog.Int64("transactionId", notification.TransactionId),
	)

	transaction, err := service.transactionRepository.GetTransactionById(ctx, notification.TransactionId)
	if err != nil {
		service.markFailed(ctx, notification.Id, "failed to load transaction: "+err.Message, logger)
		return
	}

	devices, err := service.deviceRepository.GetKdsDeviceList(ctx)
	if err != nil {
		service.markFailed(ctx, notification.Id, "failed to load kds devices: "+err.Message, logger)
		return
	}

	if len(devices) == 0 {
		detail := "no registered devices"
		if markErr := service.repository.MarkKdsNotificationSkipped(ctx, notification.Id, detail); markErr != nil {
			logger.Error("failed to mark kds notification skipped", slog.Any("error", markErr))
		}
		logger.Warn("kds notification skipped", slog.String("detail", detail))
		return
	}

	message := BuildKdsPushMessage(transaction, notification.Kind, service.pushSound)
	messages := make([]KdsPushMessage, len(devices))
	for i, device := range devices {
		deviceMessage := message
		deviceMessage.To = device.PushToken
		messages[i] = deviceMessage
	}

	receipts, sendErr := service.pushGateway.Send(ctx, messages)
	if sendErr != nil {
		service.markFailed(ctx, notification.Id, sendErr.Message, logger)
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

		if receipt.ErrorCode == KdsPushErrorCodeDeviceNotRegistered {
			service.pruneDevice(ctx, device, logger)
		}
	}

	detail := strings.Join(failureDetails, "; ")

	if accepted > 0 {
		if markErr := service.repository.MarkKdsNotificationSent(ctx, notification.Id, detail); markErr != nil {
			logger.Error("failed to mark kds notification sent", slog.Any("error", markErr))
		}
		logger.Info("kds notification sent",
			slog.Int("acceptedDevices", accepted),
			slog.Int("totalDevices", len(devices)),
		)
		return
	}

	service.markFailed(ctx, notification.Id, detail, logger)
}

func (service KdsNotificationService) pruneDevice(ctx context.Context, device KdsDevice, logger *slog.Logger) {
	if err := service.deviceRepository.DeleteKdsDeviceById(ctx, device.Id); err != nil {
		logger.Error("failed to prune unregistered kds device",
			slog.Int64("kdsDeviceId", device.Id), slog.Any("error", err))
		return
	}
	logger.Info("pruned unregistered kds device",
		slog.Int64("kdsDeviceId", device.Id), slog.String("kdsDeviceName", device.Name))
}

func (service KdsNotificationService) markFailed(ctx context.Context, id int64, detail string, logger *slog.Logger) {
	if err := service.repository.MarkKdsNotificationFailed(ctx, id, detail); err != nil {
		logger.Error("failed to mark kds notification failed", slog.Any("error", err))
	}
	logger.Warn("kds notification delivery failed", slog.String("detail", detail))
}
