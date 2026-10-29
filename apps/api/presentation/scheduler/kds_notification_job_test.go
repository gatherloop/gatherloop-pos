package scheduler

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"go.uber.org/mock/gomock"
)

func TestAddKdsNotificationJobs(t *testing.T) {
	scheduler := newJobScheduler()
	AddKdsNotificationJobs(scheduler, domain.KdsNotificationUsecase{})

	assertRegisteredJobNames(t, scheduler, []string{"kds_notification_dispatch"})
}

func TestKdsNotificationDispatchJob_RunClaimsPendingNotifications(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	repository := mock.NewMockKdsNotificationRepository(ctrl)
	repository.EXPECT().ClaimPendingKdsNotifications(gomock.Any(), gomock.Any()).Return(nil, nil)

	job := KdsNotificationDispatchJob{
		usecase: domain.NewKdsNotificationUsecase(repository, nil, nil, nil, "default"),
	}

	if err := job.Run(context.Background()); err != nil {
		t.Fatalf("Run returned %v, want nil", err)
	}
}
