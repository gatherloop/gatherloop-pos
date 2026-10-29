package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func TestPaymentVerificationService_ResolveAwaitingCodPayment(t *testing.T) {
	resolve := func(t *testing.T, payment domain.Payment, repoErr *domain.Error) (domain.Payment, *domain.Error) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		repo := mock.NewMockPaymentRepository(ctrl)
		repo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, repoErr)

		return domain.NewPaymentVerificationService(repo).ResolveAwaitingCodPayment(context.Background(), 99)
	}

	t.Run("returns a pending cod payment awaiting verification", func(t *testing.T) {
		payment := awaitingCodPaymentFixture()

		resolved, err := resolve(t, payment, nil)

		assert.Nil(t, err)
		assert.Equal(t, payment.Id, resolved.Id)
	})

	t.Run("still resolves past expired_at while pending (D19)", func(t *testing.T) {
		payment := awaitingCodPaymentFixture()
		payment.ExpiredAt = time.Now().Add(-time.Minute)

		_, err := resolve(t, payment, nil)

		assert.Nil(t, err)
	})

	t.Run("404 when there is no linked payment", func(t *testing.T) {
		_, err := resolve(t, domain.Payment{}, &domain.Error{Type: domain.NotFound})

		require.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})

	t.Run("passes through a non-NotFound repository error", func(t *testing.T) {
		_, err := resolve(t, domain.Payment{}, &domain.Error{Type: domain.InternalServerError})

		require.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})

	t.Run("refuses a non-cod payment with 400", func(t *testing.T) {
		payment := awaitingCodPaymentFixture()
		payment.Method = domain.PaymentMethodQris

		_, err := resolve(t, payment, nil)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("refuses an already-approved payment with 400", func(t *testing.T) {
		payment := awaitingCodPaymentFixture()
		approved := domain.PaymentVerificationStatusApproved
		payment.VerificationStatus = &approved

		_, err := resolve(t, payment, nil)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("refuses a cancelled payment with 400", func(t *testing.T) {
		payment := awaitingCodPaymentFixture()
		payment.Status = domain.PaymentStateCancelled

		_, err := resolve(t, payment, nil)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("refuses a paid payment with 400", func(t *testing.T) {
		payment := awaitingCodPaymentFixture()
		payment.Status = domain.PaymentStatePaid

		_, err := resolve(t, payment, nil)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})
}
