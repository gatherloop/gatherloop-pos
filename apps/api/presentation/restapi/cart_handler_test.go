package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

const testSessionId = "3fa85f64-5717-4562-b3fc-2c963f66afa6"

func withCartTransactionMock(r *mock.MockCartRepository) {
	r.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
		func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
}

func newCartTestHandler(cartRepo *mock.MockCartRepository, variantRepo *mock.MockVariantRepository, tableRepo *mock.MockTableRepository) restapi.CartHandler {
	return restapi.NewCartHandler(domain.NewCartUsecase(cartRepo, variantRepo, tableRepo))
}

func TestCartHandler_GetCurrentCart(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(r *mock.MockCartRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockCartRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{Id: 1, SessionId: testSessionId}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "no cart yet still returns 200 with an empty cart",
			setupMock: func(r *mock.MockCartRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			setupMock: func(r *mock.MockCartRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{}, &domain.Error{Type: domain.InternalServerError})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(cartRepo)

			handler := newCartTestHandler(cartRepo, variantRepo, tableRepo)
			req := httptest.NewRequest(http.MethodGet, "/carts/current", nil)
			req.Header.Set("X-Session-Id", testSessionId)
			w := httptest.NewRecorder()
			handler.GetCurrentCart(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCartHandler_UpdateCartTable(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(cr *mock.MockCartRepository, tr *mock.MockTableRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"tableCode": "0123456789"}`,
			setupMock: func(cr *mock.MockCartRepository, tr *mock.MockTableRepository) {
				withCartTransactionMock(cr)
				tr.EXPECT().GetTableByCode(gomock.Any(), "0123456789").Return(domain.Table{Id: 5, Label: "Meja 1"}, nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{Id: 1, SessionId: testSessionId}, nil)
				cr.EXPECT().UpdateCartById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, SessionId: testSessionId, TableId: ptrTestInt64(5)}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(cr *mock.MockCartRepository, tr *mock.MockTableRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "malformed table code",
			body:           `{"tableCode": "short"}`,
			setupMock:      func(cr *mock.MockCartRepository, tr *mock.MockTableRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "unknown table code",
			body: `{"tableCode": "ZZZZZZZZZZ"}`,
			setupMock: func(cr *mock.MockCartRepository, tr *mock.MockTableRepository) {
				withCartTransactionMock(cr)
				tr.EXPECT().GetTableByCode(gomock.Any(), "ZZZZZZZZZZ").Return(domain.Table{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(cartRepo, tableRepo)

			handler := newCartTestHandler(cartRepo, variantRepo, tableRepo)
			req := httptest.NewRequest(http.MethodPut, "/carts/current", bytes.NewBufferString(tt.body))
			req.Header.Set("X-Session-Id", testSessionId)
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.UpdateCartTable(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCartHandler_AddCartItem(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"variantId": 10, "amount": 2, "note": "less sugar"}`,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository) {
				withCartTransactionMock(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(10)).Return(domain.Variant{
					Id: 10, Price: 15000,
					Product: domain.Product{Status: domain.ProductStatusPublished, SaleType: domain.SaleTypePurchase},
				}, nil)
				cr.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{Id: 1, SessionId: testSessionId}, nil)
				cr.EXPECT().CreateCartItem(gomock.Any(), gomock.Any()).Return(domain.CartItem{Id: 100, VariantId: 10, Amount: 2, Note: "less sugar"}, nil)
				cr.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, SessionId: testSessionId, Items: []domain.CartItem{{Id: 100, VariantId: 10, Amount: 2, Note: "less sugar"}}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "draft product rejected",
			body: `{"variantId": 11, "amount": 1}`,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository) {
				withCartTransactionMock(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(11)).Return(domain.Variant{
					Id: 11, Product: domain.Product{Status: domain.ProductStatusDraft, SaleType: domain.SaleTypePurchase},
				}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "unknown variant",
			body: `{"variantId": 999, "amount": 1}`,
			setupMock: func(cr *mock.MockCartRepository, vr *mock.MockVariantRepository) {
				withCartTransactionMock(cr)
				vr.EXPECT().GetVariantById(gomock.Any(), int64(999)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(cartRepo, variantRepo)

			handler := newCartTestHandler(cartRepo, variantRepo, tableRepo)
			req := httptest.NewRequest(http.MethodPost, "/carts/current/items", bytes.NewBufferString(tt.body))
			req.Header.Set("X-Session-Id", testSessionId)
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.AddCartItem(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCartHandler_UpdateCartItem(t *testing.T) {
	tests := []struct {
		name           string
		cartItemId     string
		body           string
		setupMock      func(r *mock.MockCartRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			cartItemId: "50",
			body:       `{"amount": 3}`,
			setupMock: func(r *mock.MockCartRepository) {
				withCartTransactionMock(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
				r.EXPECT().UpdateCartItemById(gomock.Any(), gomock.Any(), int64(50)).Return(domain.CartItem{Id: 50, Amount: 3}, nil)
				r.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, Items: []domain.CartItem{{Id: 50, Amount: 3}}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid cart item id",
			cartItemId:     "abc",
			body:           `{"amount": 1}`,
			setupMock:      func(r *mock.MockCartRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "invalid JSON body",
			cartItemId:     "50",
			body:           `{invalid`,
			setupMock:      func(r *mock.MockCartRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:       "item not owned by this session",
			cartItemId: "999",
			body:       `{"amount": 1}`,
			setupMock: func(r *mock.MockCartRepository) {
				withCartTransactionMock(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(cartRepo)

			handler := newCartTestHandler(cartRepo, variantRepo, tableRepo)
			req := httptest.NewRequest(http.MethodPut, "/carts/current/items/"+tt.cartItemId, bytes.NewBufferString(tt.body))
			req.Header.Set("X-Session-Id", testSessionId)
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"cartItemId": tt.cartItemId})
			w := httptest.NewRecorder()
			handler.UpdateCartItem(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCartHandler_RemoveCartItem(t *testing.T) {
	tests := []struct {
		name           string
		cartItemId     string
		setupMock      func(r *mock.MockCartRepository)
		expectedStatus int
	}{
		{
			name:       "success",
			cartItemId: "50",
			setupMock: func(r *mock.MockCartRepository) {
				withCartTransactionMock(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
				r.EXPECT().DeleteCartItemById(gomock.Any(), int64(50)).Return(nil)
				r.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, Items: []domain.CartItem{}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid cart item id",
			cartItemId:     "abc",
			setupMock:      func(r *mock.MockCartRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:       "item not owned by this session",
			cartItemId: "999",
			setupMock: func(r *mock.MockCartRepository) {
				withCartTransactionMock(r)
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{
					Id: 1, Items: []domain.CartItem{{Id: 50, VariantId: 10, Amount: 1}},
				}, nil)
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(cartRepo)

			handler := newCartTestHandler(cartRepo, variantRepo, tableRepo)
			req := httptest.NewRequest(http.MethodDelete, "/carts/current/items/"+tt.cartItemId, nil)
			req.Header.Set("X-Session-Id", testSessionId)
			req = mux.SetURLVars(req, map[string]string{"cartItemId": tt.cartItemId})
			w := httptest.NewRecorder()
			handler.RemoveCartItem(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestCartHandler_ClearCart(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(r *mock.MockCartRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(r *mock.MockCartRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{Id: 1, Items: []domain.CartItem{{Id: 50}}}, nil)
				r.EXPECT().DeleteCartItemsByCartId(gomock.Any(), int64(1)).Return(nil)
				r.EXPECT().GetCartById(gomock.Any(), int64(1)).Return(domain.Cart{Id: 1, Items: []domain.CartItem{}}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "no cart yet still returns 200",
			setupMock: func(r *mock.MockCartRepository) {
				r.EXPECT().GetActiveCartBySessionId(gomock.Any(), testSessionId).Return(domain.Cart{}, &domain.Error{Type: domain.NotFound})
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			cartRepo := mock.NewMockCartRepository(ctrl)
			variantRepo := mock.NewMockVariantRepository(ctrl)
			tableRepo := mock.NewMockTableRepository(ctrl)
			tt.setupMock(cartRepo)

			handler := newCartTestHandler(cartRepo, variantRepo, tableRepo)
			req := httptest.NewRequest(http.MethodDelete, "/carts/current", nil)
			req.Header.Set("X-Session-Id", testSessionId)
			w := httptest.NewRecorder()
			handler.ClearCart(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func ptrTestInt64(v int64) *int64 {
	return &v
}
