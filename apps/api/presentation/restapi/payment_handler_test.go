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

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

const paymentHandlerOrderPaymentWalletId = 9

type paymentHandlerMocks struct {
	paymentRepo     *mock.MockPaymentRepository
	gatewayRepo     *mock.MockPaymentGatewayRepository
	customerRepo    *mock.MockCustomerRepository
	cartRepo        *mock.MockCartRepository
	transactionRepo *mock.MockTransactionRepository
	variantRepo     *mock.MockVariantRepository
	walletRepo      *mock.MockWalletRepository
}

func newPaymentHandlerMocks(ctrl *gomock.Controller) paymentHandlerMocks {
	return paymentHandlerMocks{
		paymentRepo:     mock.NewMockPaymentRepository(ctrl),
		gatewayRepo:     mock.NewMockPaymentGatewayRepository(ctrl),
		customerRepo:    mock.NewMockCustomerRepository(ctrl),
		cartRepo:        mock.NewMockCartRepository(ctrl),
		transactionRepo: mock.NewMockTransactionRepository(ctrl),
		variantRepo:     mock.NewMockVariantRepository(ctrl),
		walletRepo:      mock.NewMockWalletRepository(ctrl),
	}
}

func (m paymentHandlerMocks) handler() restapi.PaymentHandler {
	usecase := domain.NewPaymentUsecase(m.paymentRepo, m.gatewayRepo, m.customerRepo, m.cartRepo, m.transactionRepo, m.variantRepo, m.walletRepo, 300, paymentHandlerOrderPaymentWalletId)
	return restapi.NewPaymentHandler(usecase)
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

func TestPaymentHandler_Checkout(t *testing.T) {
	t.Run("a successful checkout returns the payment with its QR", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)
		expectValidPaymentWallet(m)

		m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), testSessionId, "Budi").
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
		assert.Equal(t, "Budi", resp.Data.CustomerName)
		assert.Equal(t, "Meja 1", resp.Data.TableLabel)
	})

	t.Run("a gateway failure is answered 502, not 500, and the body still carries internal_server_error", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		m := newPaymentHandlerMocks(ctrl)
		withPaymentHandlerTransactionMock(m.paymentRepo)
		expectValidPaymentWallet(m)

		m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), testSessionId, gomock.Any()).
			Return(domain.Customer{Id: 1, SessionId: testSessionId, Name: "Budi"}, nil)

		tableId := int64(5)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{
			Id: 1, TableId: &tableId, Status: domain.CartStatusActive,
			Items: []domain.CartItem{{Id: 1, VariantId: 10, Amount: 1}},
		}, nil)
		m.paymentRepo.EXPECT().GetPendingPaymentByCartId(gomock.Any(), int64(1)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
		m.variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(domain.Variant{Id: 10, Price: 15000, Product: domain.Product{Name: "Kopi Susu"}}, nil)
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

		m.customerRepo.EXPECT().UpsertCustomerBySessionId(gomock.Any(), testSessionId, gomock.Any()).
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
			restapi.NewPaymentRouter(m.handler(), m.gatewayRepo).AddRouter(router)

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

var notificationBody = []byte(`{"originalPartnerReferenceNo":"ORD1234567890AB"}`)

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
		status := domain.QrisStatus{
			PartnerReferenceNo: payment.PartnerReferenceNo,
			GatewayReferenceNo: "gw-1",
			Status:             domain.PaymentGatewayStatusPaid,
			PaidAmount:         payment.Amount,
		}

		m.gatewayRepo.EXPECT().ParseNotification(notificationBody).Return(status, nil)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)
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

		status := domain.QrisStatus{PartnerReferenceNo: "ORD1234567890AB", Status: domain.PaymentGatewayStatusPaid, PaidAmount: 30000}
		m.gatewayRepo.EXPECT().ParseNotification(notificationBody).Return(status, nil)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), "ORD1234567890AB").
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
		status := domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPaid, PaidAmount: payment.Amount}
		m.gatewayRepo.EXPECT().ParseNotification(notificationBody).Return(status, nil)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

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
		status := domain.QrisStatus{PartnerReferenceNo: payment.PartnerReferenceNo, Status: domain.PaymentGatewayStatusPaid, PaidAmount: 10000}
		m.gatewayRepo.EXPECT().ParseNotification(notificationBody).Return(status, nil)
		m.paymentRepo.EXPECT().GetPaymentByPartnerReferenceNo(gomock.Any(), payment.PartnerReferenceNo).Return(payment, nil)

		req := httptest.NewRequest(http.MethodPost, "/payments/doku/notification", bytes.NewReader(notificationBody))
		w := httptest.NewRecorder()
		m.handler().Notification(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}
