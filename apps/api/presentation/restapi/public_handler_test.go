package restapi_test

import (
	"apps/api/data/mock"
	"apps/api/domain"
	"apps/api/presentation/restapi"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func newPublicHandler(t *testing.T) (restapi.PublicHandler, *mock.MockProductRepository, *mock.MockCategoryRepository, *mock.MockVariantRepository) {
	ctrl := gomock.NewController(t)
	t.Cleanup(ctrl.Finish)

	productRepo := mock.NewMockProductRepository(ctrl)
	categoryRepo := mock.NewMockCategoryRepository(ctrl)
	variantRepo := mock.NewMockVariantRepository(ctrl)

	handler := restapi.NewPublicHandler(
		domain.NewProductUsecase(productRepo),
		domain.NewCategoryUsecase(categoryRepo),
		domain.NewVariantUsecase(variantRepo, productRepo),
	)

	return handler, productRepo, categoryRepo, variantRepo
}

func TestPublicHandler_GetCategoryList(t *testing.T) {
	handler, _, categoryRepo, _ := newPublicHandler(t)

	categoryRepo.EXPECT().GetCategoryList(gomock.Any()).Return([]domain.Category{{Id: 1, Name: "Minuman"}}, nil)

	// No Authorization header/cookie is set: the route must not require one.
	req := httptest.NewRequest(http.MethodGet, "/public/categories", nil)
	w := httptest.NewRecorder()
	handler.GetCategoryList(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestPublicHandler_GetProductList_forcesPublishedPurchase(t *testing.T) {
	handler, productRepo, _, _ := newPublicHandler(t)

	published := domain.ProductStatusPublished
	purchase := domain.SaleTypePurchase

	// Even though the request asks for draft/rental, the handler must force
	// published+purchase server-side and ignore the client's attempt to override.
	productRepo.EXPECT().GetProductList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), &purchase, &published).
		Return([]domain.Product{{Id: 1, Name: "Es Kopi Susu", Status: domain.ProductStatusPublished, SaleType: domain.SaleTypePurchase}}, nil)
	productRepo.EXPECT().GetProductListTotal(gomock.Any(), gomock.Any(), &purchase, &published).Return(int64(1), nil)

	req := httptest.NewRequest(http.MethodGet, "/public/products?status=draft&saleType=rental", nil)
	w := httptest.NewRecorder()
	handler.GetProductList(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp apiContract.ProductListResponse
	assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Len(t, resp.Data, 1)
}

func TestPublicHandler_GetProductById(t *testing.T) {
	tests := []struct {
		name           string
		product        domain.Product
		expectedStatus int
	}{
		{
			name:           "published purchase product is visible",
			product:        domain.Product{Id: 1, Name: "Es Kopi Susu", Status: domain.ProductStatusPublished, SaleType: domain.SaleTypePurchase},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "draft product is not found",
			product:        domain.Product{Id: 1, Name: "Es Kopi Susu (draft)", Status: domain.ProductStatusDraft, SaleType: domain.SaleTypePurchase},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "rental product is not found",
			product:        domain.Product{Id: 1, Name: "Board Game", Status: domain.ProductStatusPublished, SaleType: domain.SaleTypeRental},
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler, productRepo, _, _ := newPublicHandler(t)
			productRepo.EXPECT().GetProductById(gomock.Any(), int64(1)).Return(tt.product, nil)

			req := httptest.NewRequest(http.MethodGet, "/public/products/1", nil)
			req = mux.SetURLVars(req, map[string]string{"productId": "1"})
			w := httptest.NewRecorder()
			handler.GetProductById(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code)
		})
	}
}

func TestPublicHandler_GetVariantList_stripsMaterialsAndExcludesNonPublicProducts(t *testing.T) {
	handler, _, _, variantRepo := newPublicHandler(t)

	publicVariant := domain.Variant{
		Id:        1,
		ProductId: 1,
		Name:      "Large",
		Price:     20000,
		Product:   domain.Product{Id: 1, Status: domain.ProductStatusPublished, SaleType: domain.SaleTypePurchase},
		Materials: []domain.VariantMaterial{{Id: 1, MaterialId: 1, Material: domain.Material{Id: 1, Name: "Milk", Price: 5000}}},
	}
	draftProductVariant := domain.Variant{
		Id:        2,
		ProductId: 2,
		Name:      "Large",
		Price:     20000,
		Product:   domain.Product{Id: 2, Status: domain.ProductStatusDraft, SaleType: domain.SaleTypePurchase},
	}

	variantRepo.EXPECT().GetVariantList(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return([]domain.Variant{publicVariant, draftProductVariant}, nil)
	variantRepo.EXPECT().GetVariantListTotal(gomock.Any(), gomock.Any()).Return(int64(2), nil)

	req := httptest.NewRequest(http.MethodGet, "/public/variants", nil)
	w := httptest.NewRecorder()
	handler.GetVariantList(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp apiContract.VariantListResponse
	assert.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Len(t, resp.Data, 1)
	assert.Equal(t, int64(1), resp.Data[0].Id)
	assert.Empty(t, resp.Data[0].Materials)
	assert.Empty(t, resp.Data[0].PricingTiers)
}
