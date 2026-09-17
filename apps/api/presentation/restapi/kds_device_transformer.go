package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetKdsDeviceId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["kdsDeviceId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetKdsDeviceRequest(r *http.Request) (apiContract.KdsDeviceRequest, error) {
	var kdsDeviceRequest apiContract.KdsDeviceRequest
	err := json.NewDecoder(r.Body).Decode(&kdsDeviceRequest)
	return kdsDeviceRequest, err
}

func ToApiKdsDevice(device domain.KdsDevice) apiContract.KdsDevice {
	return apiContract.KdsDevice{
		Id:         device.Id,
		Name:       device.Name,
		PushToken:  device.PushToken,
		Platform:   string(device.Platform),
		LastSeenAt: device.LastSeenAt,
		CreatedAt:  device.CreatedAt,
		DeletedAt:  device.DeletedAt,
	}
}

func ToKdsDevice(kdsDeviceRequest apiContract.KdsDeviceRequest) domain.KdsDevice {
	return domain.KdsDevice{
		Name:      kdsDeviceRequest.Name,
		PushToken: kdsDeviceRequest.PushToken,
		Platform:  domain.KdsPlatform(kdsDeviceRequest.Platform),
	}
}
