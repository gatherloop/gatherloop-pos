package domain

import "context"

type KdsNotificationUsecase struct {
	service KdsNotificationService
}

func NewKdsNotificationUsecase(service KdsNotificationService) KdsNotificationUsecase {
	return KdsNotificationUsecase{service: service}
}

func (usecase KdsNotificationUsecase) DispatchPending(ctx context.Context) *Error {
	return usecase.service.DispatchPending(ctx)
}
