package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

const checkoutQrisExpirySeconds = 300

func withPaymentTransactionMock(r *mock.MockPaymentRepository) {
	r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
}

type paymentUsecaseMocks struct {
	paymentRepo     *mock.MockPaymentRepository
	gatewayRepo     *mock.MockPaymentGatewayRepository
	customerRepo    *mock.MockCustomerRepository
	cartRepo        *mock.MockCartRepository
	transactionRepo *mock.MockTransactionRepository
	variantRepo     *mock.MockVariantRepository
}

func newPaymentUsecaseMocks(ctrl *gomock.Controller) paymentUsecaseMocks {
	return paymentUsecaseMocks{
		paymentRepo:     mock.NewMockPaymentRepository(ctrl),
		gatewayRepo:     mock.NewMockPaymentGatewayRepository(ctrl),
		customerRepo:    mock.NewMockCustomerRepository(ctrl),
		cartRepo:        mock.NewMockCartRepository(ctrl),
		transactionRepo: mock.NewMockTransactionRepository(ctrl),
		variantRepo:     mock.NewMockVariantRepository(ctrl),
	}
}

func (m paymentUsecaseMocks) usecase() domain.PaymentUsecase {
	return domain.NewPaymentUsecase(m.paymentRepo, m.gatewayRepo, m.customerRepo, m.cartRepo, m.transactionRepo, m.variantRepo, checkoutQrisExpirySeconds)
}

// expectNameUpsert stubs the D17 name upsert (step 1) that every successful
// path through Checkout runs first, regardless of what happens afterwards.
func expectNameUpsert(m paymentUsecaseMocks, sessionId, name string) {
	m.customerRepo.EXPECT().GetCustomerBySessionId(gomock.Any(), sessionId).Return(domain.Customer{}, &domain.Error{Type: domain.NotFound})
	m.customerRepo.EXPECT().CreateCustomer(gomock.Any(), domain.Customer{SessionId: sessionId, Name: name}).
		Return(domain.Customer{Id: 1, SessionId: sessionId, Name: name}, nil)
}

func cartWithOneItem(cartId int64, tableId int64) domain.Cart {
	return domain.Cart{
		Id:      cartId,
		TableId: &tableId,
		Status:  domain.CartStatusActive,
		Items: []domain.CartItem{
			{Id: 1, CartId: cartId, VariantId: 10, Amount: 2, Note: "less sugar"},
		},
	}
}

func checkoutVariant(id int64, price float32) domain.Variant {
	return domain.Variant{
		Id:      id,
		Price:   price,
		Product: domain.Product{Id: 1, Name: "Kopi Susu"},
	}
}

func TestPaymentUsecase_Checkout(t *testing.T) {
	t.Run("an invalid customerName is rejected without touching the cart", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		// No CustomerRepository expectations: CustomerUsecase.UpsertCustomerName
		// rejects a whitespace-only name before it ever reads the repository.

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "   ")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("no cart at all is treated the same as an empty cart", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectNameUpsert(m, "session-1", "Budi")
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "cart is empty", err.Message)
	})

	t.Run("a cart with zero items is rejected", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectNameUpsert(m, "session-1", "Budi")
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive, Items: []domain.CartItem{}}, nil)

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "cart is empty", err.Message)
	})

	t.Run("a cart with no table attached is rejected", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectNameUpsert(m, "session-1", "Budi")
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive, Items: []domain.CartItem{{Id: 1, VariantId: 10, Amount: 1}}}, nil)

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "table is not set", err.Message)
	})

	t.Run("a cart-read failure that is not NotFound is surfaced as-is", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectNameUpsert(m, "session-1", "Budi")
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{}, &domain.Error{Type: domain.InternalServerError})

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

		assert.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})

	t.Run("a pending, unexpired payment on the cart is returned rather than minting a second QR", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectNameUpsert(m, "session-1", "Budi Santoso")
		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)

		transactionId := int64(99)
		existingPayment := domain.Payment{
			Id: 7, CartId: 1, SessionId: "session-1", TransactionId: &transactionId,
			PartnerReferenceNo: "ORD1234567890AB", Status: domain.PaymentStatePending,
			Amount: 30000, ExpiredAt: time.Now().Add(2 * time.Minute), QrContent: "existing-qr",
		}
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(existingPayment, nil)

		existingTransaction := domain.Transaction{Id: transactionId, Name: "Budi", Source: domain.TransactionSourceOrder}
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).Return(existingTransaction, nil)

		payment, transaction, err := m.usecase().Checkout(context.Background(), "session-1", "Budi Santoso")

		assert.Nil(t, err)
		assert.Equal(t, existingPayment, payment)
		assert.Equal(t, existingTransaction, transaction)
	})

	t.Run("an expired pending payment is not reused — a fresh checkout mints a new QR", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectNameUpsert(m, "session-1", "Budi")
		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)

		staleTransactionId := int64(50)
		stalePayment := domain.Payment{
			Id: 6, CartId: 1, TransactionId: &staleTransactionId,
			Status: domain.PaymentStatePending, ExpiredAt: time.Now().Add(-1 * time.Minute),
		}
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(stalePayment, nil)

		variant := checkoutVariant(10, 15000)
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(variant, nil)

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				transaction.Id = 200
				return transaction, nil
			})

		m.paymentRepo.EXPECT().CreatePayment(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, payment domain.Payment) (domain.Payment, *domain.Error) {
				payment.Id = 300
				return payment, nil
			})

		m.gatewayRepo.EXPECT().GenerateQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisPayment{GatewayReferenceNo: "gw-1", QrContent: "qr-content"}, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(300)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return payment, nil
			})

		payment, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

		assert.Nil(t, err)
		assert.Equal(t, "qr-content", payment.QrContent)
		assert.NotEqual(t, stalePayment.Id, payment.Id)
	})

	t.Run("prices and snapshots each item from the current variant, and orderNumber stays 0", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectNameUpsert(m, "session-1", "Budi")

		cart := domain.Cart{
			Id: 1, TableId: int64Ptr(5), Status: domain.CartStatusActive,
			Items: []domain.CartItem{
				{Id: 1, CartId: 1, VariantId: 10, Amount: 2, Note: "less sugar"},
				{Id: 2, CartId: 1, VariantId: 11, Amount: 1, Note: ""},
			},
		}
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(11)).Return(checkoutVariant(11, 8000), nil)

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				assert.Equal(t, domain.TransactionSourceOrder, transaction.Source)
				assert.Equal(t, int64(1), *transaction.CartId)
				assert.Equal(t, int64(0), transaction.OrderNumber)
				assert.Equal(t, []domain.TransactionCoupon{}, transaction.TransactionCoupons)
				assert.Equal(t, float32(38000), transaction.Total) // 2*15000 + 1*8000
				assert.Len(t, transaction.TransactionItems, 2)
				assert.Equal(t, float32(15000), transaction.TransactionItems[0].Price)
				assert.Equal(t, float32(30000), transaction.TransactionItems[0].Subtotal)
				assert.Equal(t, "Kopi Susu", transaction.TransactionItems[0].ProductName)
				assert.Equal(t, float32(0), transaction.TransactionItems[0].DiscountAmount)
				transaction.Id = 200
				return transaction, nil
			})

		m.paymentRepo.EXPECT().CreatePayment(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, payment domain.Payment) (domain.Payment, *domain.Error) {
				assert.True(t, strings.HasPrefix(payment.PartnerReferenceNo, "ORD"))
				assert.Equal(t, domain.PaymentMethodQris, payment.Method)
				assert.Equal(t, domain.PaymentStatePending, payment.Status)
				assert.Equal(t, float32(38000), payment.Amount)
				payment.Id = 300
				return payment, nil
			})

		m.gatewayRepo.EXPECT().GenerateQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisPayment{GatewayReferenceNo: "gw-1", QrContent: "qr-content"}, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(300)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return payment, nil
			})

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")
		assert.Nil(t, err)
	})

	t.Run("the transaction is named after the trimmed name, not the raw input", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				assert.Equal(t, "Budi", transaction.Name)
				transaction.Id = 200
				return transaction, nil
			})
		m.paymentRepo.EXPECT().CreatePayment(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, payment domain.Payment) (domain.Payment, *domain.Error) {
				payment.Id = 300
				return payment, nil
			})
		m.gatewayRepo.EXPECT().GenerateQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisPayment{GatewayReferenceNo: "gw-1", QrContent: "qr-content"}, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(300)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return payment, nil
			})

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "  Budi  ")
		assert.Nil(t, err)
	})

	t.Run("a gateway failure rolls back — nothing is updated with a QR", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				transaction.Id = 200
				return transaction, nil
			})
		m.paymentRepo.EXPECT().CreatePayment(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, payment domain.Payment) (domain.Payment, *domain.Error) {
				payment.Id = 300
				return payment, nil
			})

		m.gatewayRepo.EXPECT().GenerateQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisPayment{}, &domain.Error{Type: domain.InternalServerError, Message: "DOKU is unreachable"})
		// UpdatePaymentById is deliberately not stubbed: a gateway failure
		// must never reach it.

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadGateway, err.Type)
	})
}
