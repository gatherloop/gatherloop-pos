//go:generate mockgen -source=tag_repository.go -destination=../data/mock/tag_repository.go -package=mock

package domain

import (
	"context"
)

type TagRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	GetTagList(ctx context.Context) ([]Tag, *Error)
	GetTagById(ctx context.Context, id int64) (Tag, *Error)
	CreateTag(ctx context.Context, tag Tag) (Tag, *Error)
	UpdateTagById(ctx context.Context, tag Tag, id int64) (Tag, *Error)
	DeleteTagById(ctx context.Context, id int64) *Error
	GetTagVariantIds(ctx context.Context, tagId int64) ([]int64, *Error)
	GetVariantTagIds(ctx context.Context, variantId int64) ([]int64, *Error)
	GetLiveVariantIds(ctx context.Context, variantIds []int64) ([]int64, *Error)
	InsertVariantTags(ctx context.Context, pairs []VariantTagPair) *Error
	DeleteVariantTags(ctx context.Context, pairs []VariantTagPair) *Error
}
