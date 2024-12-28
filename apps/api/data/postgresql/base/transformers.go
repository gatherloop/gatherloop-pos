package base_postgresql

import "apps/api/domain/base"

func ToSortByColumn(sortBy base.SortBy) string {
	switch sortBy {
	case base.CreatedAt:
		return "created_at"
	default:
		return "created_at"
	}
}

func ToOrderColumn(order base.Order) string {
	switch order {
	case base.Ascending:
		return "asc"
	case base.Descending:
		return "desc"
	default:
		return "asc"
	}
}
