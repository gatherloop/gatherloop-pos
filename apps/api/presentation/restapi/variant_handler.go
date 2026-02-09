package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type VariantHandler struct {
	usecase domain.VariantUsecase
}

func NewVariantHandler(usecase domain.VariantUsecase) VariantHandler {
	return VariantHandler{usecase: usecase}
}

func (handler VariantHandler) GetVariantList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := GetQuery(r)
	sortBy := GetSortBy(r)
	order := GetOrder(r)

	skip, err := GetSkip(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	limit, err := GetLimit(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	productId, err := GetProductIdQuery(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	optionValueIds, err := GetOptionValueIds(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	variants, total, usecaseErr := handler.usecase.GetVariantList(ctx, query, sortBy, order, skip, limit, productId, optionValueIds)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiVariants := []apiContract.Variant{}
	for _, variant := range variants {
		apiVariants = append(apiVariants, ToApiVariant(variant))
	}

	WriteResponse(w, apiContract.VariantList200Response{Data: apiVariants, Meta: apiContract.MetaPage{Total: total}})
}

func (handler VariantHandler) GetVariantById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetVariantId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	variant, usecaseErr := handler.usecase.GetVariantById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.VariantFindById200Response{Data: ToApiVariant(variant)})
}

func (handler VariantHandler) CreateVariant(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	variantRequest, err := GetVariantRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	variant := ToVariant(variantRequest)
	usecaseErr := handler.usecase.CreateVariant(ctx, variant)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler VariantHandler) UpdateVariantById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetVariantId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	variantRequest, err := GetVariantRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	variant := ToVariant(variantRequest)
	usecaseErr := handler.usecase.UpdateVariantById(ctx, variant, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler VariantHandler) DeleteVariantById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetVariantId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	usecaseErr := handler.usecase.DeleteVariantById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
