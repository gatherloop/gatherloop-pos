package domain

import "context"

func uniqueInt64s(values []int64) []int64 {
	seen := map[int64]bool{}
	unique := []int64{}
	for _, value := range values {
		if !seen[value] {
			seen[value] = true
			unique = append(unique, value)
		}
	}
	return unique
}

func diffVariantTagPairs(existing []VariantTagPair, desired []VariantTagPair) (toInsert []VariantTagPair, toDelete []VariantTagPair) {
	existingSet := map[VariantTagPair]bool{}
	for _, pair := range existing {
		existingSet[pair] = true
	}
	desiredSet := map[VariantTagPair]bool{}
	for _, pair := range desired {
		desiredSet[pair] = true
		if !existingSet[pair] {
			toInsert = append(toInsert, pair)
		}
	}
	for _, pair := range existing {
		if !desiredSet[pair] {
			toDelete = append(toDelete, pair)
		}
	}
	return toInsert, toDelete
}

func applyVariantTagPairs(ctx context.Context, repository TagRepository, existing []VariantTagPair, desired []VariantTagPair) *Error {
	toInsert, toDelete := diffVariantTagPairs(existing, desired)

	if len(toDelete) > 0 {
		if err := repository.DeleteVariantTags(ctx, toDelete); err != nil {
			return err
		}
	}
	if len(toInsert) > 0 {
		if err := repository.InsertVariantTags(ctx, toInsert); err != nil {
			return err
		}
	}
	return nil
}
