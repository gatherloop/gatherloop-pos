package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewKdsDeviceRepository(db *gorm.DB) domain.KdsDeviceRepository {
	return Repository{db: db}
}

func (repo Repository) RegisterKdsDevice(ctx context.Context, device domain.KdsDevice) (domain.KdsDevice, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	now := time.Now()
	payload := KdsDevice{
		Name:       device.Name,
		PushToken:  device.PushToken,
		Platform:   string(device.Platform),
		LastSeenAt: &now,
	}

	result := db.Table("kds_devices").
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "push_token"}},
			DoUpdates: clause.AssignmentColumns([]string{"name", "platform", "last_seen_at", "deleted_at"}),
		}).
		Create(&payload)
	if result.Error != nil {
		return domain.KdsDevice{}, ToErrorCtx(ctx, result.Error, "RegisterKdsDevice")
	}

	var registered KdsDevice
	fetchResult := db.Table("kds_devices").Where("push_token = ?", device.PushToken).First(&registered)
	return ToKdsDeviceDomain(registered), ToErrorCtx(ctx, fetchResult.Error, "RegisterKdsDevice")
}

func (repo Repository) GetKdsDeviceList(ctx context.Context) ([]domain.KdsDevice, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var devices []KdsDevice
	result := db.Table("kds_devices").Where("deleted_at is NULL").Find(&devices)
	return ToKdsDevicesListDomain(devices), ToErrorCtx(ctx, result.Error, "GetKdsDeviceList")
}

func (repo Repository) DeleteKdsDeviceById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("kds_devices").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToErrorCtx(ctx, result.Error, "DeleteKdsDeviceById")
}
