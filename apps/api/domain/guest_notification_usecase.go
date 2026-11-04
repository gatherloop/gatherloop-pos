package domain

import (
	"context"
	"time"
)

type GuestNotificationUsecase struct {
	repository GuestNotificationRepository
	service    GuestNotificationService
}

func NewGuestNotificationUsecase(repository GuestNotificationRepository, service GuestNotificationService) GuestNotificationUsecase {
	return GuestNotificationUsecase{repository: repository, service: service}
}

func (usecase GuestNotificationUsecase) DispatchPending(ctx context.Context) *Error {
	return usecase.service.DispatchPending(ctx)
}

func (usecase GuestNotificationUsecase) ExpireStaleSending(ctx context.Context) *Error {
	return usecase.repository.ExpireStaleSending(ctx, time.Now().Add(-GuestNotificationStaleSendingThreshold))
}
