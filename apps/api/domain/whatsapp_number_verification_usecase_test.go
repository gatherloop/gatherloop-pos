package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

const verifyNumber = "6281234567890"

func newWhatsappNumberVerificationUsecase(t *testing.T) (domain.WhatsappNumberVerificationUsecase, *mock.MockWhatsappNumberVerificationRepository, *mock.MockWhatsAppGatewayRepository) {
	ctrl := gomock.NewController(t)
	verificationRepo := mock.NewMockWhatsappNumberVerificationRepository(ctrl)
	gateway := mock.NewMockWhatsAppGatewayRepository(ctrl)
	return domain.NewWhatsappNumberVerificationUsecase(verificationRepo, gateway), verificationRepo, gateway
}

func TestWhatsappNumberVerificationUsecase_EnsureRegistered(t *testing.T) {
	t.Run("a cache hit skips the gateway entirely", func(t *testing.T) {
		usecase, verificationRepo, gateway := newWhatsappNumberVerificationUsecase(t)
		verificationRepo.EXPECT().IsWhatsappNumberVerified(gomock.Any(), verifyNumber).Return(true, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), gomock.Any()).Times(0)

		err := usecase.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("a registered answer on a cache miss is persisted", func(t *testing.T) {
		usecase, verificationRepo, gateway := newWhatsappNumberVerificationUsecase(t)
		verificationRepo.EXPECT().IsWhatsappNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusRegistered}, nil)
		verificationRepo.EXPECT().MarkWhatsappNumberVerified(gomock.Any(), verifyNumber, gomock.Any()).
			DoAndReturn(func(_ context.Context, number string, verifiedAt time.Time) *domain.Error {
				assert.WithinDuration(t, time.Now(), verifiedAt, time.Second)
				return nil
			})

		err := usecase.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("a not_registered answer rejects with the field reason and persists nothing", func(t *testing.T) {
		usecase, verificationRepo, gateway := newWhatsappNumberVerificationUsecase(t)
		verificationRepo.EXPECT().IsWhatsappNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusNotRegistered}, nil)
		verificationRepo.EXPECT().MarkWhatsappNumberVerified(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		err := usecase.EnsureRegistered(context.Background(), verifyNumber)

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, domain.ErrorReasonWhatsappNumberNotRegistered, err.Reason)
	})

	t.Run("an unknown answer fails open and persists nothing", func(t *testing.T) {
		usecase, verificationRepo, gateway := newWhatsappNumberVerificationUsecase(t)
		verificationRepo.EXPECT().IsWhatsappNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusUnknown, Detail: "device disconnected"}, nil)
		verificationRepo.EXPECT().MarkWhatsappNumberVerified(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		err := usecase.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("a gateway *Error (timeout, non-2xx, dial error) fails open", func(t *testing.T) {
		usecase, verificationRepo, gateway := newWhatsappNumberVerificationUsecase(t)
		verificationRepo.EXPECT().IsWhatsappNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{}, &domain.Error{Type: domain.BadGateway, Message: "context deadline exceeded"})
		verificationRepo.EXPECT().MarkWhatsappNumberVerified(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		err := usecase.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("the disabled gateway's unknown status fails open like any other unknown", func(t *testing.T) {
		usecase, verificationRepo, gateway := newWhatsappNumberVerificationUsecase(t)
		verificationRepo.EXPECT().IsWhatsappNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusUnknown, Detail: domain.WhatsAppGatewayNotConfiguredDetail}, nil)

		err := usecase.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("a cache lookup failure falls back to asking the gateway instead of blocking checkout", func(t *testing.T) {
		usecase, verificationRepo, gateway := newWhatsappNumberVerificationUsecase(t)
		verificationRepo.EXPECT().IsWhatsappNumberVerified(gomock.Any(), verifyNumber).
			Return(false, &domain.Error{Type: domain.InternalServerError, Message: "db is down"})
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusRegistered}, nil)
		verificationRepo.EXPECT().MarkWhatsappNumberVerified(gomock.Any(), verifyNumber, gomock.Any()).Return(nil)

		err := usecase.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("a persist failure after a registered answer still returns nil", func(t *testing.T) {
		usecase, verificationRepo, gateway := newWhatsappNumberVerificationUsecase(t)
		verificationRepo.EXPECT().IsWhatsappNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusRegistered}, nil)
		verificationRepo.EXPECT().MarkWhatsappNumberVerified(gomock.Any(), verifyNumber, gomock.Any()).
			Return(&domain.Error{Type: domain.InternalServerError, Message: "db is down"})

		err := usecase.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})
}

func TestNoopWhatsappNumberVerifier_EnsureRegistered(t *testing.T) {
	err := domain.NoopWhatsappNumberVerifier{}.EnsureRegistered(context.Background(), verifyNumber)

	assert.Nil(t, err)
}
