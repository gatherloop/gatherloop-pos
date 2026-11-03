package domain

import (
	"apps/api/utils"
	"context"
	"strings"
)

const tagNameMaxLength = 100

type TagUsecase struct {
	tagRepository TagRepository
	tagService    TagService
}

func NewTagUsecase(tagRepository TagRepository, tagService TagService) TagUsecase {
	return TagUsecase{tagRepository: tagRepository, tagService: tagService}
}

func (usecase TagUsecase) GetTagList(ctx context.Context) ([]Tag, *Error) {
	return usecase.tagRepository.GetTagList(ctx)
}

func (usecase TagUsecase) GetTagById(ctx context.Context, id int64) (Tag, *Error) {
	return usecase.tagRepository.GetTagById(ctx, id)
}

func (usecase TagUsecase) CreateTag(ctx context.Context, tag Tag) (Tag, *Error) {
	tag.Name = strings.TrimSpace(tag.Name)
	if err := usecase.tagService.ValidateTag(ctx, tag, nil); err != nil {
		return Tag{}, err
	}
	return usecase.tagRepository.CreateTag(ctx, tag)
}

func (usecase TagUsecase) UpdateTagById(ctx context.Context, tag Tag, id int64) (Tag, *Error) {
	tag.Name = strings.TrimSpace(tag.Name)
	if err := usecase.tagService.ValidateTag(ctx, tag, &id); err != nil {
		return Tag{}, err
	}
	return usecase.tagRepository.UpdateTagById(ctx, tag, id)
}

func (usecase TagUsecase) DeleteTagById(ctx context.Context, id int64) *Error {
	if _, err := usecase.tagRepository.GetTagById(ctx, id); err != nil {
		return err
	}
	return usecase.tagRepository.DeleteTagById(ctx, id)
}

func (usecase TagUsecase) SetTagVariants(ctx context.Context, tagId int64, variantIds []int64) (Tag, *Error) {
	variantIds = utils.UniqueInt64s(variantIds)

	err := usecase.tagRepository.BeginTransaction(ctx, func(ctxWithTx context.Context) *Error {
		if _, err := usecase.tagRepository.GetTagById(ctxWithTx, tagId); err != nil {
			return err
		}

		liveVariantIds, err := usecase.tagRepository.GetLiveVariantIds(ctxWithTx, variantIds)
		if err != nil {
			return err
		}
		if len(liveVariantIds) != len(variantIds) {
			return &Error{Type: BadRequest, Message: "variant ids contain unknown or deleted variants"}
		}

		existingVariantIds, err := usecase.tagRepository.GetTagVariantIds(ctxWithTx, tagId)
		if err != nil {
			return err
		}

		return usecase.tagService.ApplyVariantTagPairs(ctxWithTx,
			tagVariantPairs(tagId, existingVariantIds),
			tagVariantPairs(tagId, variantIds),
		)
	})
	if err != nil {
		return Tag{}, err
	}

	return usecase.tagRepository.GetTagById(ctx, tagId)
}

func tagVariantPairs(tagId int64, variantIds []int64) []VariantTagPair {
	pairs := []VariantTagPair{}
	for _, variantId := range variantIds {
		pairs = append(pairs, VariantTagPair{VariantId: variantId, TagId: tagId})
	}
	return pairs
}
