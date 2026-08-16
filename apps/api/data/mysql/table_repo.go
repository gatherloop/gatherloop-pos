package mysql

import (
	"apps/api/domain"
	"context"
	"time"

	"gorm.io/gorm"
)

func NewTableRepository(db *gorm.DB) domain.TableRepository {
	return Repository{db: db}
}

func (repo Repository) GetTableList(ctx context.Context) ([]domain.Table, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var tables []Table
	result := db.Table("tables").Where("deleted_at", nil).Find(&tables)
	return ToTableListDomain(tables), ToErrorCtx(ctx, result.Error, "GetTableList")
}

func (repo Repository) GetTableById(ctx context.Context, id int64) (domain.Table, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var table Table
	result := db.Table("tables").Where("id = ?", id).First(&table)
	return ToTableDomain(table), ToErrorCtx(ctx, result.Error, "GetTableById")
}

func (repo Repository) GetTableByCode(ctx context.Context, code string) (domain.Table, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var table Table
	result := db.Table("tables").Where("code = ? AND deleted_at IS NULL", code).First(&table)
	return ToTableDomain(table), ToErrorCtx(ctx, result.Error, "GetTableByCode")
}

func (repo Repository) GetTableByLabel(ctx context.Context, label string) (domain.Table, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var table Table
	result := db.Table("tables").Where("label = ? AND deleted_at IS NULL", label).First(&table)
	return ToTableDomain(table), ToErrorCtx(ctx, result.Error, "GetTableByLabel")
}

func (repo Repository) CreateTable(ctx context.Context, table domain.Table) (domain.Table, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	tablePayload := ToTableDB(table)
	result := db.Table("tables").Create(&tablePayload)
	return ToTableDomain(tablePayload), ToErrorCtx(ctx, result.Error, "CreateTable")
}

func (repo Repository) UpdateTableById(ctx context.Context, table domain.Table, id int64) (domain.Table, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	tablePayload := ToTableDB(table)
	if result := db.Table("tables").Where("id = ?", id).Updates(&tablePayload); result.Error != nil {
		return domain.Table{}, ToErrorCtx(ctx, result.Error, "UpdateTableById")
	}

	var updatedTable Table
	fetchResult := db.Table("tables").Where("id = ?", id).First(&updatedTable)
	return ToTableDomain(updatedTable), ToErrorCtx(ctx, fetchResult.Error, "UpdateTableById")
}

func (repo Repository) DeleteTableById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	currentTime := time.Now()
	result := db.Table("tables").Where("id = ?", id).Update("deleted_at", currentTime)
	return ToErrorCtx(ctx, result.Error, "DeleteTableById")
}
