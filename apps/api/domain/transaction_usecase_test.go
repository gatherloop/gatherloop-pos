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

func int64Ptr(v int64) *int64 { return &v }

// permissiveKdsNotificationDispatcher lets PayTransaction's post-commit kick (FR-4) fire freely;
// only tests asserting the dispatch itself need a stricter expectation.
func permissiveKdsNotificationDispatcher(ctrl *gomock.Controller) *mock.MockKdsNotificationDispatcher {
	dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
	dispatcher.EXPECT().TriggerDispatch().AnyTimes()
	return dispatcher
}

// permissivePaymentRepository returns an already-paid payment so settleOrderPayment (FR-6) is a
// no-op for every test that doesn't care about it — it never touches UpdatePaymentById or the
// cart repository. It never trips the D8 cancelled-order guard either, since the payment is paid.
func permissivePaymentRepository(ctrl *gomock.Controller) *mock.MockPaymentRepository {
	paymentRepo := mock.NewMockPaymentRepository(ctrl)
	paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), gomock.Any()).Return(domain.Payment{SessionId: "session-permissive", Status: domain.PaymentStatePaid}, nil).AnyTimes()
	paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), gomock.Any()).Return(domain.Payment{SessionId: "session-permissive", Status: domain.PaymentStatePaid}, nil).AnyTimes()
	return paymentRepo
}

func permissiveGuestNotificationRepository(ctrl *gomock.Controller) *mock.MockGuestNotificationRepository {
	guestNotificationRepo := mock.NewMockGuestNotificationRepository(ctrl)
	guestNotificationRepo.EXPECT().EnqueueForCompletedTransaction(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).AnyTimes()
	return guestNotificationRepo
}

// permissiveGuestNotificationDispatcher lets CompleteTransaction's post-commit kick (FR-4) fire
// freely; only tests asserting the dispatch itself need a stricter expectation.
func permissiveGuestNotificationDispatcher(ctrl *gomock.Controller) *mock.MockGuestNotificationDispatcher {
	dispatcher := mock.NewMockGuestNotificationDispatcher(ctrl)
	dispatcher.EXPECT().TriggerDispatch().AnyTimes()
	return dispatcher
}

// permissiveCartRepository is paired with permissivePaymentRepository's already-paid payment, so
// settleOrderPayment no-ops and never reaches the cart repository at all.
func permissiveCartRepository(ctrl *gomock.Controller) *mock.MockCartRepository {
	return mock.NewMockCartRepository(ctrl)
}

func permissiveAvailabilityRepo(ctrl *gomock.Controller) *mock.MockAvailabilityReservationRepository {
	availabilityRepo := mock.NewMockAvailabilityReservationRepository(ctrl)
	availabilityRepo.EXPECT().LockVariantById(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, id int64) (domain.Variant, *domain.Error) {
			return domain.Variant{Id: id, IsAvailable: true, Product: domain.Product{IsAvailable: true}}, nil
		}).AnyTimes()
	availabilityRepo.EXPECT().LockProductById(gomock.Any(), gomock.Any()).AnyTimes().Return(domain.Product{IsAvailable: true}, nil)
	availabilityRepo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes().Return(nil)
	availabilityRepo.EXPECT().UpdateProductAvailableQuantity(gomock.Any(), gomock.Any(), gomock.Any()).AnyTimes().Return(nil)
	availabilityRepo.EXPECT().CreateAvailabilityMovement(gomock.Any(), gomock.Any()).AnyTimes().Return(nil)
	return availabilityRepo
}

func setupUpdateTransactionMocks(ctrl *gomock.Controller, id int64, existing domain.Transaction) (*mock.MockTransactionRepository, *mock.MockVariantRepository, *mock.MockCouponRepository, *mock.MockWalletRepository) {
	txRepo := mock.NewMockTransactionRepository(ctrl)
	variantRepo := mock.NewMockVariantRepository(ctrl)
	couponRepo := mock.NewMockCouponRepository(ctrl)
	walletRepo := mock.NewMockWalletRepository(ctrl)

	txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
	txRepo.EXPECT().GetTransactionById(gomock.Any(), id).Return(existing, nil)
	txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), id).DoAndReturn(
		func(ctx context.Context, tx domain.Transaction, id int64) (domain.Transaction, *domain.Error) {
			return tx, nil
		}).AnyTimes()

	return txRepo, variantRepo, couponRepo, walletRepo
}

func TestTransactionUsecase_GetTransactionList(t *testing.T) {
	tests := []struct {
		name          string
		setupMock     func(txRepo *mock.MockTransactionRepository)
		expectedLen   int
		expectedTotal int64
		expectedError *domain.Error
	}{
		{
			name: "success",
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().GetTransactionList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.All, nil, nil, nil).
					Return([]domain.Transaction{{Id: 1}, {Id: 2}}, nil)
				txRepo.EXPECT().GetTransactionListTotal(gomock.Any(), "", domain.All, nil, nil, nil).Return(int64(2), nil)
			},
			expectedLen:   2,
			expectedTotal: 2,
		},
		{
			name: "error on GetTransactionList",
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().GetTransactionList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(txRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
			transactions, total, err := usecase.GetTransactionList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.All, nil, nil, nil)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, transactions, tt.expectedLen)
				assert.Equal(t, tt.expectedTotal, total)
			}
		})
	}

	t.Run("threads the source filter to both repository calls", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		orderSource := domain.TransactionSourceOrder
		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)

		txRepo.EXPECT().GetTransactionList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.All, nil, &orderSource, nil).
			Return([]domain.Transaction{{Id: 1, Source: domain.TransactionSourceOrder}}, nil)
		txRepo.EXPECT().GetTransactionListTotal(gomock.Any(), "", domain.All, nil, &orderSource, nil).Return(int64(1), nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		transactions, total, err := usecase.GetTransactionList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.All, nil, &orderSource, nil)

		assert.Nil(t, err)
		assert.Len(t, transactions, 1)
		assert.Equal(t, int64(1), total)
	})

	t.Run("threads the fulfillment filter to both repository calls", func(t *testing.T) {
		for _, fulfillment := range []domain.TransactionFulfillment{domain.TransactionFulfillmentPreparing, domain.TransactionFulfillmentReady} {
			t.Run(string(fulfillment), func(t *testing.T) {
				ctrl := gomock.NewController(t)
				defer ctrl.Finish()

				fulfillment := fulfillment
				txRepo := mock.NewMockTransactionRepository(ctrl)
				variantRepo := mock.NewMockVariantRepository(ctrl)
				couponRepo := mock.NewMockCouponRepository(ctrl)
				walletRepo := mock.NewMockWalletRepository(ctrl)

				txRepo.EXPECT().GetTransactionList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.All, nil, nil, &fulfillment).
					Return([]domain.Transaction{{Id: 1, Source: domain.TransactionSourceOrder}}, nil)
				txRepo.EXPECT().GetTransactionListTotal(gomock.Any(), "", domain.All, nil, nil, &fulfillment).Return(int64(1), nil)

				usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
				transactions, total, err := usecase.GetTransactionList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 10, domain.All, nil, nil, &fulfillment)

				assert.Nil(t, err)
				assert.Len(t, transactions, 1)
				assert.Equal(t, int64(1), total)
			})
		}
	})
}

func TestTransactionUsecase_CreateTransaction(t *testing.T) {
	tests := []struct {
		name          string
		input         domain.Transaction
		setupMock     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository)
		expectedTotal float32
		expectedError *domain.Error
	}{
		{
			name: "success — calculates total from variant prices",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 2, DiscountAmount: 0},
				},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 15000}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, IsAvailable: true, Product: domain.Product{IsAvailable: true}}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).Return(domain.Transaction{Id: 1, Total: 30000}, nil)
			},
			expectedTotal: 30000,
		},
		{
			name: "success — applies fixed coupon discount",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 1, DiscountAmount: 0},
				},
				TransactionCoupons: []domain.TransactionCoupon{
					{CouponId: 10},
				},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 20000}, nil)
				couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(10)).Return(domain.Coupon{Id: 10, Type: domain.Fixed, Amount: 5000}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, IsAvailable: true, Product: domain.Product{IsAvailable: true}}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).Return(domain.Transaction{Id: 2, Total: 15000}, nil)
			},
			expectedTotal: 15000,
		},
		{
			name: "variant not found",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{{VariantId: 99, Amount: 1}},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(99)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "rejects an invalid dining option",
			input: domain.Transaction{
				DiningOption: "delivery",
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "rejects a per-variant shortfall",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 3},
				},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 15000}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
					Id: 1, Name: "Choco", IsAvailable: true, AvailableQuantity: intPtr(2),
					Product: domain.Product{Name: "Soft Cookies", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "rejects a product-level shortfall summed across two variants",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 2},
					{VariantId: 2, Amount: 2},
				},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 10, Price: 8000}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, ProductId: 10, Price: 8000}, nil)
				pancong := domain.Product{Id: 10, Name: "Pancong", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingProduct, AvailableQuantity: intPtr(3)}
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 10, IsAvailable: true, Product: pancong}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, ProductId: 10, IsAvailable: true, Product: pancong}, nil)
				availabilityRepo.EXPECT().LockProductById(gomock.Any(), int64(10)).Times(1).Return(pancong, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "sums the same variant across two lines before checking availability",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 1, Note: "less ice"},
					{VariantId: 1, Amount: 1, Note: "no sugar"},
				},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 6000}, nil).Times(2)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Times(1).Return(domain.Variant{
					Id: 1, IsAvailable: true, AvailableQuantity: intPtr(3),
					Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
				}, nil)
				availabilityRepo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(1), 1).Return(nil)
				availabilityRepo.EXPECT().CreateAvailabilityMovement(gomock.Any(), gomock.Any()).Return(nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).Return(domain.Transaction{Id: 3, Total: 12000}, nil)
			},
			expectedTotal: 12000,
		},
		{
			name: "never decrements an untracked item",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 2},
				},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 10000}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
					Id: 1, IsAvailable: true,
					Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingNone},
				}, nil)
				txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).Return(domain.Transaction{Id: 4, Total: 20000}, nil)
			},
			expectedTotal: 20000,
		},
		{
			name: "rejects a switched-off variant",
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 1},
				},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 10000}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
					Id: 1, Name: "Vanilla", IsAvailable: false,
					Product: domain.Product{Name: "Es Kopi Susu", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingNone},
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			availabilityRepo := mock.NewMockAvailabilityReservationRepository(ctrl)
			tt.setupMock(txRepo, variantRepo, couponRepo, availabilityRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(availabilityRepo), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
			transaction, err := usecase.CreateTransaction(context.Background(), tt.input)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedTotal, transaction.Total)
			}
		})
	}
}

func TestTransactionUsecase_CreateTransaction_DefaultsSourceToPos(t *testing.T) {
	tests := []struct {
		name           string
		input          domain.Transaction
		expectedSource domain.TransactionSource
	}{
		{
			name:           "empty source defaults to pos",
			input:          domain.Transaction{},
			expectedSource: domain.TransactionSourcePos,
		},
		{
			name:           "explicit order source is preserved",
			input:          domain.Transaction{Source: domain.TransactionSourceOrder},
			expectedSource: domain.TransactionSourceOrder,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)

			txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
				func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
			txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
				func(ctx context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
					assert.Equal(t, tt.expectedSource, tx.Source)
					return tx, nil
				})

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
			created, err := usecase.CreateTransaction(context.Background(), tt.input)

			assert.Nil(t, err)
			assert.Equal(t, tt.expectedSource, created.Source)
		})
	}
}

func TestTransactionUsecase_DeleteTransactionById(t *testing.T) {
	paidAt := time.Now()
	tests := []struct {
		name          string
		id            int64
		setupMock     func(txRepo *mock.MockTransactionRepository, availabilityRepo *mock.MockAvailabilityReservationRepository)
		expectedError *domain.Error
	}{
		{
			name: "success — unpaid transaction",
			id:   1,
			setupMock: func(txRepo *mock.MockTransactionRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, PaidAt: nil}, nil)
				txRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "cannot delete paid transaction",
			id:   2,
			setupMock: func(txRepo *mock.MockTransactionRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{Id: 2, PaidAt: &paidAt}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "transaction not found",
			id:   99,
			setupMock: func(txRepo *mock.MockTransactionRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "delete-then-restore returns a variant-level counter to its original value",
			id:   3,
			setupMock: func(txRepo *mock.MockTransactionRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(3)).Return(domain.Transaction{
					Id: 3, PaidAt: nil,
					TransactionItems: []domain.TransactionItem{
						{Id: 30, VariantId: 1, Amount: 2},
					},
				}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
					Id: 1, IsAvailable: true, AvailableQuantity: intPtr(4),
					Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
				}, nil)
				availabilityRepo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(1), 6).Return(nil)
				availabilityRepo.EXPECT().CreateAvailabilityMovement(gomock.Any(), gomock.Any()).Return(nil)
				txRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(3)).Return(nil)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			availabilityRepo := mock.NewMockAvailabilityReservationRepository(ctrl)
			tt.setupMock(txRepo, availabilityRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(availabilityRepo), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
			err := usecase.DeleteTransactionById(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestTransactionUsecase_UnpayTransaction(t *testing.T) {
	now := time.Now()
	recentPaidAt := now.Add(-1 * time.Hour)
	oldPaidAt := now.Add(-25 * time.Hour)
	walletId := int64(1)

	tests := []struct {
		name          string
		id            int64
		setupMock     func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository)
		expectedError *domain.Error
	}{
		{
			name: "success — within 24h, refunds wallet",
			id:   1,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{
					Id: 1, PaidAt: &recentPaidAt, CreatedAt: recentPaidAt.Add(-30 * time.Minute),
					Total: 50000, WalletId: &walletId,
					TransactionItems: []domain.TransactionItem{},
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Name: "Cash", Balance: 100000, PaymentCostPercentage: 0}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				txRepo.EXPECT().UnpayTransaction(gomock.Any(), int64(1)).Return(nil)
			},
		},
		{
			name: "already unpaid",
			id:   2,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{Id: 2, PaidAt: nil}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "more than 24 hours since creation",
			id:   3,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(3)).Return(domain.Transaction{
					Id: 3, PaidAt: &oldPaidAt, CreatedAt: oldPaidAt.Add(-1 * time.Hour),
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			// FR-13 item 3: unpay reverses a credit the wallet legitimately received when the
			// payment was taken — an operator opting the wallet out afterwards must not strand it.
			name: "wallet opted out since the payment was taken can still be reversed",
			id:   4,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(4)).Return(domain.Transaction{
					Id: 4, PaidAt: &recentPaidAt, CreatedAt: recentPaidAt.Add(-30 * time.Minute),
					Total: 50000, WalletId: &walletId,
					TransactionItems: []domain.TransactionItem{},
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Name: "Brankas", Balance: 100000, PaymentCostPercentage: 0, IsPaymentTarget: false}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				txRepo.EXPECT().UnpayTransaction(gomock.Any(), int64(4)).Return(nil)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(txRepo, walletRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
			err := usecase.UnpayTransaction(context.Background(), tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

func TestTransactionUsecase_PayTransaction(t *testing.T) {
	barItem := domain.TransactionItem{
		Amount: 2, ProductName: "Kopi Susu Gula Aren",
		Variant: domain.Variant{Product: domain.Product{Category: domain.Category{Station: "BAR"}}},
	}
	kitchenItem := domain.TransactionItem{
		Amount: 1, ProductName: "Sandwich",
		Variant: domain.Variant{Product: domain.Product{Category: domain.Category{Station: "KITCHEN"}}},
	}
	boardGameItem := domain.TransactionItem{
		Amount: 1, ProductName: "Board Game Ticket",
		Variant: domain.Variant{Product: domain.Product{Category: domain.Category{Station: "NONE"}}},
	}

	tests := []struct {
		name          string
		id            int64
		walletId      int64
		paidAmount    float32
		setupMock     func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, kdsRepo *mock.MockKdsNotificationRepository)
		expectedError *domain.Error
	}{
		{
			name:       "success",
			id:         1,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, kdsRepo *mock.MockKdsNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{
					Id: 1, Total: 30000, PaidAt: nil,
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{
					Id: 1, Balance: 0, PaymentCostPercentage: 0, IsPaymentTarget: true,
				}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Transaction{}, nil)
				kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
				txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(1)).Return(nil)
			},
		},
		{
			name:       "transaction already paid",
			id:         2,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, kdsRepo *mock.MockKdsNotificationRepository) {
				now := time.Now()
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{
					Id: 2, PaidAt: &now,
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name:       "transaction not found",
			id:         99,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, kdsRepo *mock.MockKdsNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			// FR-1/D24: the usecase forwards the transaction to the outbox unconditionally; the
			// station rule (already covered by kds_notification_routing_test.go and
			// kds_notification_repo_test.go) is what decides one row is worth writing.
			name:       "a bar-only transaction is forwarded to the outbox and would notify",
			id:         3,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, kdsRepo *mock.MockKdsNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(3)).Return(domain.Transaction{
					Id: 3, Total: 30000, CreatedAt: time.Now(), TransactionItems: []domain.TransactionItem{barItem},
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(3)).Return(domain.Transaction{}, nil)
				kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(
					func(_ context.Context, transaction domain.Transaction, _ domain.KdsNotificationKind) *domain.Error {
						assert.True(t, domain.ShouldNotify(transaction))
						assert.Len(t, domain.StationLines(transaction), 1)
						return nil
					})
				txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(3)).Return(nil)
			},
		},
		{
			// D24: a mixed transaction is still exactly one call to EnqueueForTransaction — the
			// outbox writes exactly one row, listing both stations, not one row per station.
			name:       "a mixed bar-and-kitchen transaction is forwarded to the outbox exactly once",
			id:         4,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, kdsRepo *mock.MockKdsNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(4)).Return(domain.Transaction{
					Id: 4, Total: 30000, CreatedAt: time.Now(), TransactionItems: []domain.TransactionItem{barItem, kitchenItem},
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(4)).Return(domain.Transaction{}, nil)
				kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Times(1).DoAndReturn(
					func(_ context.Context, transaction domain.Transaction, _ domain.KdsNotificationKind) *domain.Error {
						assert.True(t, domain.ShouldNotify(transaction))
						assert.Len(t, domain.StationLines(transaction), 2)
						return nil
					})
				txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(4)).Return(nil)
			},
		},
		{
			// D3: a board-game-ticket-only transaction is still handed to the outbox — it is the
			// routing rule inside EnqueueForTransaction, not the usecase, that decides silence.
			name:       "a board-game-ticket-only transaction is forwarded to the outbox and would not notify",
			id:         5,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, kdsRepo *mock.MockKdsNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(5)).Return(domain.Transaction{
					Id: 5, Total: 30000, CreatedAt: time.Now(), TransactionItems: []domain.TransactionItem{boardGameItem},
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(5)).Return(domain.Transaction{}, nil)
				kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(
					func(_ context.Context, transaction domain.Transaction, _ domain.KdsNotificationKind) *domain.Error {
						assert.False(t, domain.ShouldNotify(transaction))
						return nil
					})
				txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(5)).Return(nil)
			},
		},
		{
			// D22: a transaction created on an earlier business day is still forwarded — the
			// outbox is what records it 'skipped' rather than dispatching it.
			name:       "a transaction created yesterday is forwarded to the outbox and would be skipped",
			id:         6,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, kdsRepo *mock.MockKdsNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(6)).Return(domain.Transaction{
					Id: 6, Total: 30000, CreatedAt: time.Now().Add(-24 * time.Hour), TransactionItems: []domain.TransactionItem{barItem},
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(6)).Return(domain.Transaction{}, nil)
				kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(
					func(_ context.Context, transaction domain.Transaction, _ domain.KdsNotificationKind) *domain.Error {
						assert.True(t, domain.IsStaleForNotification(transaction, time.Now()))
						return nil
					})
				txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(6)).Return(nil)
			},
		},
		{
			// FR-1: an enqueue failure fails the payment rather than silently dropping the
			// notification — the only realistic cause is the DB being down, in which case the
			// payment was failing anyway.
			name:       "an outbox enqueue failure fails the payment",
			id:         7,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, kdsRepo *mock.MockKdsNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(7)).Return(domain.Transaction{
					Id: 7, Total: 30000, CreatedAt: time.Now(), TransactionItems: []domain.TransactionItem{barItem},
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
				walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(7)).Return(domain.Transaction{}, nil)
				kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Return(&domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			// FR-13/D24: a wallet an operator has opted out of receiving payments must be rejected
			// before any balance, income or kds_notifications write — the guard sits ahead of the
			// wallet update, so no further mock expectation is set for it.
			name:       "wallet not eligible for payments is rejected before any write",
			id:         8,
			walletId:   1,
			paidAmount: 30000,
			setupMock: func(txRepo *mock.MockTransactionRepository, walletRepo *mock.MockWalletRepository, kdsRepo *mock.MockKdsNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(8)).Return(domain.Transaction{
					Id: 8, Total: 30000, CreatedAt: time.Now(),
				}, nil)
				walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, Name: "Brankas", IsPaymentTarget: false}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
			tt.setupMock(txRepo, walletRepo, kdsRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), kdsRepo, permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
			err := usecase.PayTransaction(context.Background(), tt.walletId, tt.paidAmount, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

// FR-4: the post-commit kick — the cashier's HTTP response must not wait on Expo, but the sweep
// still has to run once the payment is actually committed.
func TestTransactionUsecase_PayTransaction_KdsDispatchTrigger(t *testing.T) {
	t.Run("triggers a dispatch sweep after a payment commits", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, Total: 30000}, nil)
		walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
		walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
		txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Transaction{}, nil)
		kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
		txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(1)).Return(nil)
		dispatcher.EXPECT().TriggerDispatch().Times(1)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), kdsRepo, dispatcher, permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		err := usecase.PayTransaction(context.Background(), 1, 30000, 1)

		assert.Nil(t, err)
	})

	t.Run("does not trigger a dispatch sweep when the payment fails", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)

		now := time.Now()
		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{Id: 2, PaidAt: &now}, nil)
		dispatcher.EXPECT().TriggerDispatch().Times(0)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), kdsRepo, dispatcher, permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		err := usecase.PayTransaction(context.Background(), 1, 30000, 2)

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})
}

// FR-6: PayTransaction settles the linked payments row and converts its cart — the cashier's
// existing pay flow doubling as the cash gateway, and the fix for the same latent hole on the
// QRIS path (a staff member paying an order transaction by hand).
func TestTransactionUsecase_PayTransaction_SettlesOrderPayment(t *testing.T) {
	t.Run("flips a pending order payment to paid and converts its cart", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		paymentRepo := mock.NewMockPaymentRepository(ctrl)
		cartRepo := mock.NewMockCartRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{
			Id: 1, Source: domain.TransactionSourceOrder, Total: 30000,
		}, nil)
		walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
		walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
		txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Transaction{}, nil)
		kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindOrderPaid).Return(nil)
		txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(1)).Return(nil)

		paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(1)).Return(domain.Payment{
			Id: 5, CartId: 9, Status: domain.PaymentStatePending,
		}, nil)
		paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(5)).DoAndReturn(
			func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, payment.Status)
				assert.NotNil(t, payment.PaidAt)
				return payment, nil
			})
		cartRepo.EXPECT().GetCartById(gomock.Any(), int64(9)).Return(domain.Cart{Id: 9, Status: domain.CartStatusActive}, nil)
		cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(9)).DoAndReturn(
			func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) {
				assert.Equal(t, domain.CartStatusConverted, cart.Status)
				return cart, nil
			})
		// D7: no other pending payment on the same cart to supersede.
		paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(9)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), kdsRepo, permissiveKdsNotificationDispatcher(ctrl), paymentRepo, permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), cartRepo)
		err := usecase.PayTransaction(context.Background(), 1, 30000, 1)

		assert.Nil(t, err)
	})

	t.Run("a payment already paid is a no-op (webhook-wins race)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		paymentRepo := mock.NewMockPaymentRepository(ctrl)
		cartRepo := mock.NewMockCartRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{
			Id: 2, Source: domain.TransactionSourceOrder, Total: 30000,
		}, nil)
		walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
		walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
		txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(2)).Return(domain.Transaction{}, nil)
		kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindOrderPaid).Return(nil)
		txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(2)).Return(nil)

		// Status already paid: no UpdatePaymentById and no cart repository call.
		paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(2)).Return(domain.Payment{
			Id: 6, Status: domain.PaymentStatePaid,
		}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), kdsRepo, permissiveKdsNotificationDispatcher(ctrl), paymentRepo, permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), cartRepo)
		err := usecase.PayTransaction(context.Background(), 1, 30000, 2)

		assert.Nil(t, err)
	})

	t.Run("a POS transaction with no payment row succeeds unchanged", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		paymentRepo := mock.NewMockPaymentRepository(ctrl)
		cartRepo := mock.NewMockCartRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(3)).Return(domain.Transaction{
			Id: 3, Source: domain.TransactionSourcePos, Total: 30000,
		}, nil)
		walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
		walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
		txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(3)).Return(domain.Transaction{}, nil)
		kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindOrderPaid).Return(nil)
		txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(3)).Return(nil)

		paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(3)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), kdsRepo, permissiveKdsNotificationDispatcher(ctrl), paymentRepo, permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), cartRepo)
		err := usecase.PayTransaction(context.Background(), 1, 30000, 3)

		assert.Nil(t, err)
	})

	t.Run("a paid amount above the total still settles the payment at its quoted amount", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		paymentRepo := mock.NewMockPaymentRepository(ctrl)
		cartRepo := mock.NewMockCartRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(4)).Return(domain.Transaction{
			Id: 4, Source: domain.TransactionSourceOrder, Total: 25000,
		}, nil)
		walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
		walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
		txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(4)).Return(domain.Transaction{}, nil)
		kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindOrderPaid).Return(nil)
		// paidAmount (30000) exceeds the transaction total (25000) — change taken by the cashier.
		txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(4)).Return(nil)

		paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(4)).Return(domain.Payment{
			Id: 7, CartId: 11, Amount: 25000, Status: domain.PaymentStatePending,
		}, nil)
		paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(7)).DoAndReturn(
			func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, payment.Status)
				assert.Equal(t, float32(25000), payment.Amount)
				return payment, nil
			})
		cartRepo.EXPECT().GetCartById(gomock.Any(), int64(11)).Return(domain.Cart{Id: 11}, nil)
		cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(11)).Return(domain.Cart{}, nil)
		// D7: no other pending payment on the same cart to supersede.
		paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(11)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), kdsRepo, permissiveKdsNotificationDispatcher(ctrl), paymentRepo, permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), cartRepo)
		err := usecase.PayTransaction(context.Background(), 1, 30000, 4)

		assert.Nil(t, err)
	})
}

// D23: the sweeper may soft-delete an order transaction between the cashier's list fetch and
// their pressing Pay. PayTransaction restores it before paying instead of silently banking money
// against an invisible transaction — the same late-payment path applyQrisStatus already takes.
func TestTransactionUsecase_PayTransaction_UndeletesSoftDeletedOrderTransaction(t *testing.T) {
	deletedAt := time.Now().Add(-1 * time.Minute)

	t.Run("un-deletes, re-reserves availability and settles the expired payment", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		paymentRepo := mock.NewMockPaymentRepository(ctrl)
		cartRepo := mock.NewMockCartRepository(ctrl)
		availabilityRepo := mock.NewMockAvailabilityReservationRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{
			Id: 1, Source: domain.TransactionSourceOrder, Total: 30000, DeletedAt: &deletedAt,
			TransactionItems: []domain.TransactionItem{{VariantId: 1, Amount: 1}},
		}, nil)
		txRepo.EXPECT().UndeleteTransactionById(gomock.Any(), int64(1)).Return(nil)
		availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
			Id: 1, Product: domain.Product{AvailabilityTracking: domain.AvailabilityTrackingNone},
		}, nil)

		walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
		walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
		txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Transaction{}, nil)
		kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindOrderPaid).Return(nil)
		txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(1)).Return(nil)

		paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(1)).Return(domain.Payment{
			Id: 5, CartId: 9, Status: domain.PaymentStateExpired,
		}, nil)
		paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(5)).DoAndReturn(
			func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, payment.Status)
				return payment, nil
			})
		cartRepo.EXPECT().GetCartById(gomock.Any(), int64(9)).Return(domain.Cart{Id: 9}, nil)
		cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(9)).Return(domain.Cart{}, nil)
		// D7: no other pending payment on the same cart to supersede.
		paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(9)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(availabilityRepo), kdsRepo, permissiveKdsNotificationDispatcher(ctrl), paymentRepo, permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), cartRepo)
		err := usecase.PayTransaction(context.Background(), 1, 30000, 1)

		assert.Nil(t, err)
	})

	t.Run("a soft-deleted POS transaction is untouched by the undelete path", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		paymentRepo := mock.NewMockPaymentRepository(ctrl)
		cartRepo := mock.NewMockCartRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{
			Id: 2, Source: domain.TransactionSourcePos, Total: 30000, DeletedAt: &deletedAt,
		}, nil)
		// No UndeleteTransactionById and no availability reservation calls for a POS transaction.
		walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
		walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
		txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(2)).Return(domain.Transaction{}, nil)
		kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindOrderPaid).Return(nil)
		txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(2)).Return(nil)

		paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(2)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), kdsRepo, permissiveKdsNotificationDispatcher(ctrl), paymentRepo, permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), cartRepo)
		err := usecase.PayTransaction(context.Background(), 1, 30000, 2)

		assert.Nil(t, err)
	})

	// FR-5/D7: this is the pre-existing gap the PRD calls out — a late-paid expired order could
	// already coexist with a newer pending payment on the same cart before this phase. The cashier
	// settling it by hand must supersede that newer payment exactly as the QRIS webhook path does.
	t.Run("settling an expired order with a newer pending payment on the same cart supersedes it", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		paymentRepo := mock.NewMockPaymentRepository(ctrl)
		cartRepo := mock.NewMockCartRepository(ctrl)
		availabilityRepo := mock.NewMockAvailabilityReservationRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(3)).Return(domain.Transaction{
			Id: 3, Source: domain.TransactionSourceOrder, Total: 30000, DeletedAt: &deletedAt,
			TransactionItems: []domain.TransactionItem{{VariantId: 1, Amount: 1}},
		}, nil)
		txRepo.EXPECT().UndeleteTransactionById(gomock.Any(), int64(3)).Return(nil)
		availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
			Id: 1, Product: domain.Product{AvailabilityTracking: domain.AvailabilityTrackingNone},
		}, nil)

		walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
		walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
		txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(3)).Return(domain.Transaction{}, nil)
		kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindOrderPaid).Return(nil)
		txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(3)).Return(nil)

		paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(3)).Return(domain.Payment{
			Id: 5, CartId: 9, Status: domain.PaymentStateExpired,
		}, nil)
		paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(5)).DoAndReturn(
			func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, payment.Status)
				return payment, nil
			})
		cartRepo.EXPECT().GetCartById(gomock.Any(), int64(9)).Return(domain.Cart{Id: 9}, nil)
		cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(9)).Return(domain.Cart{}, nil)

		newerQrisPayment := domain.Payment{
			Id: 43, CartId: 9, Method: domain.PaymentMethodQris, Status: domain.PaymentStatePending,
			TransactionId: int64Ptr(201), PartnerReferenceNo: "ORD88888888888Z",
			ExpiredAt: time.Now().Add(5 * time.Minute),
		}
		paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(9)).Return(newerQrisPayment, nil)
		paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), newerQrisPayment.Id).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateCancelled, payment.Status)
				require.NotNil(t, payment.CancelReason)
				assert.Equal(t, domain.PaymentCancelReasonSuperseded, *payment.CancelReason)
				return payment, nil
			})
		// No TransactionItems on the superseded transaction, so Release makes no repository calls.
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(201)).Return(domain.Transaction{Id: 201}, nil)
		txRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(201)).Return(nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(availabilityRepo), kdsRepo, permissiveKdsNotificationDispatcher(ctrl), paymentRepo, permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), cartRepo)
		err := usecase.PayTransaction(context.Background(), 1, 30000, 3)

		assert.Nil(t, err)
	})
}

// FR-5/D8: a cashier cannot pay an order transaction whose linked payment the guest already
// cancelled — the money never came in, and the guest may have re-ordered on the same cart.
func TestTransactionUsecase_PayTransaction_CancelledOrderGuard(t *testing.T) {
	t.Run("a cancelled order returns 400 with no wallet, income, or KDS writes", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		paymentRepo := mock.NewMockPaymentRepository(ctrl)
		cartRepo := mock.NewMockCartRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{
			Id: 1, Source: domain.TransactionSourceOrder, Total: 30000,
		}, nil)
		paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(1)).Return(domain.Payment{
			Id: 5, CartId: 9, Status: domain.PaymentStateCancelled,
		}, nil)
		// No wallet, transaction income, KDS, or cart writes past the guard.

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), kdsRepo, permissiveKdsNotificationDispatcher(ctrl), paymentRepo, permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), cartRepo)
		err := usecase.PayTransaction(context.Background(), 1, 30000, 1)

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "order was cancelled by the guest", err.Message)
	})

	t.Run("an expired order is still payable unchanged (Cash D23)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		kdsRepo := mock.NewMockKdsNotificationRepository(ctrl)
		paymentRepo := mock.NewMockPaymentRepository(ctrl)
		cartRepo := mock.NewMockCartRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{
			Id: 2, Source: domain.TransactionSourceOrder, Total: 30000,
		}, nil)
		walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(1)).Return(domain.Wallet{Id: 1, IsPaymentTarget: true}, nil)
		walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Wallet{}, nil)
		txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(2)).Return(domain.Transaction{}, nil)
		kdsRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindOrderPaid).Return(nil)
		txRepo.EXPECT().PayTransaction(gomock.Any(), int64(1), gomock.Any(), float32(30000), int64(2)).Return(nil)

		paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(2)).Return(domain.Payment{
			Id: 6, CartId: 10, Status: domain.PaymentStateExpired,
		}, nil)
		paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(6)).DoAndReturn(
			func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, payment.Status)
				return payment, nil
			})
		cartRepo.EXPECT().GetCartById(gomock.Any(), int64(10)).Return(domain.Cart{Id: 10}, nil)
		cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(10)).Return(domain.Cart{}, nil)
		paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(10)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), kdsRepo, permissiveKdsNotificationDispatcher(ctrl), paymentRepo, permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), cartRepo)
		err := usecase.PayTransaction(context.Background(), 1, 30000, 2)

		assert.Nil(t, err)
	})
}

func TestTransactionUsecase_CompleteTransaction(t *testing.T) {
	now := time.Now()
	deletedAt := now.Add(-1 * time.Hour)

	tests := []struct {
		name          string
		id            int64
		setupMock     func(txRepo *mock.MockTransactionRepository, paymentRepo *mock.MockPaymentRepository, guestNotificationRepo *mock.MockGuestNotificationRepository)
		expectedError *domain.Error
	}{
		{
			name: "success enqueues one row carrying the payment's session_id and whatsapp number",
			id:   1,
			setupMock: func(txRepo *mock.MockTransactionRepository, paymentRepo *mock.MockPaymentRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				whatsappNumber := "6281234567890"
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{
					Id: 1, Source: domain.TransactionSourceOrder, CompletedAt: nil,
				}, nil)
				txRepo.EXPECT().CompleteTransaction(gomock.Any(), gomock.Any(), int64(1)).Return(nil)
				paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(1)).Return(domain.Payment{SessionId: "guest-session-1", CustomerWhatsappNumber: &whatsappNumber}, nil)
				guestNotificationRepo.EXPECT().EnqueueForCompletedTransaction(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, transaction domain.Transaction, sessionId *string, whatsappNumber *string) *domain.Error {
						assert.Equal(t, int64(1), transaction.Id)
						require.NotNil(t, sessionId)
						assert.Equal(t, "guest-session-1", *sessionId)
						require.NotNil(t, whatsappNumber)
						assert.Equal(t, "6281234567890", *whatsappNumber)
						return nil
					})
			},
		},
		{
			name: "no payment for transaction enqueues a skipped row rather than failing",
			id:   6,
			setupMock: func(txRepo *mock.MockTransactionRepository, paymentRepo *mock.MockPaymentRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(6)).Return(domain.Transaction{
					Id: 6, Source: domain.TransactionSourceOrder, CompletedAt: nil,
				}, nil)
				txRepo.EXPECT().CompleteTransaction(gomock.Any(), gomock.Any(), int64(6)).Return(nil)
				paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(6)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
				guestNotificationRepo.EXPECT().EnqueueForCompletedTransaction(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, transaction domain.Transaction, sessionId *string, whatsappNumber *string) *domain.Error {
						assert.Nil(t, sessionId)
						assert.Nil(t, whatsappNumber)
						return nil
					})
			},
		},
		{
			name: "payment lookup failure fails the completion",
			id:   7,
			setupMock: func(txRepo *mock.MockTransactionRepository, paymentRepo *mock.MockPaymentRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(7)).Return(domain.Transaction{
					Id: 7, Source: domain.TransactionSourceOrder, CompletedAt: nil,
				}, nil)
				txRepo.EXPECT().CompleteTransaction(gomock.Any(), gomock.Any(), int64(7)).Return(nil)
				paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(7)).Return(domain.Payment{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			name: "transaction not found",
			id:   2,
			setupMock: func(txRepo *mock.MockTransactionRepository, paymentRepo *mock.MockPaymentRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "transaction is soft-deleted",
			id:   3,
			setupMock: func(txRepo *mock.MockTransactionRepository, paymentRepo *mock.MockPaymentRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(3)).Return(domain.Transaction{
					Id: 3, Source: domain.TransactionSourceOrder, DeletedAt: &deletedAt,
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "transaction is a POS transaction is rejected before the enqueue is reached",
			id:   4,
			setupMock: func(txRepo *mock.MockTransactionRepository, paymentRepo *mock.MockPaymentRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(4)).Return(domain.Transaction{
					Id: 4, Source: domain.TransactionSourcePos,
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "already completed",
			id:   5,
			setupMock: func(txRepo *mock.MockTransactionRepository, paymentRepo *mock.MockPaymentRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(5)).Return(domain.Transaction{
					Id: 5, Source: domain.TransactionSourceOrder, CompletedAt: &now,
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			paymentRepo := mock.NewMockPaymentRepository(ctrl)
			guestNotificationRepo := mock.NewMockGuestNotificationRepository(ctrl)
			tt.setupMock(txRepo, paymentRepo, guestNotificationRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), paymentRepo, guestNotificationRepo, permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
			err := usecase.CompleteTransaction(context.Background(), tt.id)

			if tt.expectedError != nil {
				require.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

// Phase 5/FR-4: the post-commit kick — the barista's HTTP response must not wait on a push
// service, but the sweep still has to run once the completion is actually committed.
func TestTransactionUsecase_CompleteTransaction_GuestNotificationDispatchTrigger(t *testing.T) {
	t.Run("triggers a dispatch sweep after a completion commits", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		paymentRepo := permissivePaymentRepository(ctrl)
		guestNotificationRepo := permissiveGuestNotificationRepository(ctrl)
		dispatcher := mock.NewMockGuestNotificationDispatcher(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{
			Id: 1, Source: domain.TransactionSourceOrder,
		}, nil)
		txRepo.EXPECT().CompleteTransaction(gomock.Any(), gomock.Any(), int64(1)).Return(nil)
		dispatcher.EXPECT().TriggerDispatch().Times(1)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), paymentRepo, guestNotificationRepo, dispatcher, permissiveCartRepository(ctrl))
		err := usecase.CompleteTransaction(context.Background(), 1)

		assert.Nil(t, err)
	})

	t.Run("does not trigger a dispatch sweep when the completion fails", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		dispatcher := mock.NewMockGuestNotificationDispatcher(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{
			Id: 2, Source: domain.TransactionSourcePos,
		}, nil)
		dispatcher.EXPECT().TriggerDispatch().Times(0)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), dispatcher, permissiveCartRepository(ctrl))
		err := usecase.CompleteTransaction(context.Background(), 2)

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})
}

func TestTransactionUsecase_UncompleteTransaction(t *testing.T) {
	now := time.Now()
	deletedAt := now.Add(-1 * time.Hour)

	tests := []struct {
		name          string
		id            int64
		setupMock     func(txRepo *mock.MockTransactionRepository, guestNotificationRepo *mock.MockGuestNotificationRepository)
		expectedError *domain.Error
	}{
		{
			// D6 (inverts the old D7): the outbox row is left in place, not deleted. The unique
			// key on transaction_id is what stops a re-completion from sending a second message.
			name: "success leaves the outbox row untouched",
			id:   1,
			setupMock: func(txRepo *mock.MockTransactionRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{
					Id: 1, Source: domain.TransactionSourceOrder, CompletedAt: &now,
				}, nil)
				txRepo.EXPECT().UncompleteTransaction(gomock.Any(), int64(1)).Return(nil)
				// No call on guestNotificationRepo is expected at all: gomock fails the test if
				// UncompleteTransaction reaches for it.
			},
		},
		{
			name: "transaction not found",
			id:   2,
			setupMock: func(txRepo *mock.MockTransactionRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "transaction is soft-deleted",
			id:   3,
			setupMock: func(txRepo *mock.MockTransactionRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(3)).Return(domain.Transaction{
					Id: 3, Source: domain.TransactionSourceOrder, CompletedAt: &now, DeletedAt: &deletedAt,
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "transaction is a POS transaction",
			id:   4,
			setupMock: func(txRepo *mock.MockTransactionRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(4)).Return(domain.Transaction{
					Id: 4, Source: domain.TransactionSourcePos, CompletedAt: &now,
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "not completed yet",
			id:   5,
			setupMock: func(txRepo *mock.MockTransactionRepository, guestNotificationRepo *mock.MockGuestNotificationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(5)).Return(domain.Transaction{
					Id: 5, Source: domain.TransactionSourceOrder, CompletedAt: nil,
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			guestNotificationRepo := mock.NewMockGuestNotificationRepository(ctrl)
			tt.setupMock(txRepo, guestNotificationRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), guestNotificationRepo, permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
			err := usecase.UncompleteTransaction(context.Background(), tt.id)

			if tt.expectedError != nil {
				require.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
			}
		})
	}
}

// rowTrackingGuestNotificationRepository stands in for the UNIQUE (transaction_id) constraint a
// real database enforces on EnqueueForCompletedTransaction (D6): it records one row per
// transaction id no matter how many times enqueue is called for it, the same way `INSERT ...
// ON DUPLICATE KEY UPDATE id = id` collapses a repeat enqueue into a no-op at the database layer.
type rowTrackingGuestNotificationRepository struct {
	enqueueCallsByTransactionId map[int64]int
}

func newRowTrackingGuestNotificationRepository() *rowTrackingGuestNotificationRepository {
	return &rowTrackingGuestNotificationRepository{enqueueCallsByTransactionId: map[int64]int{}}
}

func (repo *rowTrackingGuestNotificationRepository) EnqueueForCompletedTransaction(ctx context.Context, transaction domain.Transaction, sessionId *string, whatsappNumber *string) *domain.Error {
	repo.enqueueCallsByTransactionId[transaction.Id]++
	return nil
}

func (repo *rowTrackingGuestNotificationRepository) ClaimPendingGuestNotifications(ctx context.Context, limit int) ([]domain.GuestNotification, *domain.Error) {
	return nil, nil
}

func (repo *rowTrackingGuestNotificationRepository) MarkGuestNotificationSent(ctx context.Context, id int64, providerMessageId string) *domain.Error {
	return nil
}

func (repo *rowTrackingGuestNotificationRepository) MarkGuestNotificationFailed(ctx context.Context, id int64, detail string) *domain.Error {
	return nil
}

func (repo *rowTrackingGuestNotificationRepository) MarkGuestNotificationUnknownOutcome(ctx context.Context, id int64, detail string) *domain.Error {
	return nil
}

func (repo *rowTrackingGuestNotificationRepository) MarkGuestNotificationSkipped(ctx context.Context, id int64, detail string) *domain.Error {
	return nil
}

func (repo *rowTrackingGuestNotificationRepository) ExpireStaleSending(ctx context.Context, now time.Time) *domain.Error {
	return nil
}

// D6 (inverts the old D7 test): complete → uncomplete → complete must leave exactly one outbox
// row for the transaction, because UncompleteTransaction no longer deletes it and the unique key
// swallows the second enqueue.
func TestTransactionUsecase_CompleteUncompleteComplete_LeavesExactlyOneGuestNotificationRow(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	txRepo := mock.NewMockTransactionRepository(ctrl)
	variantRepo := mock.NewMockVariantRepository(ctrl)
	couponRepo := mock.NewMockCouponRepository(ctrl)
	walletRepo := mock.NewMockWalletRepository(ctrl)
	guestNotificationRepo := newRowTrackingGuestNotificationRepository()

	completedAt := time.Now()
	transaction := domain.Transaction{Id: 1, Source: domain.TransactionSourceOrder}

	txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) }).Times(3)
	txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(transaction, nil)
	txRepo.EXPECT().CompleteTransaction(gomock.Any(), gomock.Any(), int64(1)).DoAndReturn(
		func(ctx context.Context, at time.Time, id int64) *domain.Error {
			transaction.CompletedAt = &completedAt
			return nil
		})

	usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), guestNotificationRepo, permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))

	require.Nil(t, usecase.CompleteTransaction(context.Background(), 1))

	txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(transaction, nil)
	txRepo.EXPECT().UncompleteTransaction(gomock.Any(), int64(1)).DoAndReturn(
		func(ctx context.Context, id int64) *domain.Error {
			transaction.CompletedAt = nil
			return nil
		})
	require.Nil(t, usecase.UncompleteTransaction(context.Background(), 1))

	txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(transaction, nil)
	txRepo.EXPECT().CompleteTransaction(gomock.Any(), gomock.Any(), int64(1)).Return(nil)
	require.Nil(t, usecase.CompleteTransaction(context.Background(), 1))

	assert.Len(t, guestNotificationRepo.enqueueCallsByTransactionId, 1)
	assert.Equal(t, 2, guestNotificationRepo.enqueueCallsByTransactionId[1])
}

func TestTransactionUsecase_UpdateTransactionById(t *testing.T) {
	tests := []struct {
		name          string
		id            int64
		input         domain.Transaction
		setupMock     func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository)
		expectedTotal float32
		expectedItems []domain.TransactionItem
		expectedError *domain.Error
	}{
		{
			name: "success",
			id:   1,
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{VariantId: 1, Amount: 2, DiscountAmount: 0, Note: ""},
				},
				TransactionCoupons: []domain.TransactionCoupon{},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1, PaidAt: nil}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 15000}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
					Id: 1, IsAvailable: true, Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingNone},
				}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Transaction{Id: 1}, nil)
			},
		},
		{
			name: "rental item keeps checkout price and rental link",
			id:   3,
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{Id: 10, VariantId: 1, Amount: 1, DiscountAmount: 0, Note: "edited note"},
				},
				TransactionCoupons: []domain.TransactionCoupon{},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				rentalId := int64(7)
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(3)).Return(domain.Transaction{
					Id: 3, PaidAt: nil,
					TransactionItems: []domain.TransactionItem{
						{Id: 10, VariantId: 1, Amount: 1, Price: 25000, Subtotal: 25000, RentalId: &rentalId, Note: "2 hour(s)"},
					},
				}, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(3)).DoAndReturn(
					func(ctx context.Context, tx domain.Transaction, id int64) (domain.Transaction, *domain.Error) {
						return tx, nil
					})
			},
			expectedTotal: 25000,
			expectedItems: []domain.TransactionItem{
				{Id: 10, TransactionId: 3, VariantId: 1, Amount: 1, Price: 25000, Subtotal: 25000, RentalId: int64Ptr(7), Note: "2 hour(s)"},
			},
		},
		{
			name: "cannot update paid transaction",
			id:   2,
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				now := time.Now()
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(2)).Return(domain.Transaction{Id: 2, PaidAt: &now}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "transaction not found",
			id:   99,
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{}, &domain.Error{Type: domain.NotFound})
			},
			expectedError: &domain.Error{Type: domain.NotFound},
		},
		{
			name: "increasing a variant-level amount reserves the difference",
			id:   4,
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{Id: 40, VariantId: 1, Amount: 3, DiscountAmount: 0},
				},
				TransactionCoupons: []domain.TransactionCoupon{},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(4)).Return(domain.Transaction{
					Id: 4, PaidAt: nil,
					TransactionItems: []domain.TransactionItem{{Id: 40, VariantId: 1, Amount: 1}},
				}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 6000}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
					Id: 1, Name: "Choco", IsAvailable: true, AvailableQuantity: intPtr(5),
					Product: domain.Product{Name: "Soft Cookies", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
				}, nil)
				availabilityRepo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(1), 3).Return(nil)
				availabilityRepo.EXPECT().CreateAvailabilityMovement(gomock.Any(), gomock.Any()).Return(nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(4)).Return(domain.Transaction{Id: 4}, nil)
			},
		},
		{
			name: "decreasing a variant-level amount releases the difference",
			id:   5,
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{Id: 50, VariantId: 1, Amount: 1, DiscountAmount: 0},
				},
				TransactionCoupons: []domain.TransactionCoupon{},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(5)).Return(domain.Transaction{
					Id: 5, PaidAt: nil,
					TransactionItems: []domain.TransactionItem{{Id: 50, VariantId: 1, Amount: 3}},
				}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 6000}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
					Id: 1, Name: "Choco", IsAvailable: true, AvailableQuantity: intPtr(2),
					Product: domain.Product{Name: "Soft Cookies", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
				}, nil)
				availabilityRepo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(1), 4).Return(nil)
				availabilityRepo.EXPECT().CreateAvailabilityMovement(gomock.Any(), gomock.Any()).Return(nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(5)).Return(domain.Transaction{Id: 5}, nil)
			},
		},
		{
			name: "removing a line releases what it held",
			id:   6,
			input: domain.Transaction{
				TransactionItems:   []domain.TransactionItem{},
				TransactionCoupons: []domain.TransactionCoupon{},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(6)).Return(domain.Transaction{
					Id: 6, PaidAt: nil,
					TransactionItems: []domain.TransactionItem{{Id: 60, VariantId: 1, Amount: 2}},
				}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
					Id: 1, Name: "Choco", IsAvailable: true, AvailableQuantity: intPtr(1),
					Product: domain.Product{Name: "Soft Cookies", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
				}, nil)
				availabilityRepo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(1), 3).Return(nil)
				availabilityRepo.EXPECT().CreateAvailabilityMovement(gomock.Any(), gomock.Any()).Return(nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(6)).Return(domain.Transaction{Id: 6}, nil)
			},
		},
		{
			name: "adding a line reserves it",
			id:   7,
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{Id: 70, VariantId: 1, Amount: 1, DiscountAmount: 0},
					{VariantId: 2, Amount: 1, DiscountAmount: 0},
				},
				TransactionCoupons: []domain.TransactionCoupon{},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(7)).Return(domain.Transaction{
					Id: 7, PaidAt: nil,
					TransactionItems: []domain.TransactionItem{{Id: 70, VariantId: 1, Amount: 1}},
				}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 6000}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, Price: 6000}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
					Id: 1, IsAvailable: true,
					Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingNone},
				}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(2)).Return(domain.Variant{
					Id: 2, Name: "Red Velvet", IsAvailable: true, AvailableQuantity: intPtr(3),
					Product: domain.Product{Name: "Soft Cookies", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
				}, nil)
				availabilityRepo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(2), 2).Return(nil)
				availabilityRepo.EXPECT().CreateAvailabilityMovement(gomock.Any(), gomock.Any()).Return(nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(7)).Return(domain.Transaction{Id: 7}, nil)
			},
		},
		{
			name: "swapping one variant for another nets to zero on a shared product-level counter",
			id:   8,
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{Id: 80, VariantId: 2, Amount: 2, DiscountAmount: 0},
				},
				TransactionCoupons: []domain.TransactionCoupon{},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(8)).Return(domain.Transaction{
					Id: 8, PaidAt: nil,
					TransactionItems: []domain.TransactionItem{{Id: 80, VariantId: 1, Amount: 2}},
				}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, ProductId: 10, Price: 8000}, nil)
				pancong := domain.Product{Id: 10, Name: "Pancong", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingProduct, AvailableQuantity: intPtr(5)}
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 10, IsAvailable: true, Product: pancong}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, ProductId: 10, IsAvailable: true, Product: pancong}, nil)
				availabilityRepo.EXPECT().LockProductById(gomock.Any(), int64(10)).Times(1).Return(pancong, nil)
				txRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(8)).Return(domain.Transaction{Id: 8}, nil)
			},
		},
		{
			name: "a rejected increase leaves the counter untouched",
			id:   9,
			input: domain.Transaction{
				TransactionItems: []domain.TransactionItem{
					{Id: 90, VariantId: 1, Amount: 4, DiscountAmount: 0},
				},
				TransactionCoupons: []domain.TransactionCoupon{},
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
				txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				txRepo.EXPECT().GetTransactionById(gomock.Any(), int64(9)).Return(domain.Transaction{
					Id: 9, PaidAt: nil,
					TransactionItems: []domain.TransactionItem{{Id: 90, VariantId: 1, Amount: 1}},
				}, nil)
				variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 6000}, nil)
				availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{
					Id: 1, Name: "Choco", IsAvailable: true, AvailableQuantity: intPtr(2),
					Product: domain.Product{Name: "Soft Cookies", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
				}, nil)
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
		{
			name: "rejects an invalid dining option",
			id:   8,
			input: domain.Transaction{
				DiningOption: "delivery",
			},
			setupMock: func(txRepo *mock.MockTransactionRepository, variantRepo *mock.MockVariantRepository, couponRepo *mock.MockCouponRepository, availabilityRepo *mock.MockAvailabilityReservationRepository) {
			},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			availabilityRepo := mock.NewMockAvailabilityReservationRepository(ctrl)
			tt.setupMock(txRepo, variantRepo, couponRepo, availabilityRepo)

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(availabilityRepo), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
			updated, err := usecase.UpdateTransactionById(context.Background(), tt.input, tt.id)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				if tt.expectedItems != nil {
					assert.Equal(t, tt.expectedTotal, updated.Total)
					assert.Equal(t, tt.expectedItems, updated.TransactionItems)
				}
			}
		})
	}
}

func TestTransactionUsecase_UpdateTransactionById_ItemCoupons(t *testing.T) {
	t.Run("FREE 1 HOUR on a 30K rental item discounts the line (FR-4 #1)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		rentalId := int64(100)
		txRepo, variantRepo, couponRepo, walletRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{
			Id: 1, PaidAt: nil,
			TransactionItems: []domain.TransactionItem{
				{Id: 10, VariantId: 1, Amount: 1, Price: 30000, Subtotal: 30000, RentalId: &rentalId, Note: "2 hour(s)"},
			},
		})
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(domain.Coupon{Id: 50, Type: domain.Fixed, Amount: 15000}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 10, VariantId: 1, Amount: 1, DiscountAmount: 0, Note: "2 hour(s)"},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 50, TransactionItemId: int64Ptr(10)},
			},
		}, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(15000), updated.Total)
		assert.Equal(t, float32(15000), updated.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(15000), updated.TransactionItems[0].Subtotal)
		assert.Equal(t, &rentalId, updated.TransactionItems[0].RentalId)
		assert.Equal(t, []domain.TransactionCoupon{
			{CouponId: 50, Type: domain.Fixed, Amount: 15000, TransactionId: 1, TransactionItemId: int64Ptr(10)},
		}, updated.TransactionCoupons)
	})

	t.Run("re-saving the same rental coupon does not compound the discount", func(t *testing.T) {
		rentalId := int64(101)
		coupon := domain.Coupon{Id: 50, Type: domain.Fixed, Amount: 15000}
		input := domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 11, VariantId: 1, Amount: 1, DiscountAmount: 0, Note: "2 hour(s)"},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 50, TransactionItemId: int64Ptr(11)},
			},
		}

		ctrl1 := gomock.NewController(t)
		txRepo1, variantRepo1, couponRepo1, walletRepo1 := setupUpdateTransactionMocks(ctrl1, 1, domain.Transaction{
			Id: 1, PaidAt: nil,
			TransactionItems: []domain.TransactionItem{
				{Id: 11, VariantId: 1, Amount: 1, Price: 30000, Subtotal: 30000, RentalId: &rentalId, Note: "2 hour(s)"},
			},
		})
		couponRepo1.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(coupon, nil)
		usecase1 := domain.NewTransactionUsecase(txRepo1, variantRepo1, couponRepo1, walletRepo1, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl1)), mock.NewMockKdsNotificationRepository(ctrl1), permissiveKdsNotificationDispatcher(ctrl1), permissivePaymentRepository(ctrl1), permissiveGuestNotificationRepository(ctrl1), permissiveGuestNotificationDispatcher(ctrl1), permissiveCartRepository(ctrl1))
		firstSave, err := usecase1.UpdateTransactionById(context.Background(), input, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(15000), firstSave.Total)
		assert.Equal(t, float32(15000), firstSave.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(15000), firstSave.TransactionItems[0].Subtotal)

		ctrl2 := gomock.NewController(t)
		txRepo2, variantRepo2, couponRepo2, walletRepo2 := setupUpdateTransactionMocks(ctrl2, 1, domain.Transaction{
			Id: 1, PaidAt: nil,
			TransactionItems: []domain.TransactionItem{
				{Id: 11, VariantId: 1, Amount: 1, Price: 30000, Subtotal: 15000, DiscountAmount: 15000, RentalId: &rentalId, Note: "2 hour(s)"},
			},
		})
		couponRepo2.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(coupon, nil)
		usecase2 := domain.NewTransactionUsecase(txRepo2, variantRepo2, couponRepo2, walletRepo2, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl2)), mock.NewMockKdsNotificationRepository(ctrl2), permissiveKdsNotificationDispatcher(ctrl2), permissivePaymentRepository(ctrl2), permissiveGuestNotificationRepository(ctrl2), permissiveGuestNotificationDispatcher(ctrl2), permissiveCartRepository(ctrl2))
		secondSave, err := usecase2.UpdateTransactionById(context.Background(), input, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(15000), secondSave.Total)
		assert.Equal(t, float32(15000), secondSave.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(15000), secondSave.TransactionItems[0].Subtotal)
	})

	t.Run("removing a rental item coupon restores the full price", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		rentalId := int64(103)
		txRepo, variantRepo, couponRepo, walletRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{
			Id: 1, PaidAt: nil,
			TransactionItems: []domain.TransactionItem{
				{Id: 13, VariantId: 1, Amount: 1, Price: 30000, Subtotal: 15000, DiscountAmount: 15000, RentalId: &rentalId, Note: "2 hour(s)"},
			},
		})

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 13, VariantId: 1, Amount: 1, DiscountAmount: 0, Note: "2 hour(s)"},
			},
			TransactionCoupons: []domain.TransactionCoupon{},
		}, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(30000), updated.Total)
		assert.Equal(t, float32(0), updated.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(30000), updated.TransactionItems[0].Subtotal)
		assert.Equal(t, &rentalId, updated.TransactionItems[0].RentalId)
		assert.Empty(t, updated.TransactionCoupons)
	})

	t.Run("FREE 2 HOUR on a 15K rental item clamps to the base (FR-4 #4)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		rentalId := int64(102)
		txRepo, variantRepo, couponRepo, walletRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{
			Id: 1, PaidAt: nil,
			TransactionItems: []domain.TransactionItem{
				{Id: 12, VariantId: 1, Amount: 1, Price: 15000, Subtotal: 15000, RentalId: &rentalId, Note: "1 hour(s)"},
			},
		})
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(51)).Return(domain.Coupon{Id: 51, Type: domain.Fixed, Amount: 30000}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 12, VariantId: 1, Amount: 1, DiscountAmount: 0, Note: "1 hour(s)"},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 51, TransactionItemId: int64Ptr(12)},
			},
		}, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(0), updated.Total)
		assert.Equal(t, float32(15000), updated.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(0), updated.TransactionItems[0].Subtotal)
	})

	t.Run("STUDENT DISCOUNT 40% on a 30K item (FR-4 #5)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo, variantRepo, couponRepo, walletRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{Id: 1, PaidAt: nil})
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, Price: 30000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(52)).Return(domain.Coupon{Id: 52, Type: domain.Percentage, Amount: 40}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(permissiveAvailabilityRepo(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 30, VariantId: 2, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 52, TransactionItemId: int64Ptr(30)},
			},
		}, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(18000), updated.Total)
		assert.Equal(t, float32(12000), updated.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(18000), updated.TransactionItems[0].Subtotal)
	})

	t.Run("multi-item: STUDENT on the middle ticket only discounts that ticket (FR-5)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo, variantRepo, couponRepo, walletRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{Id: 1, PaidAt: nil})
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 20000}, nil)
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(2)).Return(domain.Variant{Id: 2, Price: 30000}, nil)
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(3)).Return(domain.Variant{Id: 3, Price: 25000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(52)).Return(domain.Coupon{Id: 52, Type: domain.Percentage, Amount: 40}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(permissiveAvailabilityRepo(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 40, VariantId: 1, Amount: 1, DiscountAmount: 0},
				{Id: 41, VariantId: 2, Amount: 1, DiscountAmount: 0},
				{Id: 42, VariantId: 3, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 52, TransactionItemId: int64Ptr(41)},
			},
		}, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(63000), updated.Total)
		assert.Equal(t, float32(0), updated.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(20000), updated.TransactionItems[0].Subtotal)
		assert.Equal(t, float32(12000), updated.TransactionItems[1].DiscountAmount)
		assert.Equal(t, float32(18000), updated.TransactionItems[1].Subtotal)
		assert.Equal(t, float32(0), updated.TransactionItems[2].DiscountAmount)
		assert.Equal(t, float32(25000), updated.TransactionItems[2].Subtotal)
	})

	t.Run("whole-bill coupon still subtracts from Total", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo, variantRepo, couponRepo, walletRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{Id: 1, PaidAt: nil})
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 20000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(60)).Return(domain.Coupon{Id: 60, Type: domain.Fixed, Amount: 5000}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(permissiveAvailabilityRepo(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		updated, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 50, VariantId: 1, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 60},
			},
		}, 1)

		assert.Nil(t, err)
		assert.Equal(t, float32(15000), updated.Total)
		assert.Equal(t, []domain.TransactionCoupon{
			{CouponId: 60, Type: domain.Fixed, Amount: 5000, TransactionId: 1, TransactionItemId: nil},
		}, updated.TransactionCoupons)
	})

	t.Run("rejects more than one coupon on the same line (D4)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo, variantRepo, couponRepo, walletRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{Id: 1, PaidAt: nil})
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 30000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(domain.Coupon{Id: 50, Type: domain.Fixed, Amount: 15000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(60)).Return(domain.Coupon{Id: 60, Type: domain.Percentage, Amount: 40}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		_, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 60, VariantId: 1, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 50, TransactionItemId: int64Ptr(60)},
				{CouponId: 60, TransactionItemId: int64Ptr(60)},
			},
		}, 1)

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("rejects a coupon targeting an unknown transaction item", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo, variantRepo, couponRepo, walletRepo := setupUpdateTransactionMocks(ctrl, 1, domain.Transaction{Id: 1, PaidAt: nil})
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 30000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(domain.Coupon{Id: 50, Type: domain.Fixed, Amount: 15000}, nil)

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		_, err := usecase.UpdateTransactionById(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 70, VariantId: 1, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 50, TransactionItemId: int64Ptr(999)},
			},
		}, 1)

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})
}

func TestTransactionUsecase_CreateTransaction_ItemCoupon(t *testing.T) {
	t.Run("item-linked coupon discounts a single line on a new transaction", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		txRepo := mock.NewMockTransactionRepository(ctrl)
		variantRepo := mock.NewMockVariantRepository(ctrl)
		couponRepo := mock.NewMockCouponRepository(ctrl)
		walletRepo := mock.NewMockWalletRepository(ctrl)
		availabilityRepo := mock.NewMockAvailabilityReservationRepository(ctrl)

		txRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
		variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Price: 20000}, nil)
		couponRepo.EXPECT().GetCouponById(gomock.Any(), int64(50)).Return(domain.Coupon{Id: 50, Type: domain.Fixed, Amount: 15000}, nil)
		availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, IsAvailable: true, Product: domain.Product{IsAvailable: true}}, nil)
		txRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, tx domain.Transaction) (domain.Transaction, *domain.Error) {
				return tx, nil
			})

		usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(availabilityRepo), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
		created, err := usecase.CreateTransaction(context.Background(), domain.Transaction{
			TransactionItems: []domain.TransactionItem{
				{Id: 1, VariantId: 1, Amount: 1, DiscountAmount: 0},
			},
			TransactionCoupons: []domain.TransactionCoupon{
				{CouponId: 50, TransactionItemId: int64Ptr(1)},
			},
		})

		assert.Nil(t, err)
		assert.Equal(t, float32(5000), created.Total)
		assert.Equal(t, float32(15000), created.TransactionItems[0].DiscountAmount)
		assert.Equal(t, float32(5000), created.TransactionItems[0].Subtotal)
		assert.Equal(t, []domain.TransactionCoupon{
			{CouponId: 50, Type: domain.Fixed, Amount: 15000, TransactionId: 0, TransactionItemId: int64Ptr(1)},
		}, created.TransactionCoupons)
	})
}

func mustParseDate(t *testing.T, s string) *time.Time {
	t.Helper()
	parsed, err := time.Parse("2006-01-02", s)
	require.NoError(t, err)
	return &parsed
}

func TestTransactionUsecase_GetTransactionStatistics(t *testing.T) {
	tests := []struct {
		name          string
		groupBy       string
		startDate     func(t *testing.T) *time.Time
		endDate       func(t *testing.T) *time.Time
		setupMock     func(txRepo *mock.MockTransactionRepository)
		expectedLen   int
		expectedError *domain.Error
	}{
		{
			name:    "success",
			groupBy: "day",
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().GetTransactionStatistics(gomock.Any(), "day", (*time.Time)(nil), (*time.Time)(nil)).Return([]domain.TransactionStatistic{{Total: 100000}}, nil)
			},
			expectedLen: 1,
		},
		{
			name:    "repo error",
			groupBy: "day",
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().GetTransactionStatistics(gomock.Any(), "day", (*time.Time)(nil), (*time.Time)(nil)).Return(nil, &domain.Error{Type: domain.InternalServerError})
			},
			expectedError: &domain.Error{Type: domain.InternalServerError},
		},
		{
			name:      "both empty delegates unchanged",
			groupBy:   "",
			startDate: func(t *testing.T) *time.Time { return nil },
			endDate:   func(t *testing.T) *time.Time { return nil },
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().GetTransactionStatistics(gomock.Any(), "", (*time.Time)(nil), (*time.Time)(nil)).Return([]domain.TransactionStatistic{{Total: 100000}}, nil)
			},
			expectedLen: 1,
		},
		{
			name:      "valid range forwarded to repo",
			groupBy:   "date",
			startDate: func(t *testing.T) *time.Time { return mustParseDate(t, "2024-01-01") },
			endDate:   func(t *testing.T) *time.Time { return mustParseDate(t, "2024-01-31") },
			setupMock: func(txRepo *mock.MockTransactionRepository) {
				txRepo.EXPECT().GetTransactionStatistics(gomock.Any(), "date", mustParseDate(t, "2024-01-01"), mustParseDate(t, "2024-01-31")).Return([]domain.TransactionStatistic{{Total: 100000}}, nil)
			},
			expectedLen: 1,
		},
		{
			name:          "startDate after endDate returns bad request",
			groupBy:       "date",
			startDate:     func(t *testing.T) *time.Time { return mustParseDate(t, "2024-02-01") },
			endDate:       func(t *testing.T) *time.Time { return mustParseDate(t, "2024-01-01") },
			setupMock:     func(txRepo *mock.MockTransactionRepository) {},
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			txRepo := mock.NewMockTransactionRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			couponRepo := mock.NewMockCouponRepository(ctrl)
			walletRepo := mock.NewMockWalletRepository(ctrl)
			tt.setupMock(txRepo)

			var startDate, endDate *time.Time
			if tt.startDate != nil {
				startDate = tt.startDate(t)
			}
			if tt.endDate != nil {
				endDate = tt.endDate(t)
			}

			usecase := domain.NewTransactionUsecase(txRepo, variantRepo, couponRepo, walletRepo, domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)), mock.NewMockKdsNotificationRepository(ctrl), permissiveKdsNotificationDispatcher(ctrl), permissivePaymentRepository(ctrl), permissiveGuestNotificationRepository(ctrl), permissiveGuestNotificationDispatcher(ctrl), permissiveCartRepository(ctrl))
			result, err := usecase.GetTransactionStatistics(context.Background(), tt.groupBy, startDate, endDate)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Len(t, result, tt.expectedLen)
			}
		})
	}
}
