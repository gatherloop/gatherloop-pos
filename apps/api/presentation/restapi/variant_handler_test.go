package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newTestVariantHandler(ctrl *gomock.Controller, variantRepo *mock.MockVariantRepository, productRepo *mock.MockProductRepository) restapi.VariantHandler {
	return restapi.NewVariantHandler(domain.NewVariantUsecase(variantRepo, productRepo, mock.NewMockTagRepository(ctrl)))
}

func TestVariantHandler_GetVariantList(t *testing.T) {
	tests := []struct {
		name           string
		url            string
		setupMock      func(r *mock.MockVariantRepository)
		expectedStatus int
	}{
		{
			name: "success",
			url:  "/variants",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return([]domain.Variant{{Id: 1}}, nil)
				r.EXPECT().GetVariantListTotal(gomock.Any(), gomock.Any()).Return(int64(1), nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid skip param",
			url:            "/variants?skip=abc",
			setupMock:      func(r *mock.MockVariantRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			url:  "/variants",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(variantRepo)
			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodGet, tt.url, nil)
			w := httptest.NewRecorder()
			handler.GetVariantList(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestVariantHandler_GetVariantById(t *testing.T) {
	tests := []struct {
		name           string
		variantId      string
		setupMock      func(r *mock.MockVariantRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			variantId: "1",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Name: "Regular"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:      "not found",
			variantId: "99",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().GetVariantById(gomock.Any(), int64(99)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "invalid id",
			variantId:      "abc",
			setupMock:      func(r *mock.MockVariantRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(variantRepo)
			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodGet, "/variants/"+tt.variantId, nil)
			req = mux.SetURLVars(req, map[string]string{"variantId": tt.variantId})
			w := httptest.NewRecorder()
			handler.GetVariantById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestVariantHandler_CreateVariant(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"productId": 1, "name": "Regular", "price": 15000, "materials": [], "values": []}`,
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {
				pr.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, SaleType: domain.SaleTypePurchase}, nil)
				vr.EXPECT().CreateVariant(gomock.Any(), gomock.Any()).Return(domain.Variant{Id: 1, Name: "Regular"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid JSON body",
			body:           `{invalid`,
			setupMock:      func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "repo error",
			body: `{"productId": 1, "name": "Regular", "price": 15000, "materials": [], "values": []}`,
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {
				pr.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{}, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(variantRepo, productRepo)
			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodPost, "/variants", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateVariant(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestVariantHandler_UpdateVariantById(t *testing.T) {
	tests := []struct {
		name           string
		variantId      string
		body           string
		setupMock      func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			variantId: "1",
			body:      `{"productId": 1, "name": "Large", "price": 20000, "materials": [], "values": []}`,
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {
				vr.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				vr.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 1}, nil)
				pr.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, SaleType: domain.SaleTypePurchase}, nil)
				vr.EXPECT().UpdateVariantById(gomock.Any(), gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, Name: "Large"}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			variantId:      "abc",
			body:           `{}`,
			setupMock:      func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "not found",
			variantId: "99",
			body:      `{"productId": 1, "name": "Large", "price": 20000, "materials": [], "values": []}`,
			setupMock: func(vr *mock.MockVariantRepository, pr *mock.MockProductRepository) {
				vr.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				vr.EXPECT().GetVariantById(gomock.Any(), int64(99)).Return(domain.Variant{}, &domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(variantRepo, productRepo)
			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodPut, "/variants/"+tt.variantId, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"variantId": tt.variantId})
			w := httptest.NewRecorder()
			handler.UpdateVariantById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestVariantHandler_UpdateVariantById_ImageUrl(t *testing.T) {
	imageUrl := "https://example.com/ice-cream.jpg"

	tests := []struct {
		name             string
		body             string
		expectedImageUrl *string
	}{
		{
			name:             "with imageUrl",
			body:             `{"productId": 1, "name": "Ice Cream", "price": 20000, "imageUrl": "https://example.com/ice-cream.jpg", "materials": [], "values": []}`,
			expectedImageUrl: &imageUrl,
		},
		{
			name:             "without imageUrl",
			body:             `{"productId": 1, "name": "Ice Cream", "price": 20000, "materials": [], "values": []}`,
			expectedImageUrl: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			variantRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
				func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
			variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 1}, nil)
			productRepo.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, SaleType: domain.SaleTypePurchase}, nil)
			variantRepo.EXPECT().UpdateVariantById(gomock.Any(), gomock.Any(), int64(1)).DoAndReturn(
				func(ctx context.Context, variant domain.Variant, id int64) (domain.Variant, *domain.Error) {
					assert.Equal(t, tt.expectedImageUrl, variant.ImageUrl)
					return variant, nil
				})

			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodPut, "/variants/1", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"variantId": "1"})
			w := httptest.NewRecorder()
			handler.UpdateVariantById(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			var response struct {
				Data struct {
					ImageUrl *string `json:"imageUrl"`
				} `json:"data"`
			}
			assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
			assert.Equal(t, tt.expectedImageUrl, response.Data.ImageUrl)
		})
	}
}

func TestVariantHandler_DeleteVariantById(t *testing.T) {
	tests := []struct {
		name           string
		variantId      string
		setupMock      func(r *mock.MockVariantRepository)
		expectedStatus int
	}{
		{
			name:      "success",
			variantId: "1",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().DeleteVariantById(gomock.Any(), int64(1)).Return(nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid id",
			variantId:      "abc",
			setupMock:      func(r *mock.MockVariantRepository) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "not found",
			variantId: "99",
			setupMock: func(r *mock.MockVariantRepository) {
				r.EXPECT().DeleteVariantById(gomock.Any(), int64(99)).Return(&domain.Error{Type: domain.NotFound, Message: "not found"})
			},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tt.setupMock(variantRepo)
			handler := newTestVariantHandler(ctrl, variantRepo, productRepo)
			req := httptest.NewRequest(http.MethodDelete, "/variants/"+tt.variantId, nil)
			req = mux.SetURLVars(req, map[string]string{"variantId": tt.variantId})
			w := httptest.NewRecorder()
			handler.DeleteVariantById(w, req)
			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestVariantHandler_UpdateVariantById_TagIds(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		expectedTagIds []int64
	}{
		{
			name:           "omitted tagIds stay nil",
			body:           `{"productId": 1, "name": "Hot", "price": 20000, "materials": [], "values": []}`,
			expectedTagIds: nil,
		},
		{
			name:           "empty tagIds stay empty",
			body:           `{"productId": 1, "name": "Hot", "price": 20000, "materials": [], "values": [], "tagIds": []}`,
			expectedTagIds: []int64{},
		},
		{
			name:           "tagIds are passed through",
			body:           `{"productId": 1, "name": "Hot", "price": 20000, "materials": [], "values": [], "tagIds": [1, 2]}`,
			expectedTagIds: []int64{1, 2},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()
			variantRepo := mock.NewMockVariantRepository(ctrl)
			productRepo := mock.NewMockProductRepository(ctrl)
			tagRepo := mock.NewMockTagRepository(ctrl)
			variantRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
				func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
			variantRepo.EXPECT().GetVariantById(gomock.Any(), int64(1)).Return(domain.Variant{Id: 1, ProductId: 1}, nil)
			productRepo.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(domain.Product{Id: 1, SaleType: domain.SaleTypePurchase}, nil)
			if tt.expectedTagIds != nil {
				tagRepo.EXPECT().GetTagList(gomock.Any()).Return([]domain.Tag{{Id: 1}, {Id: 2}}, nil)
				tagRepo.EXPECT().GetVariantTagIds(gomock.Any(), int64(1)).Return([]int64{}, nil)
				if len(tt.expectedTagIds) > 0 {
					tagRepo.EXPECT().InsertVariantTags(gomock.Any(), gomock.Any()).Return(nil)
				}
			}
			taggedAt := time.Date(2026, 1, 2, 3, 4, 5, 0, time.UTC)
			variantRepo.EXPECT().UpdateVariantById(gomock.Any(), gomock.Any(), int64(1)).DoAndReturn(
				func(ctx context.Context, variant domain.Variant, id int64) (domain.Variant, *domain.Error) {
					assert.Equal(t, tt.expectedTagIds, variant.TagIds)
					variant.Tags = []domain.VariantTag{{Tag: domain.Tag{Id: 1, Name: "New", Color: domain.TagColorGreen}, TaggedAt: taggedAt}}
					return variant, nil
				})

			handler := restapi.NewVariantHandler(domain.NewVariantUsecase(variantRepo, productRepo, tagRepo))
			req := httptest.NewRequest(http.MethodPut, "/variants/1", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = mux.SetURLVars(req, map[string]string{"variantId": "1"})
			w := httptest.NewRecorder()
			handler.UpdateVariantById(w, req)

			assert.Equal(t, http.StatusOK, w.Code)
			var response struct {
				Data struct {
					Tags []struct {
						Tag struct {
							Name string `json:"name"`
						} `json:"tag"`
						TaggedAt time.Time `json:"taggedAt"`
					} `json:"tags"`
				} `json:"data"`
			}
			assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &response))
			assert.Len(t, response.Data.Tags, 1)
			assert.Equal(t, "New", response.Data.Tags[0].Tag.Name)
			assert.True(t, taggedAt.Equal(response.Data.Tags[0].TaggedAt))
		})
	}
}
