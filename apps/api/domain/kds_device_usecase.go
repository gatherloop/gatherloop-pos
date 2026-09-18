package domain

import "context"

// Versioned because an Android notification channel's sound is immutable after creation (D23).
const kdsPushChannelId = "orders-v2"

type KdsDeviceUsecase struct {
	repository  KdsDeviceRepository
	pushGateway KdsPushGatewayRepository
	pushSound   string
}

func NewKdsDeviceUsecase(repository KdsDeviceRepository, pushGateway KdsPushGatewayRepository, pushSound string) KdsDeviceUsecase {
	return KdsDeviceUsecase{repository: repository, pushGateway: pushGateway, pushSound: pushSound}
}

func (usecase KdsDeviceUsecase) RegisterKdsDevice(ctx context.Context, device KdsDevice) (KdsDevice, *Error) {
	if err := validateKdsDevice(device); err != nil {
		return KdsDevice{}, err
	}
	return usecase.repository.RegisterKdsDevice(ctx, device)
}

func (usecase KdsDeviceUsecase) GetKdsDeviceList(ctx context.Context) ([]KdsDevice, *Error) {
	return usecase.repository.GetKdsDeviceList(ctx)
}

func (usecase KdsDeviceUsecase) DeleteKdsDeviceById(ctx context.Context, id int64) *Error {
	return usecase.repository.DeleteKdsDeviceById(ctx, id)
}

func (usecase KdsDeviceUsecase) SendTestNotification(ctx context.Context, id int64) *Error {
	device, err := usecase.repository.GetKdsDeviceById(ctx, id)
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

	receipts, sendErr := usecase.pushGateway.Send(ctx, []KdsPushMessage{message})
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

func validateKdsDevice(device KdsDevice) *Error {
	if device.Name == "" {
		return &Error{Type: BadRequest, Message: "name must not be empty"}
	}
	if device.PushToken == "" {
		return &Error{Type: BadRequest, Message: "pushToken must not be empty"}
	}
	if device.Platform != KdsPlatformIos && device.Platform != KdsPlatformAndroid {
		return &Error{Type: BadRequest, Message: "platform must be ios or android"}
	}
	return nil
}
