package scheduler

import (
	"apps/api/domain"
	"context"
)

type PaymentExpiryJob struct {
	usecase domain.PaymentUsecase
}

func (job PaymentExpiryJob) Name() string {
	return "payment_expiry"
}

func (job PaymentExpiryJob) Run(ctx context.Context) *domain.Error {
	return job.usecase.ExpireStalePayments(ctx)
}

type PaymentVerificationPhotoCleanupJob struct {
	usecase domain.PaymentUsecase
}

func (job PaymentVerificationPhotoCleanupJob) Name() string {
	return "payment_verification_photo_cleanup"
}

func (job PaymentVerificationPhotoCleanupJob) Run(ctx context.Context) *domain.Error {
	return job.usecase.DeleteOrphanedVerificationPhotos(ctx)
}

func AddPaymentJobs(scheduler *Scheduler, usecase domain.PaymentUsecase) {
	scheduler.AddJob(PaymentExpiryJob{usecase: usecase})
	scheduler.AddJob(PaymentVerificationPhotoCleanupJob{usecase: usecase})
}
