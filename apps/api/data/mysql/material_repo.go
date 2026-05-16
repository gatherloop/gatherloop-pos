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
	result := db.Table("materials").Where("deleted_at", nil).Order(fmt.Sprintf("%s %s", ToSortByColumn(sortBy), ToOrderColumn(order)))

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
	result := db.Table("materials").Where("id = ?", id).Where("deleted_at", nil).First(&material)
	return ToMaterialDomain(material), ToErrorCtx(ctx, result.Error, "GetMaterialById")
}

func (repo Repository) CreateMaterial(ctx context.Context, material domain.Material) (domain.Material, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	materialPayload := ToMaterialDB(material)
	result := db.Table("materials").Create(&materialPayload)

	if result.Error != nil {
		return domain.Material{}, ToErrorCtx(ctx, result.Error, "CreateMaterial")
	}

	return ToMaterialDomain(materialPayload), nil
}

func (repo Repository) UpdateMaterialById(ctx context.Context, material domain.Material, id int64) (domain.Material, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	materialPayload := ToMaterialDB(material)
	if result := db.Table("materials").Where("id = ?", id).Updates(&materialPayload); result.Error != nil {
		return domain.Material{}, ToErrorCtx(ctx, result.Error, "UpdateMaterialById")
	}

	// Fetch the updated material to get all fields including timestamps
	var updatedMaterial Material
	fetchResult := db.Table("materials").Where("id = ?", id).First(&updatedMaterial)
	return ToMaterialDomain(updatedMaterial), ToErrorCtx(ctx, fetchResult.Error, "UpdateMaterialById")
}

func (repo Repository) DeleteMaterialById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("materials").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToErrorCtx(ctx, result.Error, "DeleteMaterialById")
}

type materialSupplierRow struct {
	MaterialId int64 `gorm:"column:material_id"`
	SupplierId int64 `gorm:"column:supplier_id"`
	Name       string
	Phone      *string
	Address    string
	MapsLink   string `gorm:"column:maps_link"`
	IsOnline   bool   `gorm:"column:is_online"`
}

func (repo Repository) GetMaterialSuppliersByMaterialIds(ctx context.Context, materialIds []int64) (map[int64][]domain.Supplier, *domain.Error) {
	if len(materialIds) == 0 {
		return map[int64][]domain.Supplier{}, nil
	}

	db := GetDbFromCtx(ctx, repo.db)
	var rows []materialSupplierRow

	err := db.Table("material_suppliers").
		Select("material_suppliers.material_id, suppliers.id AS supplier_id, suppliers.name, suppliers.phone, suppliers.address, suppliers.maps_link, suppliers.is_online").
		Joins("JOIN suppliers ON material_suppliers.supplier_id = suppliers.id").
		Where("material_suppliers.material_id IN ?", materialIds).
		Where("suppliers.deleted_at IS NULL").
		Scan(&rows).Error

	if err != nil {
		return nil, ToErrorCtx(ctx, err, "GetMaterialSuppliersByMaterialIds")
	}

	result := make(map[int64][]domain.Supplier)
	for _, row := range rows {
		result[row.MaterialId] = append(result[row.MaterialId], domain.Supplier{
			Id:       row.SupplierId,
			Name:     row.Name,
			Phone:    row.Phone,
			Address:  row.Address,
			MapsLink: row.MapsLink,
			IsOnline: row.IsOnline,
		})
	}
	return result, nil
}

func (repo Repository) SetMaterialSuppliers(ctx context.Context, materialId int64, supplierIds []int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)

	if err := db.Table("material_suppliers").Where("material_id = ?", materialId).Delete(nil).Error; err != nil {
		return ToErrorCtx(ctx, err, "SetMaterialSuppliers")
	}

	if len(supplierIds) == 0 {
		return nil
	}

	type row struct {
		MaterialId int64 `gorm:"column:material_id"`
		SupplierId int64 `gorm:"column:supplier_id"`
	}
	rows := make([]row, 0, len(supplierIds))
	for _, sid := range supplierIds {
		rows = append(rows, row{MaterialId: materialId, SupplierId: sid})
	}

	if err := db.Table("material_suppliers").Create(&rows).Error; err != nil {
		return ToErrorCtx(ctx, err, "SetMaterialSuppliers")
	}
	return nil
}
