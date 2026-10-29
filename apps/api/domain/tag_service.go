package domain

import (
	"context"
	"strings"
	"unicode/utf8"
)

type TagService struct {
	tagRepository TagRepository
}

func NewTagService(tagRepository TagRepository) TagService {
	return TagService{
		tagRepository: tagRepository,
	}
}

func (service TagService) ValidateTag(ctx context.Context, tag Tag, excludeId *int64) *Error {
	nameLength := utf8.RuneCountInString(tag.Name)
	if nameLength < 1 || nameLength > tagNameMaxLength {
		return &Error{Type: BadRequest, Message: "tag name must be between 1 and 100 characters"}
	}

	if !tag.Color.IsValid() {
		return &Error{Type: BadRequest, Message: "tag color is not supported"}
	}

	tags, err := service.tagRepository.GetTagList(ctx)
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
