package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type TableHandler struct {
	usecase domain.TableUsecase
}

func NewTableHandler(usecase domain.TableUsecase) TableHandler {
	return TableHandler{usecase: usecase}
}

func (handler TableHandler) GetTableList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	tables, err := handler.usecase.GetTableList(ctx)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiTables := []apiContract.Table{}
	for _, table := range tables {
		apiTables = append(apiTables, ToApiTable(table))
	}

	WriteResponse(w, apiContract.TableListResponse{Data: apiTables})
}

func (handler TableHandler) GetTableById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTableId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	table, baseError := handler.usecase.GetTableById(ctx, id)
	if baseError != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(baseError.Type), Message: baseError.Message})
		return
	}

	WriteResponse(w, apiContract.TableFindByIdResponse{Data: ToApiTable(table)})
}

func (handler TableHandler) CreateTable(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	tableRequest, err := GetTableRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	table, usecaseErr := handler.usecase.CreateTable(ctx, ToTable(tableRequest))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TableCreateResponse{Data: ToApiTable(table)})
}

func (handler TableHandler) UpdateTableById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTableId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	tableRequest, err := GetTableRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	table, usecaseErr := handler.usecase.UpdateTableById(ctx, ToTable(tableRequest), id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TableUpdateByIdResponse{Data: ToApiTable(table)})
}

func (handler TableHandler) DeleteTableById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTableId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteTableById(ctx, id); err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler TableHandler) RegenerateTableCode(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetTableId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	table, usecaseErr := handler.usecase.RegenerateTableCode(ctx, id)
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.TableUpdateByIdResponse{Data: ToApiTable(table)})
}
