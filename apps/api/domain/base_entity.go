package domain

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
	// BadGateway is a failure at an upstream provider — today only the
	// payment gateway (FR-6 step 7) — kept distinct from
	// InternalServerError so a handler can answer 502 rather than 500
	// while the response body still carries the same "internal_server_error"
	// code (there is no dedicated ErrorCode for it in api.yaml).
	BadGateway
)

type Error struct {
	Type    ErrorType
	Message string
}
