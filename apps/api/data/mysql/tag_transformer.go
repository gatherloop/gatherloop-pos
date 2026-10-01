package mysql

import "apps/api/domain"

func ToTagDB(domainTag domain.Tag) Tag {
	return Tag{
		Id:            domainTag.Id,
		Name:          domainTag.Name,
		Color:         string(domainTag.Color),
		IsHighlighted: domainTag.IsHighlighted,
		SortOrder:     domainTag.SortOrder,
		CreatedAt:     domainTag.CreatedAt,
	}
}

func ToTagDomain(dbTag Tag) domain.Tag {
	return domain.Tag{
		Id:            dbTag.Id,
		Name:          dbTag.Name,
		Color:         domain.TagColor(dbTag.Color),
		IsHighlighted: dbTag.IsHighlighted,
		SortOrder:     dbTag.SortOrder,
		VariantCount:  dbTag.VariantCount,
		CreatedAt:     dbTag.CreatedAt,
	}
}

func ToTagListDomain(dbTags []Tag) []domain.Tag {
	var domainTags []domain.Tag
	for _, dbTag := range dbTags {
		domainTags = append(domainTags, ToTagDomain(dbTag))
	}
	return domainTags
}

func ToVariantTagListDomain(dbVariantTags []VariantTag) []domain.VariantTag {
	var domainVariantTags []domain.VariantTag
	for _, dbVariantTag := range dbVariantTags {
		domainVariantTags = append(domainVariantTags, domain.VariantTag{
			Tag:      ToTagDomain(dbVariantTag.Tag),
			TaggedAt: dbVariantTag.CreatedAt,
		})
	}
	return domainVariantTags
}

func ToVariantTagPairsDB(pairs []domain.VariantTagPair) []VariantTag {
	var dbVariantTags []VariantTag
	for _, pair := range pairs {
		dbVariantTags = append(dbVariantTags, VariantTag{VariantId: pair.VariantId, TagId: pair.TagId})
	}
	return dbVariantTags
}
