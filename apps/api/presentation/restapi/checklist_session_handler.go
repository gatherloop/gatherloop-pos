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

func (handler ChecklistSessionHandler) GetChecklistSessionList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

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

	filter := GetChecklistSessionFilter(r)

	sessions, total, usecaseErr := handler.usecase.GetChecklistSessionList(ctx, filter, skip, limit)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiSessions := []apiContract.ChecklistSession{}
	for _, s := range sessions {
		apiSessions = append(apiSessions, ToApiChecklistSession(s))
	}

	WriteResponse(w, apiContract.ChecklistSessionListResponse{
		Data: apiSessions,
		Meta: apiContract.MetaPage{Total: total},
	})
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
