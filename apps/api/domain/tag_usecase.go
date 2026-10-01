package domain

import (
	"context"
	"strings"
	"unicode/utf8"
)

const tagNameMaxLength = 100

type TagUsecase struct {
	repository TagRepository
}

func NewTagUsecase(repository TagRepository) TagUsecase {
	return TagUsecase{repository: repository}
}

func (usecase TagUsecase) GetTagList(ctx context.Context) ([]Tag, *Error) {
	return usecase.repository.GetTagList(ctx)
}

func (usecase TagUsecase) GetTagById(ctx context.Context, id int64) (Tag, *Error) {
	return usecase.repository.GetTagById(ctx, id)
}

func (usecase TagUsecase) CreateTag(ctx context.Context, tag Tag) (Tag, *Error) {
	tag.Name = strings.TrimSpace(tag.Name)
	if err := usecase.validateTag(ctx, tag, nil); err != nil {
		return Tag{}, err
	}
	return usecase.repository.CreateTag(ctx, tag)
}

func (usecase TagUsecase) UpdateTagById(ctx context.Context, tag Tag, id int64) (Tag, *Error) {
	tag.Name = strings.TrimSpace(tag.Name)
	if err := usecase.validateTag(ctx, tag, &id); err != nil {
		return Tag{}, err
	}
	return usecase.repository.UpdateTagById(ctx, tag, id)
}

func (usecase TagUsecase) DeleteTagById(ctx context.Context, id int64) *Error {
	if _, err := usecase.repository.GetTagById(ctx, id); err != nil {
		return err
	}
	return usecase.repository.DeleteTagById(ctx, id)
}

func (usecase TagUsecase) validateTag(ctx context.Context, tag Tag, excludeId *int64) *Error {
	nameLength := utf8.RuneCountInString(tag.Name)
	if nameLength < 1 || nameLength > tagNameMaxLength {
		return &Error{Type: BadRequest, Message: "tag name must be between 1 and 100 characters"}
	}

	if !tag.Color.IsValid() {
		return &Error{Type: BadRequest, Message: "tag color is not supported"}
	}

	tags, err := usecase.repository.GetTagList(ctx)
	if err != nil {
		return err
	}
	for _, existing := range tags {
		isSameTag := excludeId != nil && existing.Id == *excludeId
		if !isSameTag && strings.EqualFold(existing.Name, tag.Name) {
			return &Error{Type: BadRequest, Message: "tag name already exists"}
		}
	}

	return nil
}
