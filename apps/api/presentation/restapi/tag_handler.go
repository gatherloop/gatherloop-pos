package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type TagHandler struct {
	usecase domain.TagUsecase
}

func NewTagHandler(usecase domain.TagUsecase) TagHandler {
	return TagHandler{usecase: usecase}
}

func (handler TagHandler) GetTagList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	tags, err := handler.usecase.GetTagList(ctx)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiTags := []apiContract.Tag{}
	for _, tag := range tags {
		apiTags = append(apiTags, ToApiTag(tag))
	}

	WriteResponse(w, apiContract.TagListResponse{Data: apiTags})
}

func (handler TagHandler) GetTagById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTagId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	tag, usecaseErr := handler.usecase.GetTagById(ctx, id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TagFindByIdResponse{Data: ToApiTag(tag)})
}

func (handler TagHandler) CreateTag(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	tagRequest, err := GetTagRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	tag, usecaseErr := handler.usecase.CreateTag(ctx, ToTag(tagRequest))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TagCreateResponse{Data: ToApiTag(tag)})
}

func (handler TagHandler) UpdateTagById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTagId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	tagRequest, err := GetTagRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	tag, usecaseErr := handler.usecase.UpdateTagById(ctx, ToTag(tagRequest), id)

	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TagUpdateByIdResponse{Data: ToApiTag(tag)})
}

func (handler TagHandler) DeleteTagById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTagId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteTagById(ctx, id); err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
