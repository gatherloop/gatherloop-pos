package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"context"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

const paymentHandlerOrderPaymentWalletId = 9

type paymentHandlerMocks struct {
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

func newPaymentHandlerMocks(ctrl *gomock.Controller) paymentHandlerMocks {
	kdsNotificationRepo := mock.NewMockKdsNotificationRepository(ctrl)
	kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).AnyTimes()
	kdsNotificationDispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
	kdsNotificationDispatcher.EXPECT().TriggerDispatch().AnyTimes()
	return paymentHandlerMocks{
		paymentRepo:               mock.NewMockPaymentRepository(ctrl),
		gatewayRepo:               mock.NewMockPaymentGatewayRepository(ctrl),
		customerRepo:              mock.NewMockCustomerRepository(ctrl),
		cartRepo:                  mock.NewMockCartRepository(ctrl),
		transactionRepo:           mock.NewMockTransactionRepository(ctrl),
		variantRepo:               mock.NewMockVariantRepository(ctrl),
		walletRepo:                mock.NewMockWalletRepository(ctrl),
		availabilityRepo:          mock.NewMockAvailabilityReservationRepository(ctrl),
		kdsNotificationRepo:       kdsNotificationRepo,
		kdsNotificationDispatcher: kdsNotificationDispatcher,
	}
}

func (m paymentHandlerMocks) handler() restapi.PaymentHandler {
	return m.handlerWithCancelEnabled(false)
}

func (m paymentHandlerMocks) handlerWithCancelEnabled(orderPaymentCancelEnabled bool) restapi.PaymentHandler {
	availabilityReservation := domain.NewAvailabilityReservation(m.availabilityRepo)
	usecase := domain.NewPaymentUsecase(m.paymentRepo, m.gatewayRepo, m.customerRepo, m.cartRepo, m.transactionRepo, m.variantRepo, m.walletRepo, availabilityReservation, m.kdsNotificationRepo, m.kdsNotificationDispatcher, 300, 600, paymentHandlerOrderPaymentWalletId, orderPaymentCancelEnabled)
	return restapi.NewPaymentHandler(usecase)
}

func expectAvailableHandlerVariant(m paymentHandlerMocks, variantId int64) {
	m.availabilityRepo.EXPECT().LockVariantById(gomock.Any(), variantId).Return(domain.Variant{
		Id: variantId, IsAvailable: true,
		Product: domain.Product{IsAvailable: true, AvailabilityTracking: domain.AvailabilityTrackingNone},
	}, nil)
}

func expectValidPaymentWallet(m paymentHandlerMocks) {
	m.walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(paymentHandlerOrderPaymentWalletId)).
		Return(domain.Wallet{Id: paymentHandlerOrderPaymentWalletId, Name: "QRIS", IsPaymentTarget: true}, nil)
}

func withPaymentHandlerTransactionMock(r *mock.MockPaymentRepository) {
	r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
}

func checkoutRequestBody(customerName string) *bytes.Buffer {
	body, _ := json.Marshal(apiContract.PaymentCheckoutRequest{CustomerName: customerName})
	return bytes.NewBuffer(body)
}

func checkoutRequestBodyWithMethod(customerName string, method string) *bytes.Buffer {
	body, _ := json.Marshal(apiContract.PaymentCheckoutRequest{CustomerName: customerName, Method: &method})
	return bytes.NewBuffer(body)
}

func checkoutRequestBodyWithWhatsappNumber(customerName string, whatsappNumber string) *bytes.Buffer {
	body, _ := json.Marshal(apiContract.PaymentCheckoutRequest{CustomerName: customerName, CustomerWhatsappNumber: &whatsappNumber})
	return bytes.NewBuffer(body)
}

func TestPaymentHandler_Checkout(t *testing.T) {
	t.Run("a successful checkout returns the payment with its QR", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)
		expectValidPaymentWallet(m)

		m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), testSessionId, "Budi", nil).
			Return(domain.Customer{Id: 1, SessionId: testSessionId, Name: "Budi"}, nil)

		tableId := int64(5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{
			Id: 1, TableId: &tableId, Status: domain.CartStatusActive,
			Items: []domain.CartItem{{Id: 1, VariantId: 10, Amount: 1}},
		}, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(domain.Variant{
			Id: 10, Price: 15000, Product: domain.Product{Name: "Kopi Susu"},
		}, nil)
		expectAvailableHandlerVariant(m, 10)

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				transaction.Id = 200
				transaction.Cart = &domain.Cart{Table: &domain.Table{Label: "Meja 1"}}
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

		req := httptest.NewRequest(http.MethodPost, "/carts/current/checkout", checkoutRequestBody("Budi"))
		req.Header.Set("X-Session-Id", testSessionId)
		w := httptest.NewRecorder()
		m.handler().Checkout(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(bytes.NewBufferString(w.Body.String())).Decode(&resp))
		assert.Equal(t, "qr-content", resp.Data.QrContent)
		assert.Equal(t, "pending", resp.Data.Status)
		assert.Equal(t, "qris", resp.Data.Method)
		assert.Equal(t, "Budi", resp.Data.CustomerName)
		assert.Equal(t, "Meja 1", resp.Data.TableLabel)
	})

	t.Run("a gateway failure is answered 502, not 500, and the body still carries internal_server_error", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)
		expectValidPaymentWallet(m)

		m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), testSessionId, gomock.Any(), nil).
			Return(domain.Customer{Id: 1, SessionId: testSessionId, Name: "Budi"}, nil)

		tableId := int64(5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{
			Id: 1, TableId: &tableId, Status: domain.CartStatusActive,
			Items: []domain.CartItem{{Id: 1, VariantId: 10, Amount: 1}},
		}, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(domain.Variant{Id: 10, Price: 15000, Product: domain.Product{Name: "Kopi Susu"}}, nil)
		expectAvailableHandlerVariant(m, 10)
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

		req := httptest.NewRequest(http.MethodPost, "/carts/current/checkout", checkoutRequestBody("Budi"))
		req.Header.Set("X-Session-Id", testSessionId)
		w := httptest.NewRecorder()
		m.handler().Checkout(w, req)

		assert.Equal(t, http.StatusBadGateway, w.Code)

		var apiErr apiContract.Error
		assert.NoError(t, json.NewDecoder(bytes.NewBufferString(w.Body.String())).Decode(&apiErr))
		assert.Equal(t, apiContract.INTERNAL_SERVER_ERROR, apiErr.Code)
	})

	t.Run("an empty cart is a 400, not a 502 or 500", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)
		expectValidPaymentWallet(m)

		m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), testSessionId, gomock.Any(), nil).
			Return(domain.Customer{Id: 1, SessionId: testSessionId, Name: "Budi"}, nil)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})

		req := httptest.NewRequest(http.MethodPost, "/carts/current/checkout", checkoutRequestBody("Budi"))
		req.Header.Set("X-Session-Id", testSessionId)
		w := httptest.NewRecorder()
		m.handler().Checkout(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("a misconfigured order payment wallet is a 500 response, not a crash", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)
		m.walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(paymentHandlerOrderPaymentWalletId)).
			Return(domain.Wallet{}, &domain.Error{Type: domain.NotFound})

		req := httptest.NewRequest(http.MethodPost, "/carts/current/checkout", checkoutRequestBody("Budi"))
		req.Header.Set("X-Session-Id", testSessionId)
		w := httptest.NewRecorder()
		m.handler().Checkout(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("an unknown payment method is a 400, with no wallet or cart lookup", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)

		req := httptest.NewRequest(http.MethodPost, "/carts/current/checkout", checkoutRequestBodyWithMethod("Budi", "credit_card"))
		req.Header.Set("X-Session-Id", testSessionId)
		w := httptest.NewRecorder()
		m.handler().Checkout(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("an invalid customerWhatsappNumber is a 400", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)
		expectValidPaymentWallet(m)

		req := httptest.NewRequest(http.MethodPost, "/carts/current/checkout", checkoutRequestBodyWithWhatsappNumber("Budi", "12345"))
		req.Header.Set("X-Session-Id", testSessionId)
		w := httptest.NewRecorder()
		m.handler().Checkout(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var apiErr apiContract.Error
		assert.NoError(t, json.NewDecoder(bytes.NewBufferString(w.Body.String())).Decode(&apiErr))
		assert.Equal(t, apiContract.BAD_REQUEST, apiErr.Code)
	})

	t.Run("a cash checkout succeeds without ever calling the gateway", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)
		expectValidPaymentWallet(m)

		m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), testSessionId, "Budi", nil).
			Return(domain.Customer{Id: 1, SessionId: testSessionId, Name: "Budi"}, nil)

		tableId := int64(5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{
			Id: 1, TableId: &tableId, Status: domain.CartStatusActive,
			Items: []domain.CartItem{{Id: 1, VariantId: 10, Amount: 1}},
		}, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(domain.Variant{
			Id: 10, Price: 15000, Product: domain.Product{Name: "Kopi Susu"},
		}, nil)
		expectAvailableHandlerVariant(m, 10)

		m.transactionRepo.EXPECT().CreateTransaction(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, transaction domain.Transaction) (domain.Transaction, *domain.Error) {
				transaction.Id = 200
				transaction.Cart = &domain.Cart{Table: &domain.Table{Label: "Meja 1"}}
				return transaction, nil
			})
		m.paymentRepo.EXPECT().CreatePayment(gomock.Any(), gomock.Any()).
			DoAndReturn(func(_ context.Context, payment domain.Payment) (domain.Payment, *domain.Error) {
				payment.Id = 300
				return payment, nil
			})
		m.gatewayRepo.EXPECT().GenerateQris(gomock.Any(), gomock.Any()).Times(0)

		req := httptest.NewRequest(http.MethodPost, "/carts/current/checkout", checkoutRequestBodyWithMethod("Budi", "cash"))
		req.Header.Set("X-Session-Id", testSessionId)
		w := httptest.NewRecorder()
		m.handler().Checkout(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(bytes.NewBufferString(w.Body.String())).Decode(&resp))
		assert.Equal(t, "", resp.Data.QrContent)
		assert.Equal(t, "pending", resp.Data.Status)
		assert.Equal(t, "cash", resp.Data.Method)
	})
}

func TestPaymentHandler_GetPaymentByPartnerReferenceNo(t *testing.T) {
	t.Run("returns the payment for the owning session", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		transactionId := int64(99)
		checkedAt := time.Now()
		payment := domain.Payment{
			Id: 7, CartId: 1, SessionId: testSessionId, TransactionId: &transactionId,
			PartnerReferenceNo: "ORD1234567890AB", Method: domain.PaymentMethodQris, Status: domain.PaymentStatePending,
			Amount: 30000, ExpiredAt: time.Now().Add(2 * time.Minute), StatusCheckedAt: &checkedAt,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).
			Return(domain.Transaction{Id: transactionId, Name: "Budi"}, nil)

		req := httptest.NewRequest(http.MethodGet, "/payments/"+payment.PartnerReferenceNo, nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handler().GetPaymentByPartnerReferenceNo(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Equal(t, "pending", resp.Data.Status)
		assert.Equal(t, "Budi", resp.Data.CustomerName)
	})

	t.Run("a foreign session gets 404", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		payment := domain.Payment{
			Id: 7, SessionId: "someone-elses-session",
			PartnerReferenceNo: "ORD1234567890AB", Status: domain.PaymentStatePending,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		req := httptest.NewRequest(http.MethodGet, "/payments/"+payment.PartnerReferenceNo, nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handler().GetPaymentByPartnerReferenceNo(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("a foreign session with the correct X-Order-Access-Key gets 200 (D4)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		transactionId := int64(99)
		checkedAt := time.Now()
		accessKey := "q3Vd0bX9pL2sR8tY1wZa7c"
		payment := domain.Payment{
			Id: 7, CartId: 1, SessionId: "someone-elses-session", TransactionId: &transactionId,
			PartnerReferenceNo: "ORD1234567890AB", AccessKey: &accessKey, Method: domain.PaymentMethodQris, Status: domain.PaymentStatePending,
			Amount: 30000, ExpiredAt: time.Now().Add(2 * time.Minute), StatusCheckedAt: &checkedAt,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).
			Return(domain.Transaction{Id: transactionId, Name: "Budi"}, nil)

		req := httptest.NewRequest(http.MethodGet, "/payments/"+payment.PartnerReferenceNo, nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req.Header.Set("X-Order-Access-Key", accessKey)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handler().GetPaymentByPartnerReferenceNo(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Equal(t, "Budi", resp.Data.CustomerName)
	})

	t.Run("a foreign session with a wrong X-Order-Access-Key gets 404", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		accessKey := "q3Vd0bX9pL2sR8tY1wZa7c"
		payment := domain.Payment{
			Id: 7, SessionId: "someone-elses-session", AccessKey: &accessKey,
			PartnerReferenceNo: "ORD1234567890AB", Status: domain.PaymentStatePending,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		req := httptest.NewRequest(http.MethodGet, "/payments/"+payment.PartnerReferenceNo, nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req.Header.Set("X-Order-Access-Key", "wrong-key")
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handler().GetPaymentByPartnerReferenceNo(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("an unknown reference gets 404", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), "ORDUNKNOWN000AB").
			Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		req := httptest.NewRequest(http.MethodGet, "/payments/ORDUNKNOWN000AB", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": "ORDUNKNOWN000AB"})
		w := httptest.NewRecorder()
		m.handler().GetPaymentByPartnerReferenceNo(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("a stale pending payment re-queries DOKU and reflects the paid result", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		transactionId := int64(99)
		payment := domain.Payment{
			Id: 7, CartId: 1, SessionId: testSessionId, TransactionId: &transactionId,
			PartnerReferenceNo: "ORD1234567890AB", Method: domain.PaymentMethodQris, Status: domain.PaymentStatePending,
			Amount: 30000, ExpiredAt: time.Now().Add(2 * time.Minute),
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: "gw-1", Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}, nil)

		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).
			Return(domain.Transaction{Id: transactionId, Total: payment.Amount}, nil).Times(2)
		m.walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(paymentHandlerOrderPaymentWalletId)).
			Return(domain.Wallet{Id: paymentHandlerOrderPaymentWalletId, Name: "QRIS", IsPaymentTarget: true}, nil)
		m.walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(paymentHandlerOrderPaymentWalletId)).
			Return(domain.Wallet{}, nil)
		m.transactionRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), transactionId).
			Return(domain.Transaction{}, nil)
		m.transactionRepo.EXPECT().PayTransaction(gomock.Any(), int64(paymentHandlerOrderPaymentWalletId), gomock.Any(), payment.Amount, transactionId).
			Return(nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		// D7: no other pending payment on the same cart to supersede.
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		req := httptest.NewRequest(http.MethodGet, "/payments/"+payment.PartnerReferenceNo, nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handler().GetPaymentByPartnerReferenceNo(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Equal(t, "paid", resp.Data.Status)
	})
}

func TestPaymentHandler_GetPaymentByPartnerReferenceNo_CanCancel(t *testing.T) {
	t.Run("true for the owning session when the flag is on", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		transactionId := int64(99)
		checkedAt := time.Now()
		payment := domain.Payment{
			Id: 7, CartId: 1, SessionId: testSessionId, TransactionId: &transactionId,
			PartnerReferenceNo: "ORD1234567890AB", Method: domain.PaymentMethodQris, Status: domain.PaymentStatePending,
			Amount: 30000, ExpiredAt: time.Now().Add(2 * time.Minute), StatusCheckedAt: &checkedAt,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).Return(domain.Transaction{Id: transactionId}, nil)

		req := httptest.NewRequest(http.MethodGet, "/payments/"+payment.PartnerReferenceNo, nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handlerWithCancelEnabled(true).GetPaymentByPartnerReferenceNo(w, req)

		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.True(t, resp.Data.CanCancel)
	})

	t.Run("false for an access-key reader even when the flag is on", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		transactionId := int64(99)
		checkedAt := time.Now()
		accessKey := "q3Vd0bX9pL2sR8tY1wZa7c"
		payment := domain.Payment{
			Id: 7, CartId: 1, SessionId: "someone-elses-session", TransactionId: &transactionId,
			PartnerReferenceNo: "ORD1234567890AB", AccessKey: &accessKey, Method: domain.PaymentMethodQris, Status: domain.PaymentStatePending,
			Amount: 30000, ExpiredAt: time.Now().Add(2 * time.Minute), StatusCheckedAt: &checkedAt,
		}
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).Return(domain.Transaction{Id: transactionId}, nil)

		req := httptest.NewRequest(http.MethodGet, "/payments/"+payment.PartnerReferenceNo, nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req.Header.Set("X-Order-Access-Key", accessKey)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handlerWithCancelEnabled(true).GetPaymentByPartnerReferenceNo(w, req)

		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.False(t, resp.Data.CanCancel)
	})
}

func cancelPendingPaymentFixture() domain.Payment {
	transactionId := int64(99)
	return domain.Payment{
		Id: 7, CartId: 1, SessionId: testSessionId, TransactionId: &transactionId,
		PartnerReferenceNo: "ORD1234567890AB", GatewayReferenceNo: "gw-old",
		Method: domain.PaymentMethodQris, Status: domain.PaymentStatePending,
		Amount: 30000, ExpiredAt: time.Now().Add(2 * time.Minute),
	}
}

func TestPaymentHandler_Cancel(t *testing.T) {
	t.Run("the flag off is a 400, with no repository access at all", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)

		req := httptest.NewRequest(http.MethodPost, "/payments/ORD1234567890AB/cancel", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": "ORD1234567890AB"})
		w := httptest.NewRecorder()
		m.handler().Cancel(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("an unknown reference is 404", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), "ORDUNKNOWN000AB").
			Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		req := httptest.NewRequest(http.MethodPost, "/payments/ORDUNKNOWN000AB/cancel", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": "ORDUNKNOWN000AB"})
		w := httptest.NewRecorder()
		m.handlerWithCancelEnabled(true).Cancel(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("a payment belonging to a different session is 404, even with the correct access key", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		accessKey := "q3Vd0bX9pL2sR8tY1wZa7c"
		payment := cancelPendingPaymentFixture()
		payment.SessionId = "someone-elses-session"
		payment.AccessKey = &accessKey
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		req := httptest.NewRequest(http.MethodPost, "/payments/"+payment.PartnerReferenceNo+"/cancel", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req.Header.Set("X-Order-Access-Key", accessKey)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handlerWithCancelEnabled(true).Cancel(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})

	t.Run("cancels a pending cash payment and unfreezes its cart", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		payment := cancelPendingPaymentFixture()
		payment.Method = domain.PaymentMethodCash
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStateCancelled, p.Status)
				require.NotNil(t, p.CancelReason)
				assert.Equal(t, domain.PaymentCancelReasonGuest, *p.CancelReason)
				return p, nil
			})
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil).Times(2)
		m.transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)

		req := httptest.NewRequest(http.MethodPost, "/payments/"+payment.PartnerReferenceNo+"/cancel", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handlerWithCancelEnabled(true).Cancel(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Equal(t, "cancelled", resp.Data.Status)
	})

	t.Run("a qris cancel confirms with doku first, and cancels once doku reports it is still pending", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		payment := cancelPendingPaymentFixture()
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

		req := httptest.NewRequest(http.MethodPost, "/payments/"+payment.PartnerReferenceNo+"/cancel", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handlerWithCancelEnabled(true).Cancel(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Equal(t, "cancelled", resp.Data.Status)
	})

	t.Run("a qris cancel that finds doku already paid pays instead of cancelling (D4)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		payment := cancelPendingPaymentFixture()
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.gatewayRepo.EXPECT().QueryQris(gomock.Any(), gomock.Any()).
			Return(domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, GatewayReferenceNo: "gw-new", Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).
			Return(domain.Transaction{Id: 99, Total: payment.Amount}, nil).Times(2)
		m.walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(paymentHandlerOrderPaymentWalletId)).
			Return(domain.Wallet{Id: paymentHandlerOrderPaymentWalletId, Name: "QRIS", IsPaymentTarget: true}, nil)
		m.walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(paymentHandlerOrderPaymentWalletId)).
			Return(domain.Wallet{}, nil)
		m.transactionRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), int64(99)).
			Return(domain.Transaction{}, nil)
		m.transactionRepo.EXPECT().PayTransaction(gomock.Any(), int64(paymentHandlerOrderPaymentWalletId), gomock.Any(), payment.Amount, int64(99)).
			Return(nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) {
				assert.Equal(t, domain.PaymentStatePaid, p.Status)
				return p, nil
			})
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) { return cart, nil })
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), payment.CartId).
			Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		req := httptest.NewRequest(http.MethodPost, "/payments/"+payment.PartnerReferenceNo+"/cancel", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handlerWithCancelEnabled(true).Cancel(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Equal(t, "paid", resp.Data.Status)
	})

	t.Run("a doku query error does not block the cancel", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		payment := cancelPendingPaymentFixture()
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

		req := httptest.NewRequest(http.MethodPost, "/payments/"+payment.PartnerReferenceNo+"/cancel", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handlerWithCancelEnabled(true).Cancel(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Equal(t, "cancelled", resp.Data.Status)
	})

	t.Run("a payment already outside pending is returned unchanged (D3, idempotent)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		payment := cancelPendingPaymentFixture()
		payment.Status = domain.PaymentStateExpired
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)

		req := httptest.NewRequest(http.MethodPost, "/payments/"+payment.PartnerReferenceNo+"/cancel", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		req = mux.SetURLVars(req, map[string]string{"partnerReferenceNo": payment.PartnerReferenceNo})
		w := httptest.NewRecorder()
		m.handlerWithCancelEnabled(true).Cancel(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp apiContract.PaymentResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Equal(t, "expired", resp.Data.Status)
	})
}

func TestPaymentCancelRoute_RequiresSessionId(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	m := newPaymentHandlerMocks(ctrl)

	router := mux.NewRouter()
	restapi.NewPaymentRouter(m.handlerWithCancelEnabled(true)).AddRouter(router)

	req := httptest.NewRequest(http.MethodPost, "/payments/ORD1234567890AB/cancel", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPaymentHandler_GetPaymentList(t *testing.T) {
	t.Run("returns paid orders newest first with the total from the session", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)

		transactionId1 := int64(101)
		transactionId2 := int64(102)
		payments := []domain.Payment{
			{PartnerReferenceNo: "ORD2", SessionId: testSessionId, Status: domain.PaymentStatePaid, Amount: 20000, TransactionId: &transactionId2},
			{PartnerReferenceNo: "ORD1", SessionId: testSessionId, Status: domain.PaymentStatePaid, Amount: 45000, TransactionId: &transactionId1},
		}
		m.paymentRepo.EXPECT().GetPaymentsBySessionId(gomock.Any(), testSessionId, 0, 0).Return(payments, nil)
		m.paymentRepo.EXPECT().GetPaymentsBySessionIdTotal(gomock.Any(), testSessionId).Return(int64(2), nil)
		m.transactionRepo.EXPECT().GetTransactionSummariesByIds(gomock.Any(), []int64{transactionId2, transactionId1}).
			Return([]domain.TransactionSummary{
				{Id: transactionId2, TransactionNumber: 2, Name: "Budi", TableLabel: "Meja 1", ItemCount: 1},
				{Id: transactionId1, TransactionNumber: 1, Name: "Andi", TableLabel: "Meja 3", ItemCount: 3},
			}, nil)

		req := httptest.NewRequest(http.MethodGet, "/payments", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		w := httptest.NewRecorder()
		m.handler().GetPaymentList(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var resp apiContract.PaymentListResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
		assert.Equal(t, int64(2), resp.Meta.Total)
		assert.Len(t, resp.Data, 2)
		assert.Equal(t, "ORD2", resp.Data[0].PartnerReferenceNo)
		assert.Equal(t, "Budi", resp.Data[0].CustomerName)
		assert.Equal(t, "ORD1", resp.Data[1].PartnerReferenceNo)
		assert.Equal(t, "Andi", resp.Data[1].CustomerName)
	})

	t.Run("an invalid limit is a 400", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)

		req := httptest.NewRequest(http.MethodGet, "/payments?limit=not-a-number", nil)
		req.Header.Set("X-Session-Id", testSessionId)
		w := httptest.NewRecorder()
		m.handler().GetPaymentList(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestPaymentGetRoute_RequiresSessionId(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	m := newPaymentHandlerMocks(ctrl)

	router := mux.NewRouter()
	restapi.NewPaymentRouter(m.handler()).AddRouter(router)

	req := httptest.NewRequest(http.MethodGet, "/payments/ORD1234567890AB", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPaymentListRoute_RequiresSessionId(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	m := newPaymentHandlerMocks(ctrl)

	router := mux.NewRouter()
	restapi.NewPaymentRouter(m.handler()).AddRouter(router)

	req := httptest.NewRequest(http.MethodGet, "/payments", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPaymentRoute_RequiresSessionId(t *testing.T) {
	tests := []struct {
		name      string
		sessionId string
	}{
		{name: "missing X-Session-Id", sessionId: ""},
		{name: "malformed X-Session-Id", sessionId: "not-a-uuid"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			m := newPaymentHandlerMocks(ctrl)

			router := mux.NewRouter()
			restapi.NewPaymentRouter(m.handler()).AddRouter(router)

			req := httptest.NewRequest(http.MethodPost, "/carts/current/checkout", checkoutRequestBody("Budi"))
			if tt.sessionId != "" {
				req.Header.Set("X-Session-Id", tt.sessionId)
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
		})
	}
}

func dokuNotificationBody(partnerReferenceNo, gatewayReferenceNo, transactionStatus, amount string) []byte {
	body, _ := json.Marshal(apiContract.DokuNotificationRequest{
		OriginalPartnerReferenceNo: partnerReferenceNo,
		OriginalReferenceNo:        gatewayReferenceNo,
		LatestTransactionStatus:    transactionStatus,
		TransactionStatusDesc:      "",
		Amount: apiContract.DokuNotificationRequestAmount{
			Value:    amount,
			Currency: "IDR",
		},
	})
	return body
}

func TestPaymentHandler_Notification(t *testing.T) {
	t.Run("a valid paid notification pays the transaction and returns success", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		transactionId := int64(50)
		payment := domain.Payment{
			Id: 7, CartId: 1, TransactionId: &transactionId,
			PartnerReferenceNo: "ORD1234567890AB", Status: domain.PaymentStatePending, Amount: 30000,
		}
		notificationBody := dokuNotificationBody(payment.PartnerReferenceNo, "gw-1", "00", "30000.00")

		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
		m.transactionRepo.EXPECT().GetTransactionById(gomock.Any(), transactionId).
			Return(domain.Transaction{Id: transactionId, Total: payment.Amount}, nil)
		m.walletRepo.EXPECT().GetWalletById(gomock.Any(), int64(paymentHandlerOrderPaymentWalletId)).
			Return(domain.Wallet{Id: paymentHandlerOrderPaymentWalletId, Name: "QRIS", IsPaymentTarget: true}, nil)
		m.walletRepo.EXPECT().UpdateWalletById(gomock.Any(), gomock.Any(), int64(paymentHandlerOrderPaymentWalletId)).
			Return(domain.Wallet{}, nil)
		m.transactionRepo.EXPECT().UpdateTransactionById(gomock.Any(), gomock.Any(), transactionId).
			Return(domain.Transaction{}, nil)
		m.transactionRepo.EXPECT().PayTransaction(gomock.Any(), int64(paymentHandlerOrderPaymentWalletId), gomock.Any(), payment.Amount, transactionId).
			Return(nil)
		m.paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), payment.Id).
			DoAndReturn(func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
		m.cartRepo.EXPECT().GetCartById(gomock.Any(), payment.CartId).
			Return(domain.Cart{Id: 1, Status: domain.CartStatusActive}, nil)
		m.cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).
			DoAndReturn(func(_ context.Context, cart domain.Cart, id int64) (domain.Cart, *domain.Error) {
				assert.Equal(t, domain.CartStatusConverted, cart.Status)
				return cart, nil
			})
		// D7: no other pending payment on the same cart to supersede.
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		req := httptest.NewRequest(http.MethodPost, "/payments/doku/notification", bytes.NewReader(notificationBody))
		w := httptest.NewRecorder()
		m.handler().Notification(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		var response apiContract.SuccessResponse
		assert.NoError(t, json.NewDecoder(w.Body).Decode(&response))
		assert.True(t, response.Success)
	})

	t.Run("an unknown reference still returns success", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		notificationBody := dokuNotificationBody("ORD1234567890AB", "gw-1", "00", "30000.00")
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), "ORD1234567890AB").
			Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})

		req := httptest.NewRequest(http.MethodPost, "/payments/doku/notification", bytes.NewReader(notificationBody))
		w := httptest.NewRecorder()
		m.handler().Notification(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("a duplicate notification for an already-paid payment still returns success and pays nothing again", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		payment := domain.Payment{
			Id: 7, CartId: 1, PartnerReferenceNo: "ORD1234567890AB",
			Status: domain.PaymentStatePaid, Amount: 30000,
		}
		notificationBody := dokuNotificationBody(payment.PartnerReferenceNo, "gw-1", "00", "30000.00")
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		req := httptest.NewRequest(http.MethodPost, "/payments/doku/notification", bytes.NewReader(notificationBody))
		w := httptest.NewRecorder()
		m.handler().Notification(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("an amount mismatch returns success but pays nothing", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)

		payment := domain.Payment{
			Id: 7, CartId: 1, PartnerReferenceNo: "ORD1234567890AB",
			Status: domain.PaymentStatePending, Amount: 30000,
		}
		notificationBody := dokuNotificationBody(payment.PartnerReferenceNo, "gw-1", "00", "10000.00")
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNoForUpdate(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		req := httptest.NewRequest(http.MethodPost, "/payments/doku/notification", bytes.NewReader(notificationBody))
		w := httptest.NewRecorder()
		m.handler().Notification(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}
