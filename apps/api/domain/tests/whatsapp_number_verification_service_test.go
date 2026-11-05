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

func newWhatsappNumberVerificationService(t *testing.T) (domain.WhatsappNumberVerificationService, *mock.MockWhatsAppNumberVerificationRepoPort, *mock.MockWhatsAppGatewayPort) {
	ctrl := gomock.NewController(t)
	verificationRepo := mock.NewMockWhatsAppNumberVerificationRepoPort(ctrl)
	gateway := mock.NewMockWhatsAppGatewayPort(ctrl)
	return domain.NewWhatsappNumberVerificationUsecase(verificationRepo, gateway), verificationRepo, gateway
}

func TestWhatsappNumberVerificationService_EnsureRegistered(t *testing.T) {
	t.Run("a cache hit skips the gateway entirely", func(t *testing.T) {
		service, verificationRepo, gateway := newWhatsappNumberVerificationService(t)
		verificationRepo.EXPECT().IsWhatsAppNumberVerified(gomock.Any(), verifyNumber).Return(true, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), gomock.Any()).Times(0)

		err := service.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("a registered answer on a cache miss is persisted", func(t *testing.T) {
		service, verificationRepo, gateway := newWhatsappNumberVerificationService(t)
		verificationRepo.EXPECT().IsWhatsAppNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusRegistered}, nil)
		verificationRepo.EXPECT().MarkWhatsAppNumberVerified(gomock.Any(), verifyNumber, gomock.Any()).
			DoAndReturn(func(_ context.Context, number string, verifiedAt time.Time) *domain.Error {
				assert.WithinDuration(t, time.Now(), verifiedAt, time.Second)
				return nil
			})

		err := service.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("a not_registered answer rejects with the field reason and persists nothing", func(t *testing.T) {
		service, verificationRepo, gateway := newWhatsappNumberVerificationService(t)
		verificationRepo.EXPECT().IsWhatsAppNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusNotRegistered}, nil)
		verificationRepo.EXPECT().MarkWhatsAppNumberVerified(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		err := service.EnsureRegistered(context.Background(), verifyNumber)

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, domain.ErrorReasonWhatsappNumberNotRegistered, err.Reason)
	})

	t.Run("an unknown answer fails open and persists nothing", func(t *testing.T) {
		service, verificationRepo, gateway := newWhatsappNumberVerificationService(t)
		verificationRepo.EXPECT().IsWhatsAppNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusUnknown, Detail: "device disconnected"}, nil)
		verificationRepo.EXPECT().MarkWhatsAppNumberVerified(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		err := service.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("a gateway *Error (timeout, non-2xx, dial error) fails open", func(t *testing.T) {
		service, verificationRepo, gateway := newWhatsappNumberVerificationService(t)
		verificationRepo.EXPECT().IsWhatsAppNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{}, &domain.Error{Type: domain.BadGateway, Message: "context deadline exceeded"})
		verificationRepo.EXPECT().MarkWhatsAppNumberVerified(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		err := service.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("the disabled gateway's unknown status fails open like any other unknown", func(t *testing.T) {
		service, verificationRepo, gateway := newWhatsappNumberVerificationService(t)
		verificationRepo.EXPECT().IsWhatsAppNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusUnknown, Detail: domain.WhatsAppGatewayNotConfiguredDetail}, nil)

		err := service.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("a cache lookup failure falls back to asking the gateway instead of blocking checkout", func(t *testing.T) {
		service, verificationRepo, gateway := newWhatsappNumberVerificationService(t)
		verificationRepo.EXPECT().IsWhatsAppNumberVerified(gomock.Any(), verifyNumber).
			Return(false, &domain.Error{Type: domain.InternalServerError, Message: "db is down"})
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusRegistered}, nil)
		verificationRepo.EXPECT().MarkWhatsAppNumberVerified(gomock.Any(), verifyNumber, gomock.Any()).Return(nil)

		err := service.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})

	t.Run("a persist failure after a registered answer still returns nil", func(t *testing.T) {
		service, verificationRepo, gateway := newWhatsappNumberVerificationService(t)
		verificationRepo.EXPECT().IsWhatsAppNumberVerified(gomock.Any(), verifyNumber).Return(false, nil)
		gateway.EXPECT().ValidateNumber(gomock.Any(), verifyNumber).
			Return(domain.WhatsAppNumberValidationResult{Status: domain.WhatsAppNumberStatusRegistered}, nil)
		verificationRepo.EXPECT().MarkWhatsAppNumberVerified(gomock.Any(), verifyNumber, gomock.Any()).
			Return(&domain.Error{Type: domain.InternalServerError, Message: "db is down"})

		err := service.EnsureRegistered(context.Background(), verifyNumber)

		assert.Nil(t, err)
	})
}
