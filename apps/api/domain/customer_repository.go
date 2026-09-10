//go:generate mockgen -source=customer_repository.go -destination=../data/mock/customer_repository.go -package=mock

package domain

import "context"

// CustomerRepository is deliberately the one write port without
// BeginTransaction. Its only writer is checkout (FR-6 step 1), which upserts
// the name inside the payment transaction that also writes the transaction
// and payment rows — and mysql.Repository.BeginTransaction opens against
// repo.db rather than the ctx's tx, so a nested Begin here would open a
// *second*, independent transaction and silently break that atomicity. The
// methods below read the ambient tx out of ctx instead, which is what makes
// them composable inside it. The `uq_customers_session_id` unique key is what
// keeps a concurrent first-write from producing two rows.
type CustomerRepository interface {
	GetCustomerBySessionId(ctx context.Context, sessionId string) (Customer, *Error)
	UpsertCustomerBySessionId(ctx context.Context, sessionId string, name string) (Customer, *Error)
}
