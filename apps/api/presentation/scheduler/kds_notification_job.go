package scheduler

import (
	"apps/api/domain"
	"context"
)

type KdsNotificationDispatchJob struct {
	usecase domain.KdsNotificationUsecase
}

func (job KdsNotificationDispatchJob) Name() string {
	return "kds_notification_dispatch"
}

func (job KdsNotificationDispatchJob) Run(ctx context.Context) *domain.Error {
	return job.usecase.DispatchPending(ctx)
}

func AddKdsNotificationJobs(scheduler *Scheduler, usecase domain.KdsNotificationUsecase) {
	scheduler.AddJob(KdsNotificationDispatchJob{usecase: usecase})
}
