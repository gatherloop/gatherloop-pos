package domain

import "context"

const kdsPushChannelId = "orders-v2"

type KdsDeviceUsecase struct {
	kdsDeviceRepoPort          KdsDeviceRepoPort
	kdsNotificationGatewayPort KdsNotificationGatewayPort
	pushSound                  string
}

func NewKdsDeviceUsecase(kdsDeviceRepoPort KdsDeviceRepoPort, kdsNotificationGatewayPort KdsNotificationGatewayPort, pushSound string) KdsDeviceUsecase {
	return KdsDeviceUsecase{kdsDeviceRepoPort: kdsDeviceRepoPort, kdsNotificationGatewayPort: kdsNotificationGatewayPort, pushSound: pushSound}
}

func (usecase KdsDeviceUsecase) RegisterKdsDevice(ctx context.Context, device KdsDevice) (KdsDevice, *Error) {
	if err := device.Validate(); err != nil {
		return KdsDevice{}, err
	}
	return usecase.kdsDeviceRepoPort.RegisterKdsDevice(ctx, device)
}

func (usecase KdsDeviceUsecase) GetKdsDeviceList(ctx context.Context) ([]KdsDevice, *Error) {
	return usecase.kdsDeviceRepoPort.GetKdsDeviceList(ctx)
}

func (usecase KdsDeviceUsecase) DeleteKdsDeviceById(ctx context.Context, id int64) *Error {
	return usecase.kdsDeviceRepoPort.DeleteKdsDeviceById(ctx, id)
}

func (usecase KdsDeviceUsecase) SendTestNotification(ctx context.Context, id int64) *Error {
	device, err := usecase.kdsDeviceRepoPort.GetKdsDeviceById(ctx, id)
	if err != nil {
		return err
	}

	message := KdsPushMessage{
		To:        device.PushToken,
		Title:     "Test notification",
		Body:      "This is a test notification from your KDS device setup.",
		Sound:     usecase.pushSound,
		ChannelId: kdsPushChannelId,
		Priority:  KdsPushPriorityHigh,
	}

	receipts, sendErr := usecase.kdsNotificationGatewayPort.Send(ctx, []KdsPushMessage{message})
	if sendErr != nil {
		return sendErr
	}

	if len(receipts) == 0 || receipts[0].Status != KdsPushReceiptStatusOk {
		errMessage := "Expo rejected the test notification"
		if len(receipts) > 0 && receipts[0].Message != "" {
			errMessage = receipts[0].Message
		}
		return &Error{Type: BadGateway, Message: errMessage}
	}

	return nil
}
