package restapi

import (
	"apps/api/domain"
	"encoding/json"
	apiContract "libs/api-contract"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetTagId(r *http.Request) (int64, error) {
	vars := mux.Vars(r)
	idParam := vars["tagId"]
	id, err := strconv.ParseInt(idParam, 10, 32)
	return id, err
}

func GetTagRequest(r *http.Request) (apiContract.TagRequest, error) {
	var tagRequest apiContract.TagRequest
	err := json.NewDecoder(r.Body).Decode(&tagRequest)
	return tagRequest, err
}

func ToApiTag(tag domain.Tag) apiContract.Tag {
	return apiContract.Tag{
		Id:            tag.Id,
		Name:          tag.Name,
		Color:         string(tag.Color),
		IsHighlighted: tag.IsHighlighted,
		SortOrder:     int32(tag.SortOrder),
		CreatedAt:     tag.CreatedAt,
	}
}

func ToApiTagWithVariantCount(tag domain.Tag) apiContract.Tag {
	apiTag := ToApiTag(tag)
	variantCount := tag.VariantCount
	apiTag.VariantCount = &variantCount
	return apiTag
}

func GetTagVariantsRequest(r *http.Request) (apiContract.TagVariantsRequest, error) {
	var request apiContract.TagVariantsRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	return request, err
}

func ToApiVariantTag(variantTag domain.VariantTag) apiContract.VariantTag {
	return apiContract.VariantTag{
		Tag:      ToApiTag(variantTag.Tag),
		TaggedAt: variantTag.TaggedAt,
	}
}

func ToTag(tagRequest apiContract.TagRequest) domain.Tag {
	return domain.Tag{
		Name:          tagRequest.Name,
		Color:         domain.TagColor(tagRequest.Color),
		IsHighlighted: tagRequest.IsHighlighted,
		SortOrder:     int(tagRequest.SortOrder),
	}
}
