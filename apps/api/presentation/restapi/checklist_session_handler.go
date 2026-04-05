package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type ChecklistSessionHandler struct {
	usecase domain.ChecklistSessionUsecase
}

func NewChecklistSessionHandler(usecase domain.ChecklistSessionUsecase) ChecklistSessionHandler {
	return ChecklistSessionHandler{usecase: usecase}
}

func (handler ChecklistSessionHandler) CreateChecklistSession(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	req, err := GetChecklistSessionRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	created, usecaseErr := handler.usecase.CreateChecklistSession(ctx, ToChecklistSession(req))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ChecklistSessionCreateResponse{Data: ToApiChecklistSession(created)})
}

func (handler ChecklistSessionHandler) GetChecklistSessionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetChecklistSessionId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	session, usecaseErr := handler.usecase.GetChecklistSessionById(ctx, id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ChecklistSessionFindByIdResponse{Data: ToApiChecklistSession(session)})
}

func (handler ChecklistSessionHandler) DeleteChecklistSessionById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetChecklistSessionId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if usecaseErr := handler.usecase.DeleteChecklistSessionById(ctx, id); usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler ChecklistSessionHandler) CheckSessionItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	itemId, err := GetChecklistSessionItemId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if usecaseErr := handler.usecase.CheckSessionItem(ctx, itemId); usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler ChecklistSessionHandler) UncheckSessionItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	itemId, err := GetChecklistSessionItemId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if usecaseErr := handler.usecase.UncheckSessionItem(ctx, itemId); usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler ChecklistSessionHandler) CheckSessionSubItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	subItemId, err := GetChecklistSessionSubItemId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if usecaseErr := handler.usecase.CheckSessionSubItem(ctx, subItemId); usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler ChecklistSessionHandler) UncheckSessionSubItem(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	subItemId, err := GetChecklistSessionSubItemId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if usecaseErr := handler.usecase.UncheckSessionSubItem(ctx, subItemId); usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
