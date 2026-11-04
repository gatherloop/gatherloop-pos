package scheduler

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"

	"go.uber.org/mock/gomock"
)

// Both payment sweeps touch exactly one repository on an empty batch, so every other dependency
// stays nil rather than dragging PaymentUsecase's whole graph into a scheduler test.
func newPaymentUsecase(paymentRepository domain.PaymentRepository, paymentVerificationRepository domain.PaymentVerificationRepository) domain.PaymentUsecase {
	return domain.NewPaymentUsecase(
		paymentRepository,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		nil,
		paymentVerificationRepository,
		domain.PaymentService{},
		domain.AvailabilityService{},
		domain.WhatsappNumberVerificationService{},
		domain.KdsNotificationService{},
		300,
		600,
		900,
		1,
	)
}

func TestAddPaymentJobs(t *testing.T) {
	scheduler := newJobScheduler()
	AddPaymentJobs(scheduler, domain.PaymentUsecase{})

	assertRegisteredJobNames(t, scheduler, []string{
		"payment_expiry",
		"payment_verification_photo_cleanup",
	})
}

func TestPaymentExpiryJob_RunReadsExpirablePayments(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	paymentRepository := mock.NewMockPaymentRepository(ctrl)
	paymentRepository.EXPECT().GetExpirablePayments(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, nil)

	job := PaymentExpiryJob{usecase: newPaymentUsecase(paymentRepository, nil)}

	if err := job.Run(context.Background()); err != nil {
		t.Fatalf("Run returned %v, want nil", err)
	}
}

func TestPaymentVerificationPhotoCleanupJob_RunDeletesOrphanedPhotos(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	paymentVerificationRepository := mock.NewMockPaymentVerificationRepository(ctrl)
	paymentVerificationRepository.EXPECT().DeleteOrphaned(gomock.Any(), gomock.Any()).Return(int64(0), nil)

	job := PaymentVerificationPhotoCleanupJob{usecase: newPaymentUsecase(nil, paymentVerificationRepository)}

	if err := job.Run(context.Background()); err != nil {
		t.Fatalf("Run returned %v, want nil", err)
	}
}
