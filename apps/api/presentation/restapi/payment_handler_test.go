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

type paymentHandlerMocks struct {
	paymentRepo     *mock.MockPaymentRepository
	gatewayRepo     *mock.MockPaymentGatewayRepository
	customerRepo    *mock.MockCustomerRepository
	cartRepo        *mock.MockCartRepository
	transactionRepo *mock.MockTransactionRepository
	variantRepo     *mock.MockVariantRepository
}

func newPaymentHandlerMocks(ctrl *gomock.Controller) paymentHandlerMocks {
	return paymentHandlerMocks{
		paymentRepo:     mock.NewMockPaymentRepository(ctrl),
		gatewayRepo:     mock.NewMockPaymentGatewayRepository(ctrl),
		customerRepo:    mock.NewMockCustomerRepository(ctrl),
		cartRepo:        mock.NewMockCartRepository(ctrl),
		transactionRepo: mock.NewMockTransactionRepository(ctrl),
		variantRepo:     mock.NewMockVariantRepository(ctrl),
	}
}

func (m paymentHandlerMocks) handler() restapi.PaymentHandler {
	customerUsecase := domain.NewCustomerUsecase(m.customerRepo)
	usecase := domain.NewPaymentUsecase(m.paymentRepo, m.gatewayRepo, customerUsecase, m.cartRepo, m.transactionRepo, m.variantRepo, 300)
	return restapi.NewPaymentHandler(usecase)
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

		m.customerRepo.EXPECT().GetCustomerBySessionId(gomock.Any(), testSessionId).Return(domain.Customer{}, &domain.Error{Type: domain.NotFound})
		m.customerRepo.EXPECT().CreateCustomer(gomock.Any(), domain.Customer{SessionId: testSessionId, Name: "Budi"}).
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

		m.customerRepo.EXPECT().GetCustomerBySessionId(gomock.Any(), testSessionId).Return(domain.Customer{}, &domain.Error{Type: domain.NotFound})
		m.customerRepo.EXPECT().CreateCustomer(gomock.Any(), gomock.Any()).
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

		m.customerRepo.EXPECT().GetCustomerBySessionId(gomock.Any(), testSessionId).Return(domain.Customer{}, &domain.Error{Type: domain.NotFound})
		m.customerRepo.EXPECT().CreateCustomer(gomock.Any(), gomock.Any()).
			Return(domain.Customer{Id: 1, SessionId: testSessionId, Name: "Budi"}, nil)
		m.cartRepo.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})

		req := httptest.NewRequest(http.MethodPost, "/carts/current/checkout", checkoutRequestBody("Budi"))
		req.Header.Set("X-Session-Id", testSessionId)
		w := httptest.NewRecorder()
		m.handler().Checkout(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestPaymentRoute_RequiresSessionId mirrors
// TestCustomerRoute_RequiresSessionId: the checkout route is guarded by
// RequireSessionId, never CheckAuth (D8), and a request rejected by the
// guard must never reach any repository.
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

			// No EXPECT on any repository: a request rejected by the guard
			// must never reach the usecase.
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
