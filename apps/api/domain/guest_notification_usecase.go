package domain

import (
	"context"
	"time"
)

type GuestNotificationUsecase struct {
	guestNotificationRepoPort GuestNotificationRepoPort
	guestNotificationService  GuestNotificationService
}

func NewGuestNotificationUsecase(guestNotificationRepoPort GuestNotificationRepoPort, guestNotificationService GuestNotificationService) GuestNotificationUsecase {
	return GuestNotificationUsecase{guestNotificationRepoPort: guestNotificationRepoPort, guestNotificationService: guestNotificationService}
}

func (usecase GuestNotificationUsecase) DispatchPending(ctx context.Context) *Error {
	return usecase.guestNotificationService.DispatchPending(ctx)
}

func (usecase GuestNotificationUsecase) ExpireStaleSending(ctx context.Context) *Error {
	return usecase.guestNotificationRepoPort.ExpireStaleSending(ctx, time.Now().Add(-GuestNotificationStaleSendingThreshold))
}
