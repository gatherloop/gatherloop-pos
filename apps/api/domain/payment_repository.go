//go:generate mockgen -source=payment_repository.go -destination=../data/mock/payment_repository.go -package=mock

package domain

import "context"

// PaymentRepository is the persistence port for `payments` (FR-5),
// implemented by data/mysql.
//
// It carries BeginTransaction like every other write repository, which is
// also why it cannot be merged with the gateway port below (D2a): a DOKU
// HTTP call has no meaningful implementation of a database transaction
// boundary, so data/doku would have to stub one. Keeping them apart is what
// lets a usecase test say "the gateway timed out but the database is
// healthy" — the case FR-6 step 7 exists to cover.
type PaymentRepository interface {
	BeginTransaction(ctx context.Context, callback func(ctxWithTx context.Context) *Error) *Error
	// GetPaymentByPartnerReferenceNo looks a payment up by our own
	// reference (D18) — the key a status read and a DOKU notification both
	// arrive with.
	GetPaymentByPartnerReferenceNo(ctx context.Context, partnerReferenceNo string) (Payment, *Error)
	// GetPendingPaymentByCartId returns the cart's most recent payment
	// still in the pending state, or a NotFound error when it has none.
	//
	// "Pending" here is the stored status alone: whether that payment is
	// also unexpired — the question D10's freeze and D11's idempotency
	// actually ask — is Payment.IsAwaitingPayment's to answer, so the clock
	// stays in the domain where a test can hold it still, rather than in a
	// NOW() the SQL hides.
	GetPendingPaymentByCartId(ctx context.Context, cartId int64) (Payment, *Error)
	CreatePayment(ctx context.Context, payment Payment) (Payment, *Error)
	// UpdatePaymentById writes only the fields that legitimately move after
	// a payment exists: the gateway's reference and QR, the transaction it
	// ends up paying, and the status trail. Everything a QR was minted
	// against — cart, session, reference, method, amount and expiry — is
	// frozen at creation (D9) and is not updatable through this port.
	//
	// Those writable fields are written as given, so callers read, mutate
	// and pass the whole payment back rather than assembling a partial one:
	// a Payment built from scratch would blank the QR content and the paid
	// timestamp it left unset.
	UpdatePaymentById(ctx context.Context, payment Payment, id int64) (Payment, *Error)
}

// PaymentGatewayRepository is the port to the payment provider (D2). Named
// like every other port in the repo — the `Repository` suffix marks a
// domain-declared interface implemented in an outer layer, not a database:
// SessionRepository is a cookie, CartQueryRepository is the URL query
// string, this one is DOKU's HTTP API.
//
// It shares this file, and the single mockgen header above, with the
// persistence port (D2): source-mode mockgen mocks every interface in its
// input, so one invocation emits both mocks into
// ../data/mock/payment_repository.go.
type PaymentGatewayRepository interface {
	GenerateQris(ctx context.Context, input GenerateQrisInput) (QrisPayment, *Error)
	QueryQris(ctx context.Context, input QueryQrisInput) (QrisStatus, *Error)
	VerifyNotificationSignature(method, path string, headers NotificationHeaders, body []byte) *Error
	ParseNotification(body []byte) (QrisStatus, *Error)
}
