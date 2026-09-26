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
	BadGateway
)

type ErrorReason int

const (
	ErrorReasonNone ErrorReason = iota
	ErrorReasonWhatsappNumberInvalid
	ErrorReasonWhatsappNumberNotRegistered
)

type Error struct {
	Type    ErrorType
	Message string
	Reason  ErrorReason
}
