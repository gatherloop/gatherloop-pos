package utils

func UniqueInt64s(values []int64) []int64 {
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
