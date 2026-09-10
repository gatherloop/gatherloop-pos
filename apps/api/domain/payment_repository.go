//go:generate mockgen -source=payment_repository.go -destination=../data/mock/payment_repository.go -package=mock

package domain

import "context"

// PaymentGatewayRepository is the port to the payment provider (D2). Named
// like every other port in the repo — the `Repository` suffix marks a
// domain-declared interface implemented in an outer layer, not a database:
// SessionRepository is a cookie, CartQueryRepository is the URL query
// string, this one is DOKU's HTTP API.
//
// PaymentRepository, the persistence port, joins this file in phase 5
// beside this one (D2) — mockgen's source mode mocks every interface in its
// input, so that one `go:generate` line above will then emit both mocks
// from a single invocation.
type PaymentGatewayRepository interface {
	GenerateQris(ctx context.Context, input GenerateQrisInput) (QrisPayment, *Error)
	QueryQris(ctx context.Context, input QueryQrisInput) (QrisStatus, *Error)
	VerifyNotificationSignature(method, path string, headers NotificationHeaders, body []byte) *Error
	ParseNotification(body []byte) (QrisStatus, *Error)
}
