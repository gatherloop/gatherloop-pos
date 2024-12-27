package base

type SortBy int

const (
	CreatedAt SortBy = iota
)

type Order int

const (
	Ascending Order = iota
	Descending
)
