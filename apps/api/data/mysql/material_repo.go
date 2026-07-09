package mysql

import (
	"apps/api/domain"
	"context"
	"fmt"
	"time"

	"gorm.io/gorm"
)

func NewMaterialRepository(db *gorm.DB) domain.MaterialRepository {
	return Repository{db: db}
}

func (repo Repository) GetMaterialList(ctx context.Context, query string, sortBy domain.SortBy, order domain.Order, skip int, limit int) ([]domain.Material, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var materials []Material
	result := db.Table("materials").
		Preload("Suppliers", "deleted_at IS NULL").
		Preload("Suppliers.Supplier").
		Where("deleted_at", nil).
		Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	if skip > 0 {
		result = result.Offset(skip)
	}

	if limit > 0 {
		result = result.Limit(limit)
	}

	result = result.Find(&materials)

	return ToMaterialListDomain(materials), ToErrorCtx(ctx, result.Error, "GetMaterialList")
}

func (repo Repository) GetMaterialListTotal(ctx context.Context, query string) (int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var count int64
	result := db.Table("materials").Where("deleted_at", nil)

	if query != "" {
		result = result.Where("name LIKE ?", "%"+query+"%")
	}

	result = result.Count(&count)

	return count, ToErrorCtx(ctx, result.Error, "GetMaterialListTotal")
}

func (repo Repository) GetMaterialsWeeklyUsage(ctx context.Context, ids []int64) (map[int64]float32, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -14)

	var results []MaterialUsage

	err := db.
		Table("materials").
		Select(`
			materials.id,
			SUM(variant_materials.amount * transaction_items.amount) / 2 AS amount
		`).
		Joins("JOIN variant_materials ON materials.id = variant_materials.material_id").
		Joins("JOIN transaction_items ON variant_materials.variant_id = transaction_items.variant_id").
		Joins("JOIN transactions ON transaction_items.transaction_id = transactions.id").
		Where("transactions.created_at BETWEEN ? AND ?", startDate, endDate).
		Where("materials.id IN ?", ids).
		Group("materials.id").
		Scan(&results).Error

	if err != nil {
		return nil, ToErrorCtx(ctx, err, "GetMaterialsWeeklyUsage")
	}

	usageMap := make(map[int64]float32)
	for _, r := range results {
		usageMap[r.ID] = r.Amount
	}

	return usageMap, nil
}

func (repo Repository) GetMaterialById(ctx context.Context, id int64) (domain.Material, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var material Material
	result := db.Table("materials").
		Preload("Suppliers", "deleted_at IS NULL").
		Preload("Suppliers.Supplier").
		Where("id = ?", id).
		Where("deleted_at", nil).
		First(&material)
	return ToMaterialDomain(material), ToErrorCtx(ctx, result.Error, "GetMaterialById")
}

func (repo Repository) CreateMaterial(ctx context.Context, material domain.Material) (domain.Material, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	var createdId int64
	err := db.Transaction(func(tx *gorm.DB) error {
		payload := ToMaterialDB(material)
		if result := tx.Table("materials").Create(&payload); result.Error != nil {
			return result.Error
		}
		createdId = payload.Id
		return replaceSuppliers(tx, payload.Id, material.Suppliers)
	})
	if err != nil {
		return domain.Material{}, ToErrorCtx(ctx, err, "CreateMaterial")
	}

	var created Material
	fetchResult := db.Table("materials").
		Preload("Suppliers", "deleted_at IS NULL").
		Preload("Suppliers.Supplier").
		Where("id = ?", createdId).
		First(&created)
	return ToMaterialDomain(created), ToErrorCtx(ctx, fetchResult.Error, "CreateMaterial")
}

func (repo Repository) UpdateMaterialById(ctx context.Context, material domain.Material, id int64) (domain.Material, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)

	err := db.Transaction(func(tx *gorm.DB) error {
		materialPayload := ToMaterialDB(material)
		if result := tx.Table("materials").Where("id = ?", id).Updates(&materialPayload); result.Error != nil {
			return result.Error
		}
		// Updates(&struct) skips zero-value fields, so a bool being set to
		// false (e.g. IsStockCheckRequired) would otherwise never persist.
		if err := tx.Table("materials").Where("id = ?", id).Update("is_stock_check_required", material.IsStockCheckRequired).Error; err != nil {
			return err
		}
		return replaceSuppliers(tx, id, material.Suppliers)
	})
	if err != nil {
		return domain.Material{}, ToErrorCtx(ctx, err, "UpdateMaterialById")
	}

	var updated Material
	fetchResult := db.Table("materials").
		Preload("Suppliers", "deleted_at IS NULL").
		Preload("Suppliers.Supplier").
		Where("id = ?", id).
		First(&updated)
	return ToMaterialDomain(updated), ToErrorCtx(ctx, fetchResult.Error, "UpdateMaterialById")
}

func (repo Repository) DeleteMaterialById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("materials").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToErrorCtx(ctx, result.Error, "DeleteMaterialById")
}

// replaceSuppliers performs a diff/upsert/soft-delete of material_suppliers
// within the provided DB connection (expected to be a transaction).
func replaceSuppliers(db *gorm.DB, materialId int64, payload []domain.MaterialSupplier) error {
	type lookupKey struct {
		SupplierId   int64
		PurchaseType string
	}

	var existing []MaterialSupplier
	if err := db.Table("material_suppliers").
		Where("material_id = ? AND deleted_at IS NULL", materialId).
		Find(&existing).Error; err != nil {
		return err
	}

	existingMap := make(map[lookupKey]MaterialSupplier)
	for _, e := range existing {
		existingMap[lookupKey{e.SupplierId, e.PurchaseType}] = e
	}

	now := time.Now()
	keptIds := make([]int64, 0)

	for _, p := range payload {
		k := lookupKey{p.SupplierId, string(p.PurchaseType)}
		if e, ok := existingMap[k]; ok {
			if e.PurchaseUrl != p.PurchaseUrl {
				if err := db.Table("material_suppliers").Where("id = ?", e.Id).Update("purchase_url", p.PurchaseUrl).Error; err != nil {
					return err
				}
			}
			keptIds = append(keptIds, e.Id)
		} else {
			newRow := MaterialSupplier{
				MaterialId:   materialId,
				SupplierId:   p.SupplierId,
				PurchaseType: string(p.PurchaseType),
				PurchaseUrl:  p.PurchaseUrl,
				CreatedAt:    now,
			}
			if err := db.Table("material_suppliers").Create(&newRow).Error; err != nil {
				return err
			}
			keptIds = append(keptIds, newRow.Id)
		}
	}

	if len(keptIds) > 0 {
		return db.Table("material_suppliers").
			Where("material_id = ? AND id NOT IN ? AND deleted_at IS NULL", materialId, keptIds).
			Update("deleted_at", now).Error
	}
	return db.Table("material_suppliers").
		Where("material_id = ? AND deleted_at IS NULL", materialId).
		Update("deleted_at", now).Error
}
