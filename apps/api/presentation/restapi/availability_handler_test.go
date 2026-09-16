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

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newAvailabilityHandler(ctrl *gomock.Controller) (restapi.AvailabilityHandler, *mock.MockAvailabilityRepository, *mock.MockProductRepository, *mock.MockVariantRepository) {
	mockAvailabilityRepo := mock.NewMockAvailabilityRepository(ctrl)
	mockProductRepo := mock.NewMockProductRepository(ctrl)
	mockVariantRepo := mock.NewMockVariantRepository(ctrl)
	usecase := domain.NewAvailabilityUsecase(mockAvailabilityRepo, mockProductRepo, mockVariantRepo)
	return restapi.NewAvailabilityHandler(usecase), mockAvailabilityRepo, mockProductRepo, mockVariantRepo
}

func TestAvailabilityHandler_GetAvailabilityList(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository)
		expectedStatus int
	}{
		{
			name: "success",
			setupMock: func(productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
				purchase := domain.SaleTypePurchase
				published := domain.ProductStatusPublished
				productRepo.EXPECT().GetProductList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 0, &purchase, &published).
					Return([]domain.Product{{Id: 1, Name: "Pancong"}}, nil)
				variantRepo.EXPECT().GetVariantList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return([]domain.Variant{}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "repo error",
			setupMock: func(productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
				productRepo.EXPECT().GetProductList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, &domain.Error{Type: domain.InternalServerError, Message: "db error"})
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			handler, _, mockProductRepo, mockVariantRepo := newAvailabilityHandler(ctrl)
			tt.setupMock(mockProductRepo, mockVariantRepo)

			req := httptest.NewRequest(http.MethodGet, "/availability", nil)
			w := httptest.NewRecorder()
			handler.GetAvailabilityList(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestAvailabilityHandler_UpdateAvailability(t *testing.T) {
	tests := []struct {
		name           string
		body           string
		setupMock      func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository)
		expectedStatus int
	}{
		{
			name: "success",
			body: `{"products": [{"productId": 1, "isAvailable": false}]}`,
			setupMock: func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
				productRepo.EXPECT().GetProductById(gomock.Any(), int64(1)).
					Return(domain.Product{Id: 1, Name: "Es Kopi Susu", AvailabilityTracking: domain.AvailabilityTrackingNone}, nil)
				availabilityRepo.EXPECT().BeginTransaction(gomock.Any(), gomock.Any()).DoAndReturn(
					func(ctx context.Context, cb func(context.Context) *domain.Error) *domain.Error { return cb(ctx) })
				availabilityRepo.EXPECT().UpdateProductAvailability(gomock.Any(), int64(1), gomock.Any(), gomock.Any()).Return(nil)

				purchase := domain.SaleTypePurchase
				published := domain.ProductStatusPublished
				productRepo.EXPECT().GetProductList(gomock.Any(), "", domain.CreatedAt, domain.Ascending, 0, 0, &purchase, &published).
					Return([]domain.Product{}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "invalid JSON body",
			body: `{invalid`,
			setupMock: func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "rejects a quantity against tracking = none",
			body: `{"products": [{"productId": 1, "availableQuantity": 5}]}`,
			setupMock: func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
				productRepo.EXPECT().GetProductById(gomock.Any(), int64(1)).
					Return(domain.Product{Id: 1, Name: "Es Kopi Susu", AvailabilityTracking: domain.AvailabilityTrackingNone}, nil)
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name: "rejects a negative quantity",
			body: `{"variants": [{"variantId": 1, "availableQuantity": -1}]}`,
			setupMock: func(availabilityRepo *mock.MockAvailabilityRepository, productRepo *mock.MockProductRepository, variantRepo *mock.MockVariantRepository) {
			},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			handler, mockAvailabilityRepo, mockProductRepo, mockVariantRepo := newAvailabilityHandler(ctrl)
			tt.setupMock(mockAvailabilityRepo, mockProductRepo, mockVariantRepo)

			req := httptest.NewRequest(http.MethodPut, "/availability", bytes.NewBufferString(tt.body))
			w := httptest.NewRecorder()
			handler.UpdateAvailability(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}
