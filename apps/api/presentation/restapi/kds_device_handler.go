package restapi

import (
	"apps/api/domain"
	apiContract "libs/api-contract"
	"net/http"
)

type KdsDeviceHandler struct {
	usecase domain.KdsDeviceUsecase
}

func NewKdsDeviceHandler(usecase domain.KdsDeviceUsecase) KdsDeviceHandler {
	return KdsDeviceHandler{usecase: usecase}
}

func (handler KdsDeviceHandler) RegisterKdsDevice(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	kdsDeviceRequest, err := GetKdsDeviceRequest(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	device, usecaseErr := handler.usecase.RegisterKdsDevice(ctx, ToKdsDevice(kdsDeviceRequest))
	if usecaseErr != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message})
		return
	}

	WriteResponse(w, apiContract.KdsDeviceRegisterResponse{Data: ToApiKdsDevice(device)})
}

func (handler KdsDeviceHandler) GetKdsDeviceList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	devices, err := handler.usecase.GetKdsDeviceList(ctx)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	apiDevices := []apiContract.KdsDevice{}

	for _, device := range devices {
		apiDevices = append(apiDevices, ToApiKdsDevice(device))
	}

	WriteResponse(w, apiContract.KdsDeviceListResponse{Data: apiDevices})
}

func (handler KdsDeviceHandler) DeleteKdsDeviceById(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetKdsDeviceId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if err := handler.usecase.DeleteKdsDeviceById(ctx, id); err != nil {
		WriteError(ctx, w, apiContract.Error{Code: ToErrorCode(err.Type), Message: err.Message})
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}

func (handler KdsDeviceHandler) SendTestNotification(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	id, err := GetKdsDeviceId(r)
	if err != nil {
		WriteError(ctx, w, apiContract.Error{Code: apiContract.BAD_REQUEST, Message: err.Error()})
		return
	}

	if usecaseErr := handler.usecase.SendTestNotification(ctx, id); usecaseErr != nil {
		apiError := apiContract.Error{Code: ToErrorCode(usecaseErr.Type), Message: usecaseErr.Message}
		if usecaseErr.Type == domain.BadGateway {
			WriteErrorWithStatus(ctx, w, apiError, http.StatusBadGateway)
			return
		}
		WriteError(ctx, w, apiError)
		return
	}

	WriteResponse(w, apiContract.SuccessResponse{Success: true})
}
