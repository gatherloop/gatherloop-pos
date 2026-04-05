package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type ChecklistTemplateHandler struct {
	usecase domain.ChecklistTemplateUsecase
}

func NewChecklistTemplateHandler(usecase domain.ChecklistTemplateUsecase) ChecklistTemplateHandler {
	return ChecklistTemplateHandler{usecase: usecase}
}

func (handler ChecklistTemplateHandler) GetChecklistTemplateList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	query := GetQuery(r)

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

	templates, total, usecaseErr := handler.usecase.GetChecklistTemplateList(ctx, query, skip, limit)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	apiTemplates := []apiContract.ChecklistTemplate{}
	for _, t := range templates {
		apiTemplates = append(apiTemplates, ToApiChecklistTemplate(t))
	}

	WriteResponse(w, apiContract.ChecklistTemplateListResponse{
		Data: apiTemplates,
		Meta: apiContract.MetaPage{Total: total},
	})
}

func (handler ChecklistTemplateHandler) GetChecklistTemplateById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetChecklistTemplateId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	template, usecaseErr := handler.usecase.GetChecklistTemplateById(ctx, id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ChecklistTemplateFindByIdResponse{Data: ToApiChecklistTemplate(template)})
}

func (handler ChecklistTemplateHandler) CreateChecklistTemplate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	req, err := GetChecklistTemplateRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	created, usecaseErr := handler.usecase.CreateChecklistTemplate(ctx, ToChecklistTemplate(req))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ChecklistTemplateCreateResponse{Data: ToApiChecklistTemplate(created)})
}

func (handler ChecklistTemplateHandler) UpdateChecklistTemplateById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetChecklistTemplateId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	req, err := GetChecklistTemplateRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	updated, usecaseErr := handler.usecase.UpdateChecklistTemplateById(ctx, ToChecklistTemplate(req), id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.ChecklistTemplateUpdateByIdResponse{Data: ToApiChecklistTemplate(updated)})
}

func (handler ChecklistTemplateHandler) DeleteChecklistTemplateById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetChecklistTemplateId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if usecaseErr := handler.usecase.DeleteChecklistTemplateById(ctx, id); usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
