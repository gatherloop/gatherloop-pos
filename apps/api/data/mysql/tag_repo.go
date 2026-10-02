package mysql

import (
	"apps/api/domain"
	"context"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func NewTagRepository(db *gorm.DB) domain.TagRepository {
	return Repository{db: db}
}

func selectTagsWithVariantCount(db *gorm.DB) *gorm.DB {
	return db.Table("tags").Select("tags.*, (SELECT COUNT(*) FROM variant_tags JOIN variants ON variants.id = variant_tags.variant_id WHERE variant_tags.tag_id = tags.id AND variants.deleted_at IS NULL) AS variant_count")
}

func (repo Repository) GetTagList(ctx context.Context) ([]domain.Tag, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var tags []Tag
	result := selectTagsWithVariantCount(db).Order("sort_order ASC, name ASC").Find(&tags)
	return ToTagListDomain(tags), ToErrorCtx(ctx, result.Error, "GetTagList")
}

func (repo Repository) GetTagById(ctx context.Context, id int64) (domain.Tag, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	var tag Tag
	result := selectTagsWithVariantCount(db).Where("tags.id = ?", id).First(&tag)
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
	fetchResult := selectTagsWithVariantCount(db).Where("tags.id = ?", id).First(&updatedTag)
	return ToTagDomain(updatedTag), ToErrorCtx(ctx, fetchResult.Error, "UpdateTagById")
}

func (repo Repository) DeleteTagById(ctx context.Context, id int64) *domain.Error {
	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("tags").Where("id = ?", id).Delete(&Tag{})
	return ToErrorCtx(ctx, result.Error, "DeleteTagById")
}

func (repo Repository) GetTagVariantIds(ctx context.Context, tagId int64) ([]int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	variantIds := []int64{}
	result := db.Table("variant_tags").Where("tag_id = ?", tagId).Order("variant_id ASC").Pluck("variant_id", &variantIds)
	return variantIds, ToErrorCtx(ctx, result.Error, "GetTagVariantIds")
}

func (repo Repository) GetVariantTagIds(ctx context.Context, variantId int64) ([]int64, *domain.Error) {
	db := GetDbFromCtx(ctx, repo.db)
	tagIds := []int64{}
	result := db.Table("variant_tags").Where("variant_id = ?", variantId).Order("tag_id ASC").Pluck("tag_id", &tagIds)
	return tagIds, ToErrorCtx(ctx, result.Error, "GetVariantTagIds")
}

func (repo Repository) GetLiveVariantIds(ctx context.Context, variantIds []int64) ([]int64, *domain.Error) {
	liveVariantIds := []int64{}
	if len(variantIds) == 0 {
		return liveVariantIds, nil
	}

	db := GetDbFromCtx(ctx, repo.db)
	result := db.Table("variants").Where("id IN ? AND deleted_at IS NULL", variantIds).Pluck("id", &liveVariantIds)
	return liveVariantIds, ToErrorCtx(ctx, result.Error, "GetLiveVariantIds")
}

func (repo Repository) InsertVariantTags(ctx context.Context, pairs []domain.VariantTagPair) *domain.Error {
	if len(pairs) == 0 {
		return nil
	}

	db := GetDbFromCtx(ctx, repo.db)
	payload := ToVariantTagPairsDB(pairs)
	result := db.Table("variant_tags").Clauses(clause.OnConflict{DoNothing: true}).Create(&payload)
	return ToErrorCtx(ctx, result.Error, "InsertVariantTags")
}

func (repo Repository) DeleteVariantTags(ctx context.Context, pairs []domain.VariantTagPair) *domain.Error {
	if len(pairs) == 0 {
		return nil
	}

	db := GetDbFromCtx(ctx, repo.db)
	tuples := [][]interface{}{}
	for _, pair := range pairs {
		tuples = append(tuples, []interface{}{pair.VariantId, pair.TagId})
	}
	result := db.Table("variant_tags").Where("(variant_id, tag_id) IN ?", tuples).Delete(&VariantTag{})
	return ToErrorCtx(ctx, result.Error, "DeleteVariantTags")
}
