package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newPaymentVerificationHandler(t *testing.T, setupMocks func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository)) (restapi.PaymentVerificationHandler, *gomock.Controller) {
	ctrl := gomock.NewController(t)
	paymentRepo := mock.NewMockPaymentRepository(ctrl)
	verificationRepo := mock.NewMockPaymentVerificationRepository(ctrl)
	transactionRepo := mock.NewMockTransactionRepository(ctrl)
	cartRepo := mock.NewMockCartRepository(ctrl)
	availabilityRepo := mock.NewMockAvailabilityReservationRepository(ctrl)
	kdsNotificationRepo := mock.NewMockKdsNotificationRepository(ctrl)
	kdsNotificationRepo.EXPECT().EnqueueForTransaction(gomock.Any(), gomock.Any(), gomock.Any()).Return(nil).AnyTimes()
	kdsNotificationDispatcher := mock.NewMockKdsNotificationDispatcher(ctrl)
	kdsNotificationDispatcher.EXPECT().TriggerDispatch().AnyTimes()
	paymentRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) }).AnyTimes()

	setupMocks(paymentRepo, verificationRepo, transactionRepo, cartRepo)

	usecase := domain.NewPaymentVerificationUsecase(paymentRepo, verificationRepo, transactionRepo, cartRepo, domain.NewAvailabilityReservation(availabilityRepo), kdsNotificationRepo, kdsNotificationDispatcher)
	return restapi.NewPaymentVerificationHandler(usecase), ctrl
}

func TestPaymentVerificationHandler_GetVerification(t *testing.T) {
	tests := []struct {
		name           string
		transactionId  string
		setupMocks     func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			transactionId: "99",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository) {
				paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(99)).Return(domain.Payment{Id: 1, Method: domain.PaymentMethodCod}, nil)
				verificationRepo.EXPECT().GetByPaymentId(gomock.Any(), int64(1)).Return(domain.PaymentVerificationPhoto{ContentType: "image/jpeg", Data: []byte("photo"), CreatedAt: time.Now()}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:          "invalid transaction id",
			transactionId: "abc",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "not found",
			transactionId: "99",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository) {
				paymentRepo.EXPECT().GetPaymentByTransactionId(gomock.Any(), int64(99)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newPaymentVerificationHandler(t, func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository) {
				tt.setupMocks(paymentRepo, verificationRepo)
			})
			defer ctrl.Finish()

			req := httptest.NewRequest(http.MethodGet, "/transactions/"+tt.transactionId+"/verification", nil)
			req = mux.SetURLVars(req, map[string]string{"transactionId": tt.transactionId})
			w := httptest.NewRecorder()

			handler.GetVerification(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestPaymentVerificationHandler_Approve(t *testing.T) {
	tests := []struct {
		name           string
		transactionId  string
		setupMocks     func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			transactionId: "99",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository) {
				awaiting := domain.PaymentVerificationStatusAwaiting
				txId := int64(99)
				payment := domain.Payment{Id: 1, CartId: 7, TransactionId: &txId, Method: domain.PaymentMethodCod, Status: domain.PaymentStatePending, VerificationStatus: &awaiting}
				paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)
				paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(1)).DoAndReturn(
					func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
				verificationRepo.EXPECT().DeleteByPaymentId(gomock.Any(), int64(1)).Return(nil)
				transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)
				cartRepo.EXPECT().GetCartById(gomock.Any(), int64(7)).Return(domain.Cart{Id: 7}, nil)
				cartRepo.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(7)).DoAndReturn(
					func(_ context.Context, c domain.Cart, id int64) (domain.Cart, *domain.Error) { return c, nil })
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:          "invalid transaction id",
			transactionId: "abc",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "not a cod order",
			transactionId: "99",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository) {
				paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(domain.Payment{Method: domain.PaymentMethodQris, Status: domain.PaymentStatePending}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "no linked payment",
			transactionId: "99",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository) {
				paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newPaymentVerificationHandler(t, tt.setupMocks)
			defer ctrl.Finish()

			req := httptest.NewRequest(http.MethodPut, "/transactions/"+tt.transactionId+"/verification/approve", nil)
			req = mux.SetURLVars(req, map[string]string{"transactionId": tt.transactionId})
			w := httptest.NewRecorder()

			handler.Approve(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestPaymentVerificationHandler_Reject(t *testing.T) {
	tests := []struct {
		name           string
		transactionId  string
		setupMocks     func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository)
		expectedStatus int
	}{
		{
			name:          "success",
			transactionId: "99",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository) {
				awaiting := domain.PaymentVerificationStatusAwaiting
				txId := int64(99)
				payment := domain.Payment{Id: 1, TransactionId: &txId, Method: domain.PaymentMethodCod, Status: domain.PaymentStatePending, VerificationStatus: &awaiting}
				paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(payment, nil)
				paymentRepo.EXPECT().UpdatePaymentById(gomock.Any(), gomock.Any(), int64(1)).DoAndReturn(
					func(_ context.Context, p domain.Payment, id int64) (domain.Payment, *domain.Error) { return p, nil })
				transactionRepo.EXPECT().GetTransactionById(gomock.Any(), int64(99)).Return(domain.Transaction{Id: 99}, nil)
				transactionRepo.EXPECT().DeleteTransactionById(gomock.Any(), int64(99)).Return(nil)
				verificationRepo.EXPECT().DeleteByPaymentId(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:          "invalid transaction id",
			transactionId: "abc",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "already decided",
			transactionId: "99",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository) {
				approved := domain.PaymentVerificationStatusApproved
				paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(domain.Payment{Method: domain.PaymentMethodCod, Status: domain.PaymentStatePending, VerificationStatus: &approved}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:          "no linked payment",
			transactionId: "99",
			setupMocks: func(paymentRepo *mock.MockPaymentRepository, verificationRepo *mock.MockPaymentVerificationRepository, transactionRepo *mock.MockTransactionRepository, cartRepo *mock.MockCartRepository) {
				paymentRepo.EXPECT().GetPaymentByTransactionIdForUpdate(gomock.Any(), int64(99)).Return(domain.Payment{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, ctrl := newPaymentVerificationHandler(t, tt.setupMocks)
			defer ctrl.Finish()

			req := httptest.NewRequest(http.MethodPut, "/transactions/"+tt.transactionId+"/verification/reject", nil)
			req = mux.SetURLVars(req, map[string]string{"transactionId": tt.transactionId})
			w := httptest.NewRecorder()

			handler.Reject(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestPaymentVerificationRoutes_RequireAuth(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	usecase := domain.NewPaymentVerificationUsecase(
		mock.NewMockPaymentRepository(ctrl),
		mock.NewMockPaymentVerificationRepository(ctrl),
		mock.NewMockTransactionRepository(ctrl),
		mock.NewMockCartRepository(ctrl),
		domain.NewAvailabilityReservation(mock.NewMockAvailabilityReservationRepository(ctrl)),
		mock.NewMockKdsNotificationRepository(ctrl),
		mock.NewMockKdsNotificationDispatcher(ctrl),
	)
	handler := restapi.NewPaymentVerificationHandler(usecase)
	router := mux.NewRouter()
	restapi.NewPaymentVerificationRouter(handler).AddRouter(router)

	tests := []struct {
		method string
		path   string
	}{
		{method: http.MethodGet, path: "/transactions/1/verification"},
		{method: http.MethodPut, path: "/transactions/1/verification/approve"},
		{method: http.MethodPut, path: "/transactions/1/verification/reject"},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusUnauthorized, w.Code)
		})
	}
}
