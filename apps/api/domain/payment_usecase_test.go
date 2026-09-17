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
	availabilityReservation := domain.NewAvailabilityReservation(m.availabilityRepo)
	return domain.NewPaymentUsecase(m.paymentRepo, m.gatewayRepo, m.customerRepo, m.cartRepo, m.transactionRepo, m.variantRepo, m.walletRepo, availabilityReservation, m.kdsNotificationRepo, dispatcher, checkoutQrisExpirySeconds, checkoutOrderPaymentWalletId)
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
	m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), sessionId, name).
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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

		assert.NotNil(t, err)
		assert.Equal(t, domain.InternalServerError, err.Type)
	})

	t.Run("an invalid customerName is rejected without touching the cart", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "   ")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
	})

	t.Run("no cart at all is treated the same as an empty cart", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentUsecaseMocks(ctrl)
		withPaymentTransactionMock(m.paymentRepo)
		expectValidWallet(m)
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
		expectValidWallet(m)
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
		expectValidWallet(m)
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
		expectValidWallet(m)
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

		payment, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")
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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "  Budi  ")
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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

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

		_, _, err := m.usecase().Checkout(context.Background(), "session-1", "Budi")

		assert.NotNil(t, err)
		assert.Equal(t, domain.BadRequest, err.Type)
		assert.Equal(t, "Kopi Susu Vanilla is sold out", err.Message)
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

func expectConfirmPaymentWalletCredit(m paymentUsecaseMocks) {
	expectConfirmPaymentWalletCreditWithoutKdsEnqueue(m)
	m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any()).Return(nil)
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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{
				Id: 99, Total: payment.Amount, CreatedAt: time.Now(),
				TransactionItems: []domain.TransactionItem{
					{Amount: 2, ProductName: "Kopi Susu Gula Aren", Variant: domain.Variant{Product: domain.Product{Category: domain.Category{Station: "BAR"}}}},
					{Amount: 1, ProductName: "Sandwich", Variant: domain.Variant{Product: domain.Product{Category: domain.Category{Station: "KITCHEN"}}}},
				},
			}, nil)

		expectConfirmPaymentWalletCreditWithoutKdsEnqueue(m)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any()).Times(1).DoAndReturn(
			func(_ context.Context, transaction domain.Transaction) *domain.Error {
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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{
				Id: 99, Total: payment.Amount, CreatedAt: time.Now(),
				TransactionItems: []domain.TransactionItem{
					{Amount: 1, ProductName: "Board Game Ticket", Variant: domain.Variant{Product: domain.Product{Category: domain.Category{Station: "NONE"}}}},
				},
			}, nil)

		expectConfirmPaymentWalletCreditWithoutKdsEnqueue(m)
		m.kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
			func(_ context.Context, transaction domain.Transaction) *domain.Error {
				assert.False(t, domain.ShouldNotify(transaction))
				return nil
			})

		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })

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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), "ORDUNKNOWN000AB").
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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

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
				m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		result, outcome, err := m.usecase().ConfirmPayment(context.Background(), status)

		assert.Nil(t, err)
		assert.Equal(t, domain.ConfirmPaymentOutcomeIgnored, outcome)
		assert.Equal(t, payment, result)
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
				{Id: transactionId1, TransactionNumber: 1, Name: "Andi", TableLabel: "Meja 3", ItemCount: 3},
				{Id: transactionId2, TransactionNumber: 2, Name: "Budi", TableLabel: "Meja 1", ItemCount: 1},
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
		assert.Equal(t, "ORD1", summaries[1].PartnerReferenceNo)
		assert.Equal(t, "Andi", summaries[1].CustomerName)
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

		_, _, err := m.usecase().GetPaymentStatus(context.Background(), "session-1", "ORDUNKNOWN000AB")

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

		_, _, err := m.usecase().GetPaymentStatus(context.Background(), "session-thief", payment.PartnerReferenceNo)

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

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

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

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

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

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

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

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

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

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

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

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
		assert.Equal(t, payment, result)
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

		result, _, err := m.usecase().GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount}, nil)
		expectConfirmPaymentWalletCredit(m)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })

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
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

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

		dispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
		dispatcher.EXPECT().TriggerDispatch().Times(1)

		result, _, err := m.usecaseWithDispatcher(dispatcher).GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

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

		result, _, err := m.usecaseWithDispatcher(dispatcher).GetPaymentStatus(context.Background(), payment.SessionId, payment.PartnerReferenceNo)

		assert.Nil(t, err)
		assert.Equal(t, domain.PaymentStatePending, result.Status)
	})
}
