package domain_test

import (
	"apps/api/domain"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestResolveProductTags(t *testing.T) {
	baseTime := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	newTag := domain.Tag{Id: 1, Name: "New", SortOrder: 2}
	bestSeller := domain.Tag{Id: 2, Name: "Best Seller", SortOrder: 1}

	tagged := func(id int64, tags ...domain.VariantTag) domain.Variant {
		return domain.Variant{Id: id, IsAvailable: true, Tags: tags}
	}
	at := func(tag domain.Tag, offsetDays int) domain.VariantTag {
		return domain.VariantTag{Tag: tag, TaggedAt: baseTime.AddDate(0, 0, offsetDays)}
	}
	deletedAt := baseTime

	tests := []struct {
		name     string
		variants []domain.Variant
		expected []domain.ProductTag
	}{
		{
			name:     "no variants",
			variants: []domain.Variant{},
			expected: []domain.ProductTag{},
		},
		{
			name:     "untagged variants",
			variants: []domain.Variant{tagged(1), tagged(2)},
			expected: []domain.ProductTag{},
		},
		{
			name: "pancong — only ice cream is new, so variant scope",
			variants: []domain.Variant{
				tagged(1), tagged(2), tagged(3),
				tagged(4, at(newTag, 0)),
			},
			expected: []domain.ProductTag{
				{Tag: newTag, Scope: domain.ProductTagScopeVariant, VariantIds: []int64{4}, TaggedAt: baseTime},
			},
		},
		{
			name:     "salted caramel macchiato — one of one variant, so product scope",
			variants: []domain.Variant{tagged(1, at(newTag, 0))},
			expected: []domain.ProductTag{
				{Tag: newTag, Scope: domain.ProductTagScopeProduct, VariantIds: []int64{1}, TaggedAt: baseTime},
			},
		},
		{
			name: "coffee latte — hot and iced both best seller, so product scope",
			variants: []domain.Variant{
				tagged(1, at(bestSeller, 0)),
				tagged(2, at(bestSeller, 0)),
			},
			expected: []domain.ProductTag{
				{Tag: bestSeller, Scope: domain.ProductTagScopeProduct, VariantIds: []int64{1, 2}, TaggedAt: baseTime},
			},
		},
		{
			name: "deleted variant is ignored for coverage and ids",
			variants: []domain.Variant{
				tagged(1, at(bestSeller, 0)),
				func() domain.Variant { v := tagged(2); v.DeletedAt = &deletedAt; return v }(),
				func() domain.Variant { v := tagged(3, at(bestSeller, 5)); v.DeletedAt = &deletedAt; return v }(),
			},
			expected: []domain.ProductTag{
				{Tag: bestSeller, Scope: domain.ProductTagScopeProduct, VariantIds: []int64{1}, TaggedAt: baseTime},
			},
		},
		{
			name: "sold-out variant still counts toward coverage",
			variants: []domain.Variant{
				tagged(1, at(bestSeller, 0)),
				func() domain.Variant { v := tagged(2, at(bestSeller, 0)); v.IsAvailable = false; return v }(),
			},
			expected: []domain.ProductTag{
				{Tag: bestSeller, Scope: domain.ProductTagScopeProduct, VariantIds: []int64{1, 2}, TaggedAt: baseTime},
			},
		},
		{
			name: "taggedAt is the latest among tagged variants",
			variants: []domain.Variant{
				tagged(1, at(newTag, 3)),
				tagged(2, at(newTag, 7)),
				tagged(3, at(newTag, 1)),
			},
			expected: []domain.ProductTag{
				{Tag: newTag, Scope: domain.ProductTagScopeProduct, VariantIds: []int64{1, 2, 3}, TaggedAt: baseTime.AddDate(0, 0, 7)},
			},
		},
		{
			name: "sorted by tag sort order, then name",
			variants: []domain.Variant{
				tagged(1, at(newTag, 0), at(bestSeller, 0), at(domain.Tag{Id: 3, Name: "Aaa", SortOrder: 1}, 0)),
			},
			expected: []domain.ProductTag{
				{Tag: domain.Tag{Id: 3, Name: "Aaa", SortOrder: 1}, Scope: domain.ProductTagScopeProduct, VariantIds: []int64{1}, TaggedAt: baseTime},
				{Tag: bestSeller, Scope: domain.ProductTagScopeProduct, VariantIds: []int64{1}, TaggedAt: baseTime},
				{Tag: newTag, Scope: domain.ProductTagScopeProduct, VariantIds: []int64{1}, TaggedAt: baseTime},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, domain.ResolveProductTags(tt.variants))
		})
	}
}
