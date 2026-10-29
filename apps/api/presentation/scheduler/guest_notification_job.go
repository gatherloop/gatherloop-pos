package scheduler

import (
	"apps/api/domain"
	"context"
)

type GuestNotificationDispatchJob struct {
	usecase domain.GuestNotificationUsecase
}

func (job GuestNotificationDispatchJob) Name() string {
	return "guest_notification_dispatch"
}

func (job GuestNotificationDispatchJob) Run(ctx context.Context) *domain.Error {
	return job.usecase.DispatchPending(ctx)
}

type GuestNotificationStaleSendingJob struct {
	usecase domain.GuestNotificationUsecase
}

func (job GuestNotificationStaleSendingJob) Name() string {
	return "guest_notification_stale_sending"
}

func (job GuestNotificationStaleSendingJob) Run(ctx context.Context) *domain.Error {
	return job.usecase.ExpireStaleSending(ctx)
}

func AddGuestNotificationJobs(scheduler *Scheduler, usecase domain.GuestNotificationUsecase) {
	scheduler.AddJob(GuestNotificationDispatchJob{usecase: usecase})
	scheduler.AddJob(GuestNotificationStaleSendingJob{usecase: usecase})
}
