package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

// PublicHandler serves the unauthenticated customer catalog (FR-1). It reuses the
// existing Product/Category/Variant usecases and forces published+purchase filters
// server-side so a customer can never see draft or rental items.
type PublicHandler struct {
	productUsecase  domain.ProductUsecase
	categoryUsecase domain.CategoryUsecase
	variantUsecase  domain.VariantUsecase
	tableUsecase    domain.TableUsecase
}

func NewPublicHandler(productUsecase domain.ProductUsecase, categoryUsecase domain.CategoryUsecase, variantUsecase domain.VariantUsecase, tableUsecase domain.TableUsecase) PublicHandler {
	return PublicHandler{
		productUsecase:  productUsecase,
		categoryUsecase: categoryUsecase,
		variantUsecase:  variantUsecase,
		tableUsecase:    tableUsecase,
	}
}

func (handler PublicHandler) GetCategoryList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	categories, err := handler.categoryUsecase.GetCategoryList(ctx)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiCategories := []apiContract.Category{}
	for _, category := range categories {
		apiCategories = append(apiCategories, ToApiCategory(category))
	}

	WriteResponse(w, apiContract.CategoryListResponse{Data: apiCategories})
}

func (handler PublicHandler) GetProductList(w http.ResponseWriter, r *http.Request) {
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

	// Forced server-side; the public list can never be widened by client params.
	saleType := domain.SaleTypePurchase
	status := domain.ProductStatusPublished

	products, total, usecaseErr := handler.productUsecase.GetProductList(ctx, query, sortBy, order, skip, limit, &saleType, &status)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiProducts := []apiContract.Product{}
	for _, product := range products {
		apiProducts = append(apiProducts, ToApiProduct(product))
	}

	WriteResponse(w, apiContract.ProductListResponse{Data: apiProducts, Meta: apiContract.MetaPage{Total: total}})
}

func (handler PublicHandler) GetProductById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetProductId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	product, usecaseErr := handler.productUsecase.GetProductById(ctx, id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	// GetProductById does not filter by status/saleType/deleted_at, so a draft or
	// rental product must be rejected here rather than shown to an anonymous guest.
	if !IsPublicProduct(product) {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.NOT_FOUND, Message: "product not found"})
		return
	}

	WriteResponse(w, apiContract.ProductFindByIdResponse{Data: ToApiProduct(product)})
}

func (handler PublicHandler) GetVariantList(w http.ResponseWriter, r *http.Request) {
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

	productId, err := GetProductIdQuery(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	optionValueIds, err := GetOptionValueIds(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	variants, _, usecaseErr := handler.variantUsecase.GetVariantList(ctx, query, sortBy, order, skip, limit, productId, optionValueIds)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	// GetVariantList has no saleType/status filter, so variants of draft or rental
	// products are dropped here, and materials/pricingTiers are stripped (D2).
	apiVariants := []apiContract.Variant{}
	for _, variant := range variants {
		if !IsPublicProduct(variant.Product) {
			continue
		}
		apiVariants = append(apiVariants, ToPublicApiVariant(variant))
	}

	WriteResponse(w, apiContract.VariantListResponse{Data: apiVariants, Meta: apiContract.MetaPage{Total: int64(len(apiVariants))}})
}

// GetTableByCode resolves a QR code to a table's id and label (FR-1, D6). It
// never returns the full table list, which would defeat non-guessable codes.
func (handler PublicHandler) GetTableByCode(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	code := GetTableCode(r)

	table, usecaseErr := handler.tableUsecase.GetTableByCode(ctx, code)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.PublicTableFindByCodeResponse{Data: ToApiPublicTable(table)})
}
