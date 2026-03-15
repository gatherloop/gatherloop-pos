package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestCouponHandler_GetCouponList(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(r *mock.MockCouponRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().GetCouponList(gomock.Any()).Return([]domain.Coupon{{Id: 1, Code: "DISC10"}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().GetCouponList(gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockCouponRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewCouponHandler(domain.NewCouponUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/coupons", nil)
			w := httptest.NewRecorder()
			handler.GetCouponList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCouponHandler_GetCouponById(t *testing.T) {
	tests := []struct {
		name           string
		couponId       string
		setupMock      func(r *mock.MockCouponRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			couponId: "1",
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().GetCouponById(gomock.Any(), int64(1)).Return(domain.Coupon{Id: 1, Code: "DISC10"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:     "not found",
			couponId: "99",
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().GetCouponById(gomock.Any(), int64(99)).Return(domain.Coupon{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			couponId:       "abc",
			setupMock:      func(r *mock.MockCouponRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockCouponRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewCouponHandler(domain.NewCouponUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodGet, "/coupons/"+tt.couponId, nil)
			req = mux.SetURLVars(req, map[string]string{"couponId": tt.couponId})
			w := httptest.NewRecorder()
			handler.GetCouponById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCouponHandler_CreateCoupon(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(r *mock.MockCouponRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"code": "DISC10", "type": "fixed", "amount": 10000}`,
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().CreateCoupon(gomock.Any(), gomock.Any()).Return(domain.Coupon{Id: 1, Code: "DISC10"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockCouponRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"code": "DISC10", "type": "fixed", "amount": 10000}`,
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().CreateCoupon(gomock.Any(), gomock.Any()).Return(domain.Coupon{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockCouponRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewCouponHandler(domain.NewCouponUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPost, "/coupons", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateCoupon(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCouponHandler_UpdateCouponById(t *testing.T) {
	tests := []struct {
		name           string
		couponId       string
		body           string
		setupMock      func(r *mock.MockCouponRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			couponId: "1",
			body:     `{"code": "DISC20", "type": "fixed", "amount": 20000}`,
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().UpdateCouponById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Coupon{Id: 1, Code: "DISC20"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			couponId:       "abc",
			body:           `{}`,
			setupMock:      func(r *mock.MockCouponRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "not found",
			couponId: "99",
			body:     `{"code": "DISC20", "type": "fixed", "amount": 20000}`,
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().UpdateCouponById(gomock.Any(), gomock.Any(), int64(99)).Return(domain.Coupon{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockCouponRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewCouponHandler(domain.NewCouponUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodPut, "/coupons/"+tt.couponId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"couponId": tt.couponId})
			w := httptest.NewRecorder()
			handler.UpdateCouponById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCouponHandler_DeleteCouponById(t *testing.T) {
	tests := []struct {
		name           string
		couponId       string
		setupMock      func(r *mock.MockCouponRepository)
		expectedStatus int
	}{
		{
			name:     "success",
			couponId: "1",
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().DeleteCouponById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			couponId:       "abc",
			setupMock:      func(r *mock.MockCouponRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "not found",
			couponId: "99",
			setupMock: func(r *mock.MockCouponRepository) {
				r.EXPECT().DeleteCouponById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			mockRepo := mock.NewMockCouponRepository(ctrl)
			tt.setupMock(mockRepo)
			handler := restapi.NewCouponHandler(domain.NewCouponUsecase(mockRepo))
			req := httptest.NewRequest(http.MethodDelete, "/coupons/"+tt.couponId, nil)
			req = mux.SetURLVars(req, map[string]string{"couponId": tt.couponId})
			w := httptest.NewRecorder()
			handler.DeleteCouponById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
