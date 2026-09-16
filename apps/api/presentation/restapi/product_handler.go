package restapi

import (
	"apps/api/domain"
	"context"
	apiContract "libs/api-contract"
	"net/http"
)

type ProductHandler struct {
	usecase        domain.ProductUsecase
	variantUsecase domain.VariantUsecase
}

func NewProductHandler(usecase domain.ProductUsecase, variantUsecase domain.VariantUsecase) ProductHandler {
	return ProductHandler{usecase: usecase, variantUsecase: variantUsecase}
}

func (handler ProductHandler) getProductVariants(ctx context.Context, productId int64) ([]domain.Variant, *domain.Error) {
	id := int(productId)
	variants, _, err := handler.variantUsecase.GetVariantList(ctx, "", domain.CreatedAt, domain.Ascending, 0, 0, &id, []int{})
	return variants, err
}

func (handler ProductHandler) GetProductList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := GetQuery(r)
	sortBy := GetSortBy(r)
	order := GetOrder(r)

	skip, err := GetSkip(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	saleType := GetSaleType(r)
	status := GetProductStatus(r)

	products, total, usecaseErr := handler.usecase.GetProductList(ctx, query, sortBy, order, skip, limit, saleType, status)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiProducts := []apiContract.Product{}
	for _, product := range products {
		variants, usecaseErr := handler.getProductVariants(ctx, product.Id)
		if usecaseErr != nil {
			WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
			return
		}
		apiProducts = append(apiProducts, ToApiProduct(product, variants))
	}

	WriteResponse(w, apiContract.ProductListResponse{Data: apiProducts, Meta: apiContract.MetaPage{Total: total}})
}

func (handler ProductHandler) GetProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetProductId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	product, usecaseErr := handler.usecase.GetProductById(ctx, id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	variants, usecaseErr := handler.getProductVariants(ctx, product.Id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ProductFindByIdResponse{Data: ToApiProduct(product, variants)})
}

func (handler ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	productRequest, err := GetProductRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	product := ToProduct(productRequest)
	createdProduct, usecaseErr := handler.usecase.CreateProduct(ctx, product)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ProductCreateResponse{Data: ToApiProduct(createdProduct, []domain.Variant{})})
}

func (handler ProductHandler) UpdateProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetProductId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	productRequest, err := GetProductRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	product := ToProduct(productRequest)
	updatedProduct, usecaseErr := handler.usecase.UpdateProductById(ctx, product, id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	variants, usecaseErr := handler.getProductVariants(ctx, updatedProduct.Id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ProductUpdateByIdResponse{Data: ToApiProduct(updatedProduct, variants)})
}

func (handler ProductHandler) DeleteProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetProductId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	usecaseErr := handler.usecase.DeleteProductById(ctx, id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
