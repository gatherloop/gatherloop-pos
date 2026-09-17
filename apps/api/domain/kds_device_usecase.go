package domain

import "context"

type KdsDeviceUsecase struct {
	repository KdsDeviceRepository
}

func NewKdsDeviceUsecase(repository KdsDeviceRepository) KdsDeviceUsecase {
	return KdsDeviceUsecase{repository: repository}
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
