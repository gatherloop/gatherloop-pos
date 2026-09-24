package domain_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

const checkoutQrisExpirySeconds = 300
const checkoutCashExpirySeconds = 600
const checkoutOrderPaymentWalletId = 9

func withPaymentTransactionMock(r *mock.MockPaymentRepository) {
	r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
}

type paymentUsecaseMocks struct {
	paymentRepo               *mock.MockPaymentRepository
	gatewayRepo               *mock.MockPaymentGatewayRepository
	customerRepo              *mock.MockCustomerRepository
	cartRepo                  *mock.MockCartRepository
	transactionRepo           *mock.MockTransactionRepository
	variantRepo               *mock.MockVariantRepository
	walletRepo                *mock.MockWalletRepository
	availabilityRepo          *mock.MockAvailabilityReservationRepository
	kdsNotificationRepo       *mock.MockKdsNotificationRepository
	kdsNotificationDispatcher *mock.MockKdsNotificationDispatcher
}

func newPaymentUsecaseMocks(ctrl *gomock.Controller) paymentUsecaseMocks {
	kdsNotificationDispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
	kdsNotificationDispatcher.EXPECT().TriggerDispatch().AnyTimes()

	return paymentUsecaseMocks{
		paymentRepo:               mock.NewMockPaymentRepository(ctrl),
		gatewayRepo:               mock.NewMockPaymentGatewayRepository(ctrl),
		customerRepo:              mock.NewMockCustomerRepository(ctrl),
		cartRepo:                  mock.NewMockCartRepository(ctrl),
		transactionRepo:           mock.NewMockTransactionRepository(ctrl),
		variantRepo:               mock.NewMockVariantRepository(ctrl),
		walletRepo:                mock.NewMockWalletRepository(ctrl),
		availabilityRepo:          mock.NewMockAvailabilityReservationRepository(ctrl),
		kdsNotificationRepo:       mock.NewMockKdsNotificationRepository(ctrl),
		kdsNotificationDispatcher: kdsNotificationDispatcher,
	}
}

func (m paymentUsecaseMocks) usecase() domain.PaymentUsecase {
	return m.usecaseWithDispatcher(m.kdsNotificationDispatcher)
}

// usecaseWithDispatcher builds the usecase over a caller-supplied dispatcher instead of the
// permissive default, for the tests that assert on the FR-4 post-commit dispatch trigger itself.
func (m paymentUsecaseMocks) usecaseWithDispatcher(dispatcher domain.KdsNotificationDispatcher) domain.PaymentUsecase {
	return m.usecaseWithDispatcherAndCancelEnabled(dispatcher, false)
}

// usecaseWithCancelEnabled builds the usecase with ORDER_PAYMENT_CANCEL_ENABLED on, for
// CancelPayment's and CanCancel's own tests (D11).
func (m paymentUsecaseMocks) usecaseWithCancelEnabled() domain.PaymentUsecase {
	return m.usecaseWithDispatcherAndCancelEnabled(m.kdsNotificationDispatcher, true)
}

func (m paymentUsecaseMocks) usecaseWithDispatcherAndCancelEnabled(dispatcher domain.KdsNotificationDispatcher, orderPaymentCancelEnabled bool) domain.PaymentUsecase {
	availabilityReservation := domain.NewAvailabilityReservation(m.availabilityRepo)
	return domain.NewPaymentUsecase(m.paymentRepo, m.gatewayRepo, m.customerRepo, m.cartRepo, m.transactionRepo, m.variantRepo, m.walletRepo, availabilityReservation, m.kdsNotificationRepo, dispatcher, checkoutQrisExpirySeconds, checkoutCashExpirySeconds, checkoutOrderPaymentWalletId, orderPaymentCancelEnabled)
}

func expectAvailableVariant(m paymentUsecaseMocks, variantId int64) {
	m.availabilityRepo.EXPECT().LockVariantById(gomock.Any(), variantId).Return(domain.Variant{
		Id: variantId, IsAvailable: true,
		Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingNone},
	}, nil)
}

func expectValidWallet(m paymentUsecaseMocks) {
	m.walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(checkoutOrderPaymentWalletId)).
		Return(domain.Wallet{Id: checkoutOrderPaymentWalletId, Name: "QRIS", IsPaymentTarget: true}, nil)
}

func expectNameUpsert(m paymentUsecaseMocks, sessionId, name string) {
	m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), sessionId, name, nil).
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
	t.Run("a misconfigured order payment wallet is rejected before touching the cart", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		m.walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(checkoutOrderPaymentWalletId)).
			Return(domain.Wallet{}, &domain.Error{Type: domain.NotFound})

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})

	t.Run("an order payment wallet that is not a payment target is rejected", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		m.walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(checkoutOrderPaymentWalletId)).
			Return(domain.Wallet{Id: checkoutOrderPaymentWalletId, Name: "Cash", IsPaymentTarget: false}, nil)

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})

	t.Run("an invalid customerName is rejected without touching the cart", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "   ", "", domain.PaymentMethodQris, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("an invalid customerWhatsappNumber is a 400 and nothing is written", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "12345", domain.PaymentMethodQris, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("a valid customerWhatsappNumber is normalized and snapshotted onto both the customer and the payment", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)

		m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), "session-1", "Budi", gomock.Not(gomock.Nil())).
			DoAndReturn(func(_ context.Context, sessionId, name string, whatsappNumber *string) (domain.Customer, *domain.Error) {
				assert.Equal(t, "6281234567890", *whatsappNumber)
				return domain.Customer{Id: 1, SessionId: sessionId, Name: name, WhatsappNumber: whatsappNumber}, nil
			})

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)
		expectAvailableVariant(m, 10)

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				transaction.Id = 200
				return transaction, nil
			})
		m.paymentRepo.EXPECT().CreatePayment(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, payment domain.Payment) (domain.Payment, *domain.Error) {
				require.NotNil(t, payment.CustomerWhatsappNumber)
				assert.Equal(t, "6281234567890", *payment.CustomerWhatsappNumber)
				payment.Id = 300
				return payment, nil
			})
		m.gatewayRepo.EXPECT().GenerateQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisPayment{GatewayReferenceNo: "gw-1", QrContent: "qr-content"}, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(300)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return payment, nil
			})

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "0812-3456-7890", domain.PaymentMethodQris, "")

		assert.Nil(t, err)
	})

	t.Run("an absent customerWhatsappNumber leaves the customer's stored number unchanged and the payment null", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)
		expectAvailableVariant(m, 10)

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				transaction.Id = 200
				return transaction, nil
			})
		m.paymentRepo.EXPECT().CreatePayment(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, payment domain.Payment) (domain.Payment, *domain.Error) {
				assert.Nil(t, payment.CustomerWhatsappNumber)
				payment.Id = 300
				return payment, nil
			})
		m.gatewayRepo.EXPECT().GenerateQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisPayment{GatewayReferenceNo: "gw-1", QrContent: "qr-content"}, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(300)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return payment, nil
			})

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.Nil(t, err)
	})

	t.Run("no cart at all is treated the same as an empty cart", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "cart is empty", err.Message)
	})

	t.Run("a cart with zero items is rejected", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive, Items: []domain.CartItem{}}, nil)

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "cart is empty", err.Message)
	})

	t.Run("a cart with no table attached is rejected", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive, Items: []domain.CartItem{{Id: 1, VariantId: 10, Amount: 1}}}, nil)

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "table is not set", err.Message)
	})

	t.Run("a cart-read failure that is not NotFound is surfaced as-is", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(domain.Cart{}, &domain.Error{Type: domain.InternalServerError})

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})

	t.Run("a pending, unexpired payment on the cart is returned rather than minting a second QR", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
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

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(7)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return payment, nil
			})

		payment, transaction, err := m.usecase().Checkout(context.Background(), "session-1", "Budi Santoso", "", domain.PaymentMethodQris, "")

		assert.Nil(t, err)
		assert.Equal(t, existingPayment, payment)
		assert.Equal(t, existingTransaction, transaction)
	})

	t.Run("a pending payment on the cart is returned whatever method the new request asks for", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi Santoso")
		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)

		transactionId := int64(99)
		existingPayment := domain.Payment{
			Id: 7, CartId: 1, SessionId: "session-1", TransactionId: &transactionId,
			PartnerReferenceNo: "ORD1234567890AB", Method: domain.PaymentMethodQris, Status: domain.PaymentStatePending,
			Amount: 30000, ExpiredAt: time.Now().Add(2 * time.Minute), QrContent: "existing-qr",
		}
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(existingPayment, nil)

		existingTransaction := domain.Transaction{Id: transactionId, Name: "Budi", Source: domain.TransactionSourceOrder}
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).Return(existingTransaction, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(7)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return payment, nil
			})

		payment, transaction, err := m.usecase().Checkout(context.Background(), "session-1", "Budi Santoso", "", domain.PaymentMethodCash, "")

		assert.Nil(t, err)
		assert.Equal(t, existingPayment, payment)
		assert.Equal(t, existingTransaction, transaction)
	})

	t.Run("a reused pending payment's snapshot picks up the number just submitted", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)

		m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), "session-1", "Budi Santoso", gomock.Not(gomock.Nil())).
			DoAndReturn(func(_ context.Context, sessionId, name string, whatsappNumber *string) (domain.Customer, *domain.Error) {
				return domain.Customer{Id: 1, SessionId: sessionId, Name: name, WhatsappNumber: whatsappNumber}, nil
			})

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)

		transactionId := int64(99)
		oldNumber := "6281111111111"
		existingPayment := domain.Payment{
			Id: 7, CartId: 1, SessionId: "session-1", TransactionId: &transactionId,
			CustomerWhatsappNumber: &oldNumber,
			PartnerReferenceNo:     "ORD1234567890AB", Status: domain.PaymentStatePending,
			Amount: 30000, ExpiredAt: time.Now().Add(2 * time.Minute), QrContent: "existing-qr",
		}
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(existingPayment, nil)

		existingTransaction := domain.Transaction{Id: transactionId, Name: "Budi", Source: domain.TransactionSourceOrder}
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).Return(existingTransaction, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(7)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				require.NotNil(t, payment.CustomerWhatsappNumber)
				assert.Equal(t, "6282222222222", *payment.CustomerWhatsappNumber)
				return payment, nil
			})

		payment, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi Santoso", "0822-2222-2222", domain.PaymentMethodQris, "")

		assert.Nil(t, err)
		require.NotNil(t, payment.CustomerWhatsappNumber)
		assert.Equal(t, "6282222222222", *payment.CustomerWhatsappNumber)
	})

	t.Run("an expired pending payment is not reused — a fresh checkout mints a new QR", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
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
		expectAvailableVariant(m, 10)

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

		payment, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.Nil(t, err)
		assert.Equal(t, "qr-content", payment.QrContent)
		assert.NotEqual(t, stalePayment.Id, payment.Id)
	})

	t.Run("prices and snapshots each item from the current variant, and pagerNumber stays 0", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
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
		expectAvailableVariant(m, 10)
		expectAvailableVariant(m, 11)

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				assert.Equal(t, domain.TransactionSourceOrder, transaction.Source)
				assert.Equal(t, int64(1), *transaction.CartId)
				assert.Equal(t, int64(0), transaction.PagerNumber)
				assert.Equal(t, []domain.TransactionCoupon{}, transaction.TransactionCoupons)
				assert.Equal(t, float32(38000), transaction.Total)
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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")
		assert.Nil(t, err)
	})

	t.Run("the transaction is named after the trimmed name, not the raw input", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)
		expectAvailableVariant(m, 10)

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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "  Budi  ", "", domain.PaymentMethodQris, "")
		assert.Nil(t, err)
	})

	t.Run("a gateway failure rolls back — nothing is updated with a QR", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)
		expectAvailableVariant(m, 10)

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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadGateway, err.Type)
	})

	t.Run("reserves availability for the transaction it creates, decrementing a tracked variant", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)

		m.availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(10)).Return(domain.Variant{
			Id: 10, IsAvailable: true, AvailableQuantity: intPtr(6),
			Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
		}, nil)
		m.availabilityRepo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(10), 4).Return(nil)
		m.availabilityRepo.EXPECT().CreateAvailabilityMovement(gomock.Any(), gomock.Any()).Return(nil)

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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.Nil(t, err)
	})

	t.Run("a checkout is rejected when the cart's last item sold out in between, and nothing is created", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)

		m.availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(10)).Return(domain.Variant{
			Id: 10, Name: "Vanilla", IsAvailable: false,
			Product: domain.Product{Name: "Kopi Susu", IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingNone},
		}, nil)

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "Kopi Susu Vanilla is sold out", err.Message)
	})

	t.Run("a cash checkout mints an unpaid transaction and a pending cash payment without ever calling the gateway", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)
		expectAvailableVariant(m, 10)

		beforeCheckout := time.Now()

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				assert.Equal(t, domain.TransactionSourceOrder, transaction.Source)
				transaction.Id = 200
				return transaction, nil
			})

		m.paymentRepo.EXPECT().CreatePayment(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, payment domain.Payment) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentMethodCash, payment.Method)
				assert.Equal(t, domain.PaymentStatePending, payment.Status)
				assert.Equal(t, "", payment.QrContent)
				assert.Equal(t, "", payment.GatewayReferenceNo)
				assert.WithinDuration(t, beforeCheckout.Add(checkoutCashExpirySeconds*time.Second), payment.ExpiredAt, time.Second)
				payment.Id = 300
				return payment, nil
			})

		m.gatewayRepo.EXPECT().GenerateQris(gomock.Any(), gomock.Any()).Times(0)

		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindCashPending).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction, _ domain.KdsNotificationKind) *domain.Error {
				assert.Equal(t, int64(200), transaction.Id)
				return nil
			})

		payment, transaction, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodCash, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentMethodCash, payment.Method)
		assert.Equal(t, domain.PaymentStatePending, payment.Status)
		assert.Equal(t, "", payment.QrContent)
		assert.Nil(t, transaction.PaidAt)
	})

	t.Run("a cash checkout triggers a kds dispatch after its commit", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)
		expectAvailableVariant(m, 10)

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
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindCashPending).Return(nil)

		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
		dispatcher.EXPECT().TriggerDispatch().Times(1)

		_, _, err := m.usecaseWithDispatcher(dispatcher).Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodCash, "")

		assert.Nil(t, err)
	})

	t.Run("a qris checkout never writes a kds notification at checkout, and never triggers a dispatch", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)
		expectAvailableVariant(m, 10)

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
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
		dispatcher.EXPECT().TriggerDispatch().Times(0)

		_, _, err := m.usecaseWithDispatcher(dispatcher).Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "")

		assert.Nil(t, err)
	})

	t.Run("an invalid diningOption is a 400 and nothing is written", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, "delivery")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("a takeaway checkout creates a takeaway transaction", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
		expectNameUpsert(m, "session-1", "Budi")

		cart := cartWithOneItem(1, 5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), "session-1").Return(cart, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(checkoutVariant(10, 15000), nil)
		expectAvailableVariant(m, 10)

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				assert.Equal(t, domain.DiningOptionTakeaway, transaction.DiningOption)
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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi", "", domain.PaymentMethodQris, domain.DiningOptionTakeaway)

		assert.Nil(t, err)
	})

	// D8: a guest who backs out and switches dining option must be heard on the reused
	// transaction, the same way FR-3 already heard a corrected WhatsApp number.
	t.Run("retrying a pending checkout with a different diningOption updates the reused transaction", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
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

		existingTransaction := domain.Transaction{Id: transactionId, Name: "Budi", Source: domain.TransactionSourceOrder, DiningOption: domain.DiningOptionDineIn}
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).Return(existingTransaction, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(7)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return payment, nil
			})
		m.transactionRepo.EXPECT().UpdateTransactionDiningOptionById(gomock.Any(), transactionId, domain.DiningOptionTakeaway).Return(nil)

		_, transaction, err := m.usecase().Checkout(context.Background(), "session-1", "Budi Santoso", "", domain.PaymentMethodQris, domain.DiningOptionTakeaway)

		assert.Nil(t, err)
		assert.Equal(t, domain.DiningOptionTakeaway, transaction.DiningOption)
	})

	t.Run("retrying a pending checkout with the same diningOption writes nothing new", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
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

		existingTransaction := domain.Transaction{Id: transactionId, Name: "Budi", Source: domain.TransactionSourceOrder, DiningOption: domain.DiningOptionTakeaway}
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).Return(existingTransaction, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(7)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return payment, nil
			})
		m.transactionRepo.EXPECT().UpdateTransactionDiningOptionById(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		_, transaction, err := m.usecase().Checkout(context.Background(), "session-1", "Budi Santoso", "", domain.PaymentMethodQris, domain.DiningOptionTakeaway)

		assert.Nil(t, err)
		assert.Equal(t, domain.DiningOptionTakeaway, transaction.DiningOption)
	})

	// D8: an old client that never sends diningOption can't clobber an earlier takeaway choice.
	t.Run("retrying a pending checkout with an absent diningOption leaves the reused transaction unchanged", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
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

		existingTransaction := domain.Transaction{Id: transactionId, Name: "Budi", Source: domain.TransactionSourceOrder, DiningOption: domain.DiningOptionTakeaway}
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).Return(existingTransaction, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(7)).
			DoAndReturn(func(_ context.Context, payment domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return payment, nil
			})
		m.transactionRepo.EXPECT().UpdateTransactionDiningOptionById(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		_, transaction, err := m.usecase().Checkout(context.Background(), "session-1", "Budi Santoso", "", domain.PaymentMethodQris, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.DiningOptionTakeaway, transaction.DiningOption)
	})
}

func pendingPaymentFixture() domain.Payment {
	transactionId := int64(99)
	return domain.Payment{
		Id: 7, CartId: 1, SessionId: "session-1", TransactionId: &transactionId,
		PartnerReferenceNo: "ORD1234567890AB", GatewayReferenceNo: "gw-old",
		Method: domain.PaymentMethodQris, Status: domain.PaymentStatePending,
		Amount: 30000, ExpiredAt: time.Now().Add(2 * time.Minute),
	}
}

func pendingCashPaymentFixture() domain.Payment {
	payment := pendingPaymentFixture()
	payment.Method = domain.PaymentMethodCash
	payment.GatewayReferenceNo = ""
	payment.QrContent = ""
	return payment
}

// expectNoSupersede satisfies D7's supersedeLivePayments check for a test where the cart has no
// other pending payment to finalise as cancelled/superseded.
func expectNoSupersede(m paymentUsecaseMocks, cartId int64) {
	m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), cartId).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
}

func expectConfirmPaymentWalletCredit(m paymentUsecaseMocks) {
	expectConfirmPaymentWalletCreditWithoutKdsEnqueue(m)
	m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil)
}

// expectConfirmPaymentWalletCreditWithoutKdsEnqueue lets a test supply its own
// EnqueueForTransaction expectation, to assert on the transaction the outbox actually received.
func expectConfirmPaymentWalletCreditWithoutKdsEnqueue(m paymentUsecaseMocks) {
	m.walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(checkoutOrderPaymentWalletId)).
		Return(domain.Wallet{Id: checkoutOrderPaymentWalletId, Name: "QRIS", Balance: 100000, PaymentCostPercentage: 1, IsPaymentTarget: true}, nil)
	m.walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(checkoutOrderPaymentWalletId)).
		Return(domain.Wallet{}, nil)
	m.transactionRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(99)).
		Return(domain.Transaction{}, nil)
	m.transactionRepo.EXPECT().PayTransaction(gomock.Any(), int64(checkoutOrderPaymentWalletId), gomock.Any(), float32(30000), int64(99)).
		Return(nil)
}

func TestPaymentUsecase_ConfirmPayment(t *testing.T) {
	t.Run("a valid paid notification pays the transaction, converts the cart and credits the wallet", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		status := domain.QrisStatus{
			PartnerReferenceNo: payment.PartnerReferenceNo,
			GatewayReferenceNo: "gw-new",
			Status:             domain.PaymentGatewayStatusPaid,
			PaidAmount:         payment.Amount,
			RawStatusCode:      "00",
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount}, nil)

		expectConfirmPaymentWalletCredit(m)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, p.Status)
				assert.Equal(t, "gw-new", p.GatewayReferenceNo)
				assert.NotNil(t, p.PaidAt)
				return p, nil
			})

		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive, TableId: int64Ptr(5)}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) {
				assert.Equal(t, domain.CartStatusConverted, cart.Status)
				assert.Equal(t, int64(5), *cart.TableId)
				return cart, nil
			})

		expectNoSupersede(m, 1)

		updatedPayment, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomePaid, outcome)
		assert.Equal(t, domain.PaymentStatePaid, updatedPayment.Status)
	})

	t.Run("a mixed bar-and-kitchen transaction is still forwarded to the outbox exactly once (D24)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		status := domain.QrisStatus{
			PartnerReferenceNo: payment.PartnerReferenceNo,
			GatewayReferenceNo: "gw-new",
			Status:             domain.PaymentGatewayStatusPaid,
			PaidAmount:         payment.Amount,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{
				Id: 99, Total: payment.Amount, CreatedAt: time.Now(),
				TransactionItems: []domain.TransactionItem{
					{Amount: 2, ProductName: "Kopi Susu Gula Aren", Variant: domain.Variant{Product: domain.Product{Category: domain.Category{Station: "BAR"}}}},
					{Amount: 1, ProductName: "Sandwich", Variant: domain.Variant{Product: domain.Product{Category: domain.Category{Station: "KITCHEN"}}}},
				},
			}, nil)

		expectConfirmPaymentWalletCreditWithoutKdsEnqueue(m)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Times(1).DoAndReturn(
			func(_ context.Context, transaction domain.Transaction, _ domain.KdsNotificationKind) *domain.Error {
				assert.True(t, domain.ShouldNotify(transaction))
				assert.Len(t, domain.StationLines(transaction), 2)
				return nil
			})

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		expectNoSupersede(m, 1)

		_, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomePaid, outcome)
	})

	t.Run("a board-game-ticket-only transaction is still forwarded to the outbox, which would not notify (D3)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		status := domain.QrisStatus{
			PartnerReferenceNo: payment.PartnerReferenceNo,
			GatewayReferenceNo: "gw-new",
			Status:             domain.PaymentGatewayStatusPaid,
			PaidAmount:         payment.Amount,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{
				Id: 99, Total: payment.Amount, CreatedAt: time.Now(),
				TransactionItems: []domain.TransactionItem{
					{Amount: 1, ProductName: "Board Game Ticket", Variant: domain.Variant{Product: domain.Product{Category: domain.Category{Station: "NONE"}}}},
				},
			}, nil)

		expectConfirmPaymentWalletCreditWithoutKdsEnqueue(m)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).DoAndReturn(
			func(_ context.Context, transaction domain.Transaction, _ domain.KdsNotificationKind) *domain.Error {
				assert.False(t, domain.ShouldNotify(transaction))
				return nil
			})

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		expectNoSupersede(m, 1)

		_, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomePaid, outcome)
	})

	t.Run("a duplicate notification for an already-paid payment is a no-op", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.Status = domain.PaymentStatePaid
		paidAt := time.Now()
		payment.PaidAt = &paidAt

		status := domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		result, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomeAlreadyPaid, outcome)
		assert.Equal(t, payment, result)
	})

	t.Run("an unknown reference is a no-op that does not error", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		status := domain.QrisStatus{PartnerReferenceNo: "ORDUNKNOWN000AB", Status: domain.PaymentGatewayStatusPaid, PaidAmount: 30000}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), "ORDUNKNOWN000AB").
			Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		_, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomeUnknownReference, outcome)
	})

	t.Run("an amount mismatch pays nothing and leaves the payment untouched", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		status := domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPaid, PaidAmount: 10000}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		result, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomeAmountMismatch, outcome)
		assert.Equal(t, payment, result)
	})

	t.Run("an expired-then-paid payment un-deletes the transaction and pays it", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.Status = domain.PaymentStateExpired

		status := domain.QrisStatus{
			PartnerReferenceNo: payment.PartnerReferenceNo,
			GatewayReferenceNo: "gw-late",
			Status:             domain.PaymentGatewayStatusPaid,
			PaidAmount:         payment.Amount,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		deletedAt := time.Now().Add(-time.Minute)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount, DeletedAt: &deletedAt}, nil)
		m.transactionRepo.EXPECT().UndeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		expectConfirmPaymentWalletCredit(m)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return p, nil
			})
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		expectNoSupersede(m, 1)

		_, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomePaidLate, outcome)
	})

	// FR-5/D7: a payment the guest cancelled can still be paid late from a saved QR, exactly like
	// an expired one — the guest's cancel must never orphan money DOKU actually received.
	t.Run("a cancelled-then-paid payment un-deletes the transaction and pays it", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.Status = domain.PaymentStateCancelled
		cancelledAt := time.Now().Add(-time.Minute)
		payment.CancelledAt = &cancelledAt
		guestReason := domain.PaymentCancelReasonGuest
		payment.CancelReason = &guestReason

		status := domain.QrisStatus{
			PartnerReferenceNo: payment.PartnerReferenceNo,
			GatewayReferenceNo: "gw-late",
			Status:             domain.PaymentGatewayStatusPaid,
			PaidAmount:         payment.Amount,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		deletedAt := time.Now().Add(-time.Minute)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount, DeletedAt: &deletedAt}, nil)
		m.transactionRepo.EXPECT().UndeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		expectConfirmPaymentWalletCredit(m)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, p.Status)
				return p, nil
			})
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		expectNoSupersede(m, 1)

		_, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomePaidLate, outcome)
	})

	// FR-5/D7: the guest may have checked out again on the same cart before the late webhook
	// arrived. That newer pending payment must be finalised as cancelled/superseded so the cart
	// never ends up with two paid orders.
	t.Run("a paid-late payment on a cart with a newer pending payment supersedes it", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.Status = domain.PaymentStateExpired

		status := domain.QrisStatus{
			PartnerReferenceNo: payment.PartnerReferenceNo,
			GatewayReferenceNo: "gw-late",
			Status:             domain.PaymentGatewayStatusPaid,
			PaidAmount:         payment.Amount,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		deletedAt := time.Now().Add(-time.Minute)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount, DeletedAt: &deletedAt}, nil)
		m.transactionRepo.EXPECT().UndeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		expectConfirmPaymentWalletCredit(m)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, p.Status)
				return p, nil
			})
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })

		newerCashTransactionId := int64(200)
		newerCashPayment := domain.Payment{
			Id: 42, CartId: 1, Method: domain.PaymentMethodCash, Status: domain.PaymentStatePending,
			TransactionId: &newerCashTransactionId, PartnerReferenceNo: "ORD99999999999Z",
			ExpiredAt: time.Now().Add(5 * time.Minute),
		}
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(newerCashPayment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), newerCashPayment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateCancelled, p.Status)
				assert.NotNil(t, p.CancelledAt)
				require.NotNil(t, p.CancelReason)
				assert.Equal(t, domain.PaymentCancelReasonSuperseded, *p.CancelReason)
				return p, nil
			})
		// No TransactionItems on the superseded transaction, so Release (AvailabilityReservation)
		// makes no repository calls — nothing to mock there.
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), newerCashTransactionId).
			Return(domain.Transaction{Id: newerCashTransactionId}, nil)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), newerCashTransactionId).Return(nil)
		// FR-7/D16: the superseded payment is cash, so it also gets the KDS retraction.
		m.kdsNotificationRepo.EXPECT().HasNotificationForTransaction(gomock.Any(), newerCashTransactionId, domain.KdsNotificationKindCashPending).Return(true, nil)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindCashCancelled).Return(nil)

		_, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomePaidLate, outcome)
	})

	t.Run("a paid-late payment re-reserves its items, allowed to go negative", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.Status = domain.PaymentStateExpired

		status := domain.QrisStatus{
			PartnerReferenceNo: payment.PartnerReferenceNo,
			GatewayReferenceNo: "gw-late",
			Status:             domain.PaymentGatewayStatusPaid,
			PaidAmount:         payment.Amount,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		deletedAt := time.Now().Add(-time.Minute)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{
			Id: 99, Total: payment.Amount, DeletedAt: &deletedAt,
			TransactionItems: []domain.TransactionItem{{VariantId: 10, Amount: 3}},
		}, nil)
		m.transactionRepo.EXPECT().UndeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		m.availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(10)).Return(domain.Variant{
			Id: 10, IsAvailable: true, AvailableQuantity: intPtr(1),
			Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
		}, nil)
		m.availabilityRepo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(10), -2).Return(nil)
		m.availabilityRepo.EXPECT().CreateAvailabilityMovement(gomock.Any(), gomock.Any()).Return(nil)

		expectConfirmPaymentWalletCredit(m)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return p, nil
			})
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		expectNoSupersede(m, 1)

		_, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomePaidLate, outcome)
	})

	t.Run("an expired or failed notification for a pending payment soft-deletes its transaction and leaves the cart alone", func(t *testing.T) {
		tests := []struct {
			gatewayStatus   domain.PaymentGatewayStatus
			expectedOutcome domain.ConfirmPaymentOutcome
			expectedState   domain.PaymentState
		}{
			{domain.PaymentGatewayStatusExpired, domain.ConfirmPaymentOutcomeExpired, domain.PaymentStateExpired},
			{domain.PaymentGatewayStatusFailed, domain.ConfirmPaymentOutcomeFailed, domain.PaymentStateFailed},
		}

		for _, tt := range tests {
			t.Run(string(tt.gatewayStatus), func(t *testing.T) {
				ctrl := gomock.NewController(t)
				defer ctrl.Finish()

				m := newPaymentUsecaseMocks(ctrl)
				withPaymentTransactionMock(m.paymentRepo)

				payment := pendingPaymentFixture()
				status := domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: tt.gatewayStatus}
				m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

				m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
					DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
						assert.Equal(t, tt.expectedState, p.Status)
						return p, nil
					})
				m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)
				m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

				_, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

				assert.Nil(t, err)
				assert.Equal(t, tt.expectedOutcome, outcome)
			})
		}
	})

	t.Run("an expiry releases the transaction's items, restoring a tracked variant's counter", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		status := domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusExpired}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{
			Id: 99, TransactionItems: []domain.TransactionItem{{VariantId: 10, Amount: 2}},
		}, nil)

		m.availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(10)).Return(domain.Variant{
			Id: 10, IsAvailable: true, AvailableQuantity: intPtr(4),
			Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingVariant},
		}, nil)
		m.availabilityRepo.EXPECT().UpdateVariantAvailableQuantity(gomock.Any(), int64(10), 6).Return(nil)
		m.availabilityRepo.EXPECT().CreateAvailabilityMovement(gomock.Any(), gomock.Any()).Return(nil)

		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		_, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomeExpired, outcome)
	})

	t.Run("a status this payment cannot transition to from its current state is ignored", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.Status = domain.PaymentStateFailed

		status := domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		result, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomeIgnored, outcome)
		assert.Equal(t, payment, result)
	})
}

func TestPaymentUsecase_CancelPayment(t *testing.T) {
	t.Run("the flag off is a 400 before any repository access", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)

		_, _, err := m.usecase().CancelPayment(context.Background(), "session-1", "ORD1234567890AB")

		require.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("an unknown reference is 404", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), "ORDUNKNOWN000AB").
			Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		_, _, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), "session-1", "ORDUNKNOWN000AB")

		require.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})

	t.Run("a payment belonging to a different session is 404, and the access key is never consulted (D3)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.SessionId = "session-owner"
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		_, _, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), "session-thief", payment.PartnerReferenceNo)

		require.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})

	t.Run("a pending cash payment is cancelled, its reservation released and its transaction soft-deleted", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingCashPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateCancelled, p.Status)
				require.NotNil(t, p.CancelledAt)
				require.NotNil(t, p.CancelReason)
				assert.Equal(t, domain.PaymentCancelReasonGuest, *p.CancelReason)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)
		m.kdsNotificationRepo.EXPECT().HasNotificationForTransaction(gomock.Any(), int64(99), domain.KdsNotificationKindCashPending).Return(true, nil)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindCashCancelled).Return(nil)

		result, transaction, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStateCancelled, result.Status)
		assert.Equal(t, int64(99), transaction.Id)
	})

	t.Run("a cancelled cash payment enqueues cash_cancelled and triggers the dispatcher (FR-7)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
		dispatcher.EXPECT().TriggerDispatch().Times(1)

		payment := pendingCashPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)
		m.kdsNotificationRepo.EXPECT().HasNotificationForTransaction(gomock.Any(), int64(99), domain.KdsNotificationKindCashPending).Return(true, nil)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindCashCancelled).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction, kind domain.KdsNotificationKind) *domain.Error {
				assert.Equal(t, int64(99), transaction.Id)
				return nil
			})

		_, _, err := m.usecaseWithDispatcherAndCancelEnabled(dispatcher, true).CancelPayment(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
	})

	t.Run("a cash cancel with no cash_pending row enqueues nothing (FR-7)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingCashPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)
		m.kdsNotificationRepo.EXPECT().HasNotificationForTransaction(gomock.Any(), int64(99), domain.KdsNotificationKindCashPending).Return(false, nil)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		_, _, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
	})

	t.Run("a cancelled qris payment enqueues no cash_cancelled (FR-7)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPending}, nil)
		m.gatewayRepo.EXPECT().CancelQris(gomock.Any(), domain.CancelQrisInput{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: payment.GatewayReferenceNo}).
			Return(nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)
		m.kdsNotificationRepo.EXPECT().HasNotificationForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		result, _, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStateCancelled, result.Status)
	})

	t.Run("a pending qris payment doku still reports pending is cancelled after the query", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), domain.QueryQrisInput{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: payment.GatewayReferenceNo}).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPending}, nil)
		m.gatewayRepo.EXPECT().CancelQris(gomock.Any(), domain.CancelQrisInput{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: payment.GatewayReferenceNo}).
			Return(nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateCancelled, p.Status)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		result, _, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStateCancelled, result.Status)
	})

	t.Run("a doku cancel-at-DOKU failure is logged and the local cancel proceeds anyway (D5, phase 9)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPending}, nil)
		m.gatewayRepo.EXPECT().CancelQris(gomock.Any(), gomock.Any()).
			Return(&domain.Error{Type: domain.InternalServerError, Message: "DOKU rejected the QRIS cancel request"})
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateCancelled, p.Status)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		result, _, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStateCancelled, result.Status)
	})

	t.Run("a qris payment doku reports paid is paid instead of cancelled, and the cart is converted (D4)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: "gw-new", Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount}, nil).Times(2)
		expectConfirmPaymentWalletCredit(m)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, p.Status)
				assert.Nil(t, p.CancelReason)
				return p, nil
			})
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) {
				assert.Equal(t, domain.CartStatusConverted, cart.Status)
				return cart, nil
			})
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), payment.CartId).
			Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		result, _, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStatePaid, result.Status)
	})

	t.Run("a doku query error is logged and the cancel proceeds anyway (D4)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{}, &domain.Error{Type: domain.BadGateway, Message: "doku is unreachable"})
		m.gatewayRepo.EXPECT().CancelQris(gomock.Any(), gomock.Any()).
			Return(&domain.Error{Type: domain.InternalServerError, Message: "failed to reach DOKU"})
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateCancelled, p.Status)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		result, _, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStateCancelled, result.Status)
	})

	for _, tt := range []struct {
		name   string
		status domain.PaymentState
	}{
		{"an already-paid payment", domain.PaymentStatePaid},
		{"an already-expired payment", domain.PaymentStateExpired},
		{"an already-failed payment", domain.PaymentStateFailed},
		{"an already-cancelled payment", domain.PaymentStateCancelled},
	} {
		t.Run(tt.name+" is returned unchanged (D3, idempotent)", func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			m := newPaymentUsecaseMocks(ctrl)
			withPaymentTransactionMock(m.paymentRepo)

			payment := pendingPaymentFixture()
			payment.Status = tt.status
			m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
			m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)

			result, _, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

			assert.Nil(t, err)
			assert.Equal(t, payment, result)
		})
	}

	t.Run("the cart row is never touched by a cancel (D2)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingCashPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)
		m.kdsNotificationRepo.EXPECT().HasNotificationForTransaction(gomock.Any(), int64(99), domain.KdsNotificationKindCashPending).Return(true, nil)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), domain.KdsNotificationKindCashCancelled).Return(nil)
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), gomock.Any()).Times(0)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), gomock.Any()).Times(0)

		_, _, err := m.usecaseWithCancelEnabled().CancelPayment(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
	})
}

func TestPaymentUsecase_CanCancel(t *testing.T) {
	t.Run("false when the flag is off even for the owner of a pending payment", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		payment := pendingPaymentFixture()

		assert.False(t, m.usecase().CanCancel(payment, payment.SessionId))
	})

	t.Run("true for the owner of a pending payment when the flag is on", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		payment := pendingPaymentFixture()

		assert.True(t, m.usecaseWithCancelEnabled().CanCancel(payment, payment.SessionId))
	})

	t.Run("false for a foreign session even when the flag is on", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		payment := pendingPaymentFixture()

		assert.False(t, m.usecaseWithCancelEnabled().CanCancel(payment, "someone-elses-session"))
	})

	t.Run("false for a payment that already left pending, even for the owner with the flag on", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		payment := pendingPaymentFixture()
		payment.Status = domain.PaymentStatePaid

		assert.False(t, m.usecaseWithCancelEnabled().CanCancel(payment, payment.SessionId))
	})
}

func TestPaymentUsecase_GetPaymentList(t *testing.T) {
	t.Run("joins each payment with its transaction summary and passes through the total", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)

		transactionId1 := int64(101)
		transactionId2 := int64(102)
		payments := []domain.Payment{
			{PartnerReferenceNo: "ORD2", SessionId: "session-1", Status: domain.PaymentStatePaid, Amount: 20000, TransactionId: &transactionId2},
			{PartnerReferenceNo: "ORD1", SessionId: "session-1", Status: domain.PaymentStatePaid, Amount: 45000, TransactionId: &transactionId1},
		}
		m.paymentRepo.EXPECT().GetPaymentsBySessionId(gomock.Any(), "session-1", 0, 20).Return(payments, nil)
		m.paymentRepo.EXPECT().GetPaymentsBySessionIdTotal(gomock.Any(), "session-1").Return(int64(2), nil)
		m.transactionRepo.EXPECT().GetTransactionSummariesByIds(gomock.Any(), []int64{transactionId2, transactionId1}).
			Return([]domain.TransactionSummary{
				{Id: transactionId1, TransactionNumber: 1, Name: "Andi", TableLabel: "Meja 3", ItemCount: 3, DiningOption: domain.DiningOptionDineIn},
				{Id: transactionId2, TransactionNumber: 2, Name: "Budi", TableLabel: "Meja 1", ItemCount: 1, DiningOption: domain.DiningOptionTakeaway},
			}, nil)

		summaries, total, err := m.usecase().GetPaymentList(context.Background(), "session-1", 0, 20)

		assert.Nil(t, err)
		assert.Equal(t, int64(2), total)
		require.Len(t, summaries, 2)
		assert.Equal(t, "ORD2", summaries[0].PartnerReferenceNo)
		assert.Equal(t, int64(2), summaries[0].TransactionNumber)
		assert.Equal(t, "Budi", summaries[0].CustomerName)
		assert.Equal(t, "Meja 1", summaries[0].TableLabel)
		assert.Equal(t, 1, summaries[0].ItemCount)
		assert.Equal(t, domain.DiningOptionTakeaway, summaries[0].DiningOption)
		assert.Equal(t, "ORD1", summaries[1].PartnerReferenceNo)
		assert.Equal(t, "Andi", summaries[1].CustomerName)
		assert.Equal(t, domain.DiningOptionDineIn, summaries[1].DiningOption)
	})

	t.Run("a payment with no transaction is summarized with a zero-value transaction summary rather than crashing", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)

		payments := []domain.Payment{{PartnerReferenceNo: "ORD1", SessionId: "session-1", Status: domain.PaymentStatePaid}}
		m.paymentRepo.EXPECT().GetPaymentsBySessionId(gomock.Any(), "session-1", 0, 0).Return(payments, nil)
		m.paymentRepo.EXPECT().GetPaymentsBySessionIdTotal(gomock.Any(), "session-1").Return(int64(1), nil)
		m.transactionRepo.EXPECT().GetTransactionSummariesByIds(gomock.Any(), []int64{}).Return([]domain.TransactionSummary{}, nil)

		summaries, total, err := m.usecase().GetPaymentList(context.Background(), "session-1", 0, 0)

		assert.Nil(t, err)
		assert.Equal(t, int64(1), total)
		require.Len(t, summaries, 1)
		assert.Equal(t, "ORD1", summaries[0].PartnerReferenceNo)
	})

	t.Run("a payment list failure is surfaced without querying transactions", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		m.paymentRepo.EXPECT().GetPaymentsBySessionId(gomock.Any(), "session-1", 0, 0).
			Return(nil, &domain.Error{Type: domain.InternalServerError})

		_, _, err := m.usecase().GetPaymentList(context.Background(), "session-1", 0, 0)

		assert.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})

	t.Run("a total-count failure is surfaced", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		m.paymentRepo.EXPECT().GetPaymentsBySessionId(gomock.Any(), "session-1", 0, 0).Return([]domain.Payment{}, nil)
		m.paymentRepo.EXPECT().GetPaymentsBySessionIdTotal(gomock.Any(), "session-1").
			Return(int64(0), &domain.Error{Type: domain.InternalServerError})

		_, _, err := m.usecase().GetPaymentList(context.Background(), "session-1", 0, 0)

		assert.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})
}

func TestPaymentUsecase_GetPaymentStatus(t *testing.T) {
	t.Run("an unknown reference is 404", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), "ORDUNKNOWN000AB").
			Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		_, _, err := m.usecase().GetPaymentStatus(context.Background(), "session-1", "ORDUNKNOWN000AB", "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})

	t.Run("a payment belonging to a different session is 404", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.SessionId = "session-owner"
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		_, _, err := m.usecase().GetPaymentStatus(context.Background(), "session-thief", payment.PartnerReferenceNo, "")

		assert.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})

	t.Run("a foreign session with the payment's correct access key is 200 (D4)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		accessKey := "q3Vd0bX9pL2sR8tY1wZa7c"
		payment := pendingPaymentFixture()
		payment.SessionId = "session-owner"
		payment.AccessKey = &accessKey
		checkedAt := time.Now().Add(-3 * time.Second)
		payment.StatusCheckedAt = &checkedAt
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), "session-thief", payment.PartnerReferenceNo, accessKey)

		assert.Nil(t, err)
		assert.Equal(t, payment, result)
	})

	t.Run("a foreign session with a wrong access key is 404", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		accessKey := "q3Vd0bX9pL2sR8tY1wZa7c"
		payment := pendingPaymentFixture()
		payment.SessionId = "session-owner"
		payment.AccessKey = &accessKey
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		_, _, err := m.usecase().GetPaymentStatus(context.Background(), "session-thief", payment.PartnerReferenceNo, "wrong-key")

		assert.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})

	t.Run("a legacy payment with a null access key is 404 for a foreign session even with a key supplied", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.SessionId = "session-owner"
		payment.AccessKey = nil
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		_, _, err := m.usecase().GetPaymentStatus(context.Background(), "session-thief", payment.PartnerReferenceNo, "any-key")

		assert.NotNil(t, err)
		assert.Equal(t, domain.NotFound, err.Type)
	})

	t.Run("a payment checked less than 10s ago does not re-query DOKU", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		checkedAt := time.Now().Add(-3 * time.Second)
		payment.StatusCheckedAt = &checkedAt
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, payment, result)
	})

	t.Run("a payment never checked before re-queries DOKU even though it is still within its window", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), domain.QueryQrisInput{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: payment.GatewayReferenceNo}).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPending}, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePending, p.Status)
				assert.NotNil(t, p.StatusCheckedAt)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStatePending, result.Status)
	})

	t.Run("a DOKU paid result reached by query pays exactly as the notification does", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: "gw-new", Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}, nil)

		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount}, nil).Times(2)
		expectConfirmPaymentWalletCredit(m)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, p.Status)
				return p, nil
			})
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		expectNoSupersede(m, 1)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStatePaid, result.Status)
	})

	t.Run("a pending payment past expired_at expires on read only after a confirming QueryQris", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.ExpiredAt = time.Now().Add(-time.Minute)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPending}, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateExpired, p.Status)
				return p, nil
			})
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStateExpired, result.Status)
	})

	t.Run("a payment past expired_at that DOKU reports paid is paid, not expired", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.ExpiredAt = time.Now().Add(-time.Minute)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: "gw-late", Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}, nil)

		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount}, nil).Times(2)
		expectConfirmPaymentWalletCredit(m)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, p.Status)
				return p, nil
			})
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		expectNoSupersede(m, 1)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStatePaid, result.Status)
	})

	t.Run("a gateway failure during requery degrades to returning the payment unchanged", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{}, &domain.Error{Type: domain.InternalServerError, Message: "DOKU is unreachable"})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, payment, result)
	})

	t.Run("a pending cash payment before expired_at stays pending without touching the gateway", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingCashPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePending, p.Status)
				assert.NotNil(t, p.StatusCheckedAt)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStatePending, result.Status)
	})

	t.Run("a pending cash payment checked seconds ago still expires on the clock — the requery floor is a DOKU-only device", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingCashPaymentFixture()
		payment.ExpiredAt = time.Now().Add(-time.Minute)
		checkedAt := time.Now().Add(-3 * time.Second)
		payment.StatusCheckedAt = &checkedAt
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateExpired, p.Status)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStateExpired, result.Status)
	})

	t.Run("a pending cash payment past expired_at expires on read with no gateway call, releasing availability and soft-deleting its transaction", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingCashPaymentFixture()
		payment.ExpiredAt = time.Now().Add(-time.Minute)
		transaction := domain.Transaction{
			Id:               99,
			TransactionItems: []domain.TransactionItem{{VariantId: 10, Amount: 2}},
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateExpired, p.Status)
				assert.NotNil(t, p.StatusCheckedAt)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(transaction, nil).Times(2)
		m.availabilityRepo.EXPECT().LockVariantById(gomock.Any(), int64(10)).Return(domain.Variant{
			Id: 10, IsAvailable: true,
			Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingNone},
		}, nil)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStateExpired, result.Status)
	})

	t.Run("an already-resolved payment is returned as-is without touching the gateway", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.Status = domain.PaymentStateExpired
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStateExpired, result.Status)
	})
}

// FR-4: payTransaction has two callers, and this is the one reached by the DOKU webhook and by
// the guest's own status page re-querying DOKU (System Design Overview, "the path"). Both must
// kick the dispatcher after their commit — this is the KDS acceptance for phase 8's "a real order
// buzzes" the mock-gateway tests in kds_notification_usecase_test.go can't reach from here.
func TestPaymentUsecase_KdsDispatchTrigger(t *testing.T) {
	t.Run("ConfirmPayment triggers a dispatch sweep after a payment commits", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		status := domain.QrisStatus{
			PartnerReferenceNo: payment.PartnerReferenceNo,
			GatewayReferenceNo: "gw-new",
			Status:             domain.PaymentGatewayStatusPaid,
			PaidAmount:         payment.Amount,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount}, nil)
		expectConfirmPaymentWalletCredit(m)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		expectNoSupersede(m, 1)

		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
		dispatcher.EXPECT().TriggerDispatch().Times(1)

		_, outcome, err := m.usecaseWithDispatcher(dispatcher).ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomePaid, outcome)
	})

	t.Run("ConfirmPayment does not trigger a dispatch sweep for an already-paid payment", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		payment.Status = domain.PaymentStatePaid
		paidAt := time.Now()
		payment.PaidAt = &paidAt
		status := domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
		dispatcher.EXPECT().TriggerDispatch().Times(0)

		_, outcome, err := m.usecaseWithDispatcher(dispatcher).ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomeAlreadyPaid, outcome)
	})

	t.Run("GetPaymentStatus triggers a dispatch sweep when a DOKU requery pays the transaction", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: "gw-new", Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount}, nil).Times(2)
		expectConfirmPaymentWalletCredit(m)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		expectNoSupersede(m, 1)

		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
		dispatcher.EXPECT().TriggerDispatch().Times(1)

		result, _, err := m.usecaseWithDispatcher(dispatcher).GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStatePaid, result.Status)
	})

	t.Run("GetPaymentStatus does not trigger a dispatch sweep when the payment is still pending", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)

		payment := pendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPending}, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)

		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
		dispatcher.EXPECT().TriggerDispatch().Times(0)

		result, _, err := m.usecaseWithDispatcher(dispatcher).GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo, "")

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStatePending, result.Status)
	})
}

func TestPaymentUsecase_ExpireStalePayments(t *testing.T) {
	t.Run("claims a bounded batch of expirable payments", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		m.paymentRepo.EXPECT().GetExpirablePayments(gomock.Any(), gomock.Any(), 50).Return(nil, nil)

		err := m.usecase().ExpireStalePayments(context.Background())

		assert.Nil(t, err)
	})

	t.Run("a claim failure is surfaced without touching any payment", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		m.paymentRepo.EXPECT().GetExpirablePayments(gomock.Any(), gomock.Any(), gomock.Any()).
			Return(nil, &domain.Error{Type: domain.InternalServerError})

		err := m.usecase().ExpireStalePayments(context.Background())

		assert.NotNil(t, err)
	})

	t.Run("expires a cash payment on the clock alone, without ever querying the gateway", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		payment := pendingPaymentFixture()
		payment.Method = domain.PaymentMethodCash

		m.paymentRepo.EXPECT().GetExpirablePayments(gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Payment{payment}, nil)
		withPaymentTransactionMock(m.paymentRepo)
		// D6: expireOne re-reads the row under lock before deciding.
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateExpired, p.Status)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		err := m.usecase().ExpireStalePayments(context.Background())

		assert.Nil(t, err)
	})

	t.Run("a stale payment already handled since the batch read is left alone", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		payment := pendingPaymentFixture()
		payment.Method = domain.PaymentMethodCash

		m.paymentRepo.EXPECT().GetExpirablePayments(gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Payment{payment}, nil)
		withPaymentTransactionMock(m.paymentRepo)
		// D6: a guest cancelled it (or another tick already expired it) between the sweep's batch
		// read and this per-payment transaction — the lock read sees that and stands down.
		locked := payment
		locked.Status = domain.PaymentStateCancelled
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(locked, nil)

		err := m.usecase().ExpireStalePayments(context.Background())

		assert.Nil(t, err)
	})

	t.Run("a batch of a cash and a qris payment expires the cash one on the clock and confirms the qris one with the gateway first", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)

		cashPayment := pendingPaymentFixture()
		cashPayment.Id = 7
		cashPayment.Method = domain.PaymentMethodCash
		cashTransactionId := int64(99)
		cashPayment.TransactionId = &cashTransactionId

		qrisPayment := pendingPaymentFixture()
		qrisPayment.Id = 8
		qrisPayment.PartnerReferenceNo = "ORD22222222222B"
		qrisTransactionId := int64(100)
		qrisPayment.TransactionId = &qrisTransactionId

		m.paymentRepo.EXPECT().GetExpirablePayments(gomock.Any(), gomock.Any(), gomock.Any()).
			Return([]domain.Payment{cashPayment, qrisPayment}, nil)
		m.paymentRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) }).Times(2)

		// D6: expireOne re-reads each row under lock before deciding.
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), cashPayment.PartnerReferenceNo).Return(cashPayment, nil)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), qrisPayment.PartnerReferenceNo).Return(qrisPayment, nil)

		// cash: clock alone, no gateway call.
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), cashPayment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateExpired, p.Status)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), cashTransactionId).Return(domain.Transaction{Id: cashTransactionId}, nil)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), cashTransactionId).Return(nil)

		// qris: a confirming query first, which also reports expired.
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: qrisPayment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusExpired}, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), qrisPayment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateExpired, p.Status)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), qrisTransactionId).Return(domain.Transaction{Id: qrisTransactionId}, nil)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), qrisTransactionId).Return(nil)

		err := m.usecase().ExpireStalePayments(context.Background())

		assert.Nil(t, err)
	})

	t.Run("a stale qris payment doku reports paid runs the late-payment path instead of expiring, and triggers a dispatch", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		payment := pendingPaymentFixture()

		m.paymentRepo.EXPECT().GetExpirablePayments(gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Payment{payment}, nil)
		withPaymentTransactionMock(m.paymentRepo)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: "gw-late", Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}, nil)

		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99, Total: payment.Amount}, nil)
		expectConfirmPaymentWalletCredit(m)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, p.Status)
				return p, nil
			})
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		expectNoSupersede(m, 1)

		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
		dispatcher.EXPECT().TriggerDispatch().Times(1)

		err := m.usecaseWithDispatcher(dispatcher).ExpireStalePayments(context.Background())

		assert.Nil(t, err)
	})

	t.Run("a gateway error during the confirming query leaves the row untouched for the next tick", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		payment := pendingPaymentFixture()

		m.paymentRepo.EXPECT().GetExpirablePayments(gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Payment{payment}, nil)
		withPaymentTransactionMock(m.paymentRepo)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{}, &domain.Error{Type: domain.BadGateway, Message: "doku unavailable"})

		err := m.usecase().ExpireStalePayments(context.Background())

		assert.Nil(t, err)
	})

	t.Run("one failing row does not abort the rest of the batch", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)

		failingPayment := pendingPaymentFixture()
		failingPayment.Id = 7
		failingPayment.Method = domain.PaymentMethodCash

		okPayment := pendingPaymentFixture()
		okPayment.Id = 8
		okPayment.Method = domain.PaymentMethodCash
		okPayment.PartnerReferenceNo = "ORD99999999999Z"
		okTransactionId := int64(101)
		okPayment.TransactionId = &okTransactionId

		m.paymentRepo.EXPECT().GetExpirablePayments(gomock.Any(), gomock.Any(), gomock.Any()).
			Return([]domain.Payment{failingPayment, okPayment}, nil)
		m.paymentRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) }).Times(2)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), failingPayment.PartnerReferenceNo).Return(failingPayment, nil)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), okPayment.PartnerReferenceNo).Return(okPayment, nil)

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), failingPayment.Id).
			Return(domain.Payment{}, &domain.Error{Type: domain.InternalServerError, Message: "db hiccup"})

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), okPayment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateExpired, p.Status)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), okTransactionId).Return(domain.Transaction{Id: okTransactionId}, nil)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), okTransactionId).Return(nil)

		err := m.usecase().ExpireStalePayments(context.Background())

		assert.Nil(t, err)
	})
}
