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

type paymentVerificationUsecaseMocks struct {
	paymentRepo               *mock.MockPaymentRepository
	verificationRepo          *mock.MockPaymentVerificationRepository
	transactionRepo           *mock.MockTransactionRepository
	cartRepo                  *mock.MockCartRepository
	availabilityRepo          *mock.MockAvailabilityReservationRepository
	kdsNotificationRepo       *mock.MockKdsNotificationRepository
	kdsNotificationDispatcher *mock.MockKdsNotificationDispatcher
}

func newPaymentVerificationUsecaseMocks(ctrl *gomock.Controller) paymentVerificationUsecaseMocks {
	return paymentVerificationUsecaseMocks{
		paymentRepo:               mock.NewMockPaymentRepository(ctrl),
		verificationRepo:          mock.NewMockPaymentVerificationRepository(ctrl),
		transactionRepo:           mock.NewMockTransactionRepository(ctrl),
		cartRepo:                  mock.NewMockCartRepository(ctrl),
		availabilityRepo:          mock.NewMockAvailabilityReservationRepository(ctrl),
		kdsNotificationRepo:       mock.NewMockKdsNotificationRepository(ctrl),
		kdsNotificationDispatcher: mock.NewMockKdsNotificationDispatcher(ctrl),
	}
}

func (m paymentVerificationUsecaseMocks) usecase() domain.PaymentVerificationUsecase {
	availabilityReservation := domain.NewAvailabilityReservation(m.availabilityRepo)
	return domain.NewPaymentVerificationUsecase(m.paymentRepo, m.verificationRepo, m.transactionRepo, m.cartRepo, availabilityReservation, m.kdsNotificationRepo, m.kdsNotificationDispatcher)
}

func withVerificationPaymentTransactionMock(r *mock.MockPaymentRepository) {
	r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
}

func awaitingCodPaymentFixture() domain.Payment {
	transactionId := int64(99)
	awaiting := domain.PaymentVerificationStatusAwaiting
	return domain.Payment{
		Id:                 42,
		CartId:             7,
		SessionId:          "session-1",
		TransactionId:      &transactionId,
		Method:             domain.PaymentMethodCod,
		Status:             domain.PaymentStatePending,
		VerificationStatus: &awaiting,
		ExpiredAt:          time.Now().Add(15 * time.Minute),
	}
}

func TestPaymentVerificationUsecase_GetVerification(t *testing.T) {
	t.Run("returns the photo for a cod payment", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		payment := awaitingCodPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(99)).Return(payment, nil)

		capturedAt := time.Now()
		m.verificationRepo.EXPECT().GetByPaymentId(gomock.Any(), payment.Id).
			Return(domain.PaymentVerificationPhoto{PaymentId: payment.Id, ContentType: "image/jpeg", Data: []byte("photo"), CreatedAt: capturedAt}, nil)

		photo, err := m.usecase().GetVerification(context.Background(), 99)

		assert.Nil(t, err)
		assert.Equal(t, "image/jpeg", photo.ContentType)
	})

	t.Run("404 when there is no linked payment", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		m.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(99)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		_, err := m.usecase().GetVerification(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})

	t.Run("404 when the payment is not cod", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		payment := awaitingCodPaymentFixture()
		payment.Method = domain.PaymentMethodQris
		m.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(99)).Return(payment, nil)

		_, err := m.usecase().GetVerification(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})

	t.Run("404 once the photo is already gone (decided)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		payment := awaitingCodPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(99)).Return(payment, nil)
		m.verificationRepo.EXPECT().GetByPaymentId(gomock.Any(), payment.Id).
			Return(domain.PaymentVerificationPhoto{}, &domain.Error{Type: domain.NotFound})

		_, err := m.usecase().GetVerification(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})
}

func TestPaymentVerificationUsecase_Approve(t *testing.T) {
	t.Run("approves, deletes the photo, converts the cart and enqueues order_paid", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)
		m.kdsNotificationDispatcher.EXPECT().TriggerDispatch().Times(1)

		payment := awaitingCodPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				require.NotNil(t, p.VerificationStatus)
				assert.Equal(t, domain.PaymentVerificationStatusApproved, *p.VerificationStatus)
				require.NotNil(t, p.VerifiedAt)
				return p, nil
			})
		m.verificationRepo.EXPECT().DeleteByPaymentId(gomock.Any(), payment.Id).Return(nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), int64(7)).Return(domain.Cart{Id: 7, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(7)).
			DoAndReturn(func(_ context.Context, c domain.Cart, id int64) (domain.Cart, *domain.Error) {
				assert.Equal(t, domain.CartStatusConverted, c.Status)
				return c, nil
			})
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindOrderPaid).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction, kind domain.KdsNotificationKind) *domain.Error {
				assert.Equal(t, int64(99), transaction.Id)
				return nil
			})

		err := m.usecase().Approve(context.Background(), 99)

		assert.Nil(t, err)
	})

	t.Run("succeeds past expired_at while still pending (D19)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)
		m.kdsNotificationDispatcher.EXPECT().TriggerDispatch().Times(1)

		payment := awaitingCodPaymentFixture()
		payment.ExpiredAt = time.Now().Add(-1 * time.Minute)
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.verificationRepo.EXPECT().DeleteByPaymentId(gomock.Any(), payment.Id).Return(nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), int64(7)).Return(domain.Cart{Id: 7}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(7)).
			DoAndReturn(func(_ context.Context, c domain.Cart, id int64) (domain.Cart, *domain.Error) { return c, nil })
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindOrderPaid).Return(nil)

		err := m.usecase().Approve(context.Background(), 99)

		assert.Nil(t, err)
	})

	t.Run("refuses a non-cod payment with 400", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)

		payment := awaitingCodPaymentFixture()
		payment.Method = domain.PaymentMethodQris
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)

		err := m.usecase().Approve(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("refuses an already-approved payment with 400", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)

		payment := awaitingCodPaymentFixture()
		approved := domain.PaymentVerificationStatusApproved
		payment.VerificationStatus = &approved
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)

		err := m.usecase().Approve(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("refuses a cancelled payment with 400", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)

		payment := awaitingCodPaymentFixture()
		payment.Status = domain.PaymentStateCancelled
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)

		err := m.usecase().Approve(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("refuses a paid payment with 400", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)

		payment := awaitingCodPaymentFixture()
		payment.Status = domain.PaymentStatePaid
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)

		err := m.usecase().Approve(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("404 when there is no linked payment", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		err := m.usecase().Approve(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})
}

func TestPaymentVerificationUsecase_Reject(t *testing.T) {
	t.Run("rejects: payment cancelled/rejected, transaction soft-deleted, availability released, photo deleted", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)

		payment := awaitingCodPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateCancelled, p.Status)
				require.NotNil(t, p.CancelReason)
				assert.Equal(t, domain.PaymentCancelReasonRejected, *p.CancelReason)
				require.NotNil(t, p.VerifiedAt)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)
		m.verificationRepo.EXPECT().DeleteByPaymentId(gomock.Any(), payment.Id).Return(nil)

		err := m.usecase().Reject(context.Background(), 99)

		assert.Nil(t, err)
	})

	t.Run("sends no kds notification (a barista already looked)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)

		payment := awaitingCodPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)
		m.verificationRepo.EXPECT().DeleteByPaymentId(gomock.Any(), payment.Id).Return(nil)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		err := m.usecase().Reject(context.Background(), 99)

		assert.Nil(t, err)
	})

	t.Run("refuses an already-approved payment with 400", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)

		payment := awaitingCodPaymentFixture()
		approved := domain.PaymentVerificationStatusApproved
		payment.VerificationStatus = &approved
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)

		err := m.usecase().Reject(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("refuses a non-cod payment with 400", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)

		payment := awaitingCodPaymentFixture()
		payment.Method = domain.PaymentMethodCash
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)

		err := m.usecase().Reject(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("refuses a cancelled payment with 400", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)

		payment := awaitingCodPaymentFixture()
		payment.Status = domain.PaymentStateCancelled
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)

		err := m.usecase().Reject(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("refuses a paid payment with 400", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)

		payment := awaitingCodPaymentFixture()
		payment.Status = domain.PaymentStatePaid
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)

		err := m.usecase().Reject(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("404 when there is no linked payment", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentVerificationUsecaseMocks(ctrl)
		withVerificationPaymentTransactionMock(m.paymentRepo)
		m.paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		err := m.usecase().Reject(context.Background(), 99)

		require.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})
}
