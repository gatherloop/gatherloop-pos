package restapi

import (
	"apps/api/domain/calculation"
	apiContract "libs/api-contract"
	"net/http"
)

type CalculationHandler struct {
	usecase calculation.Usecase
}

func NewCalculationHandler(usecase calculation.Usecase) CalculationHandler {
	return CalculationHandler{usecase: usecase}
}

func (handler CalculationHandler) GetCalculationList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

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

	calculations, usecaseErr := handler.usecase.GetCalculationList(ctx, sortBy, order, skip, limit)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiCalculations := []apiContract.Calculation{}
	for _, calculation := range calculations {
		apiCalculations = append(apiCalculations, ToApiCalculation(calculation))
	}

	WriteResponse(w, apiContract.CalculationList200Response{Data: apiCalculations})
}

func (handler CalculationHandler) GetCalculationById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCalculationId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	calculation, usecaseErr := handler.usecase.GetCalculationById(ctx, id)
	if usecaseErr != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.CalculationFindById200Response{Data: ToApiCalculation(calculation)})
}

func (handler CalculationHandler) CreateCalculation(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	calculationRequest, err := GetCalculationRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.CreateCalculation(ctx, ToCalculation(calculationRequest)); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler CalculationHandler) UpdateCalculationById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCalculationId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	calculationRequest, err := GetCalculationRequest(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.UpdateCalculationById(ctx, ToCalculation(calculationRequest), id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler CalculationHandler) DeleteCalculationById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetCalculationId(r)
	if err != nil {
		WriteError(w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteCalculationById(ctx, id); err != nil {
		WriteError(w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
