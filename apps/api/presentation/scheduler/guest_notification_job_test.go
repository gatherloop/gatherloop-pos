package scheduler

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"go.uber.org/mock/gomock"
)

func TestAddGuestNotificationJobs(t *testing.T) {
	scheduler := newJobScheduler()
	AddGuestNotificationJobs(scheduler, domain.GuestNotificationUsecase{})

	assertRegisteredJobNames(t, scheduler, []string{
		"guest_notification_dispatch",
		"guest_notification_stale_sending",
	})
}

func TestGuestNotificationDispatchJob_RunClaimsPendingNotifications(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repository := mock.NewMockGuestNotificationRepository(ctrl)
	repository.EXPECT().ClaimPendingGuestNotifications(gomock.Any(), gomock.Any()).Return(nil, nil)

	job := GuestNotificationDispatchJob{
		usecase: domain.NewGuestNotificationUsecase(repository, domain.NewGuestNotificationService(repository, nil, nil, nil, "https://order.example.com")),
	}

	if err := job.Run(context.Background()); err != nil {
		t.Fatalf("Run returned %v, want nil", err)
	}
}

// The two guest jobs share a use case and a method signature, so this is what keeps
// ExpireStaleSending from being wired to DispatchPending by copy-paste.
func TestGuestNotificationStaleSendingJob_RunExpiresStaleSending(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repository := mock.NewMockGuestNotificationRepository(ctrl)
	repository.EXPECT().ExpireStaleSending(gomock.Any(), gomock.Any()).Return(nil)

	job := GuestNotificationStaleSendingJob{
		usecase: domain.NewGuestNotificationUsecase(repository, domain.NewGuestNotificationService(repository, nil, nil, nil, "https://order.example.com")),
	}

	if err := job.Run(context.Background()); err != nil {
		t.Fatalf("Run returned %v, want nil", err)
	}
}
