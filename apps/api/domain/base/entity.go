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

type ErrorType int

const (
	BadRequest ErrorType = iota
	Unauthorized
	NotFound
	InternalServerError
)

type Error struct {
	Type    ErrorType
	Message string
}
