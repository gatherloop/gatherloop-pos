//go:generate mockgen -source=kds_device_repository.go -destination=../data/mock/kds_device_repository.go -package=mock

package domain

import "context"

type KdsDeviceRepository interface {
	RegisterKdsDevice(ctx context.Context, device KdsDevice) (KdsDevice, *Error)
	GetKdsDeviceList(ctx context.Context) ([]KdsDevice, *Error)
	DeleteKdsDeviceById(ctx context.Context, id int64) *Error
}
