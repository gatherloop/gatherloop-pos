package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type AvailabilityHandler struct {
	usecase domain.AvailabilityUsecase
}

func NewAvailabilityHandler(usecase domain.AvailabilityUsecase) AvailabilityHandler {
	return AvailabilityHandler{usecase: usecase}
}

func (handler AvailabilityHandler) GetAvailabilityList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	availabilityProducts, err := handler.usecase.GetAvailabilityList(ctx)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiAvailabilityProducts := []apiContract.AvailabilityProduct{}
	for _, availabilityProduct := range availabilityProducts {
		apiAvailabilityProducts = append(apiAvailabilityProducts, ToApiAvailabilityProduct(availabilityProduct))
	}

	WriteResponse(w, apiContract.AvailabilityListResponse{Data: apiAvailabilityProducts})
}

func (handler AvailabilityHandler) UpdateAvailability(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	availabilityUpdateRequest, err := GetAvailabilityUpdateRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	productUpdates := ToAvailabilityProductUpdates(availabilityUpdateRequest.Products)
	variantUpdates := ToAvailabilityVariantUpdates(availabilityUpdateRequest.Variants)

	availabilityProducts, usecaseErr := handler.usecase.UpdateAvailability(ctx, productUpdates, variantUpdates)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiAvailabilityProducts := []apiContract.AvailabilityProduct{}
	for _, availabilityProduct := range availabilityProducts {
		apiAvailabilityProducts = append(apiAvailabilityProducts, ToApiAvailabilityProduct(availabilityProduct))
	}

	WriteResponse(w, apiContract.AvailabilityUpdateResponse{Data: apiAvailabilityProducts})
}

func (handler AvailabilityHandler) GetAvailabilityMovementList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	level, err := GetAvailabilityMovementLevel(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	id, err := GetAvailabilityMovementId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

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

	movements, total, usecaseErr := handler.usecase.GetAvailabilityMovementList(ctx, level, id, skip, limit)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiMovements := []apiContract.AvailabilityMovement{}
	for _, movement := range movements {
		apiMovements = append(apiMovements, ToApiAvailabilityMovement(movement))
	}

	WriteResponse(w, apiContract.AvailabilityMovementListResponse{Data: apiMovements, Meta: apiContract.MetaPage{Total: total}})
}
