package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
)

func NewTagRepository(db *gorm.DB) domain.TagRepository {
	return Repository{db: db}
}

func (repo Repository) GetTagList(ctx context.Context) ([]domain.Tag, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var tags []Tag
	result := db.Table("tags").Order("sort_order ASC, name ASC").Find(&tags)
	return ToTagListDomain(tags), ToErrorCtx(ctx, result.Error, "GetTagList")
}

func (repo Repository) GetTagById(ctx context.Context, id int64) (domain.Tag, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var tag Tag
	result := db.Table("tags").Where("id = ?", id).First(&tag)
	return ToTagDomain(tag), ToErrorCtx(ctx, result.Error, "GetTagById")
}

func (repo Repository) CreateTag(ctx context.Context, tag domain.Tag) (domain.Tag, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	tagPayload := ToTagDB(tag)
	result := db.Table("tags").Create(&tagPayload)
	return ToTagDomain(tagPayload), ToErrorCtx(ctx, result.Error, "CreateTag")
}

func (repo Repository) UpdateTagById(ctx context.Context, tag domain.Tag, id int64) (domain.Tag, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	tagPayload := ToTagDB(tag)
	result := db.Table("tags").Where("id = ?", id).
		Select("name", "color", "is_highlighted", "sort_order").
		Updates(&tagPayload)
	if result.Error != nil {
		return domain.Tag{}, ToErrorCtx(ctx, result.Error, "UpdateTagById")
	}

	var updatedTag Tag
	fetchResult := db.Table("tags").Where("id = ?", id).First(&updatedTag)
	return ToTagDomain(updatedTag), ToErrorCtx(ctx, fetchResult.Error, "UpdateTagById")
}

func (repo Repository) DeleteTagById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("tags").Where("id = ?", id).Delete(&Tag{})
	return ToErrorCtx(ctx, result.Error, "DeleteTagById")
}
