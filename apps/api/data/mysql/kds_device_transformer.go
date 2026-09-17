package mysql

import "apps/api/domain"

func ToKdsDeviceDB(domainDevice domain.KdsDevice) KdsDevice {
	return KdsDevice{
		Id:         domainDevice.Id,
		Name:       domainDevice.Name,
		PushToken:  domainDevice.PushToken,
		Platform:   string(domainDevice.Platform),
		CreatedAt:  domainDevice.CreatedAt,
		LastSeenAt: domainDevice.LastSeenAt,
		DeletedAt:  domainDevice.DeletedAt,
	}
}

func ToKdsDeviceDomain(dbDevice KdsDevice) domain.KdsDevice {
	return domain.KdsDevice{
		Id:         dbDevice.Id,
		Name:       dbDevice.Name,
		PushToken:  dbDevice.PushToken,
		Platform:   domain.KdsPlatform(dbDevice.Platform),
		CreatedAt:  dbDevice.CreatedAt,
		LastSeenAt: dbDevice.LastSeenAt,
		DeletedAt:  dbDevice.DeletedAt,
	}
}

func ToKdsDevicesListDomain(dbDevices []KdsDevice) []domain.KdsDevice {
	var domainDevices []domain.KdsDevice
	for _, dbDevice := range dbDevices {
		domainDevices = append(domainDevices, ToKdsDeviceDomain(dbDevice))
	}
	return domainDevices
}
