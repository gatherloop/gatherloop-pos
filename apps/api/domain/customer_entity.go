package domain

import "time"

// Customer is the name an anonymous guest gave at checkout, keyed by the
// session that gave it (D24). Deliberately not a CRM: no phone, no email, no
// marketing consent, no cross-session identity — a row is a display name and
// a session ID, and it inherits the session cookie's one-year life.
type Customer struct {
	Id        int64
	SessionId string
	Name      string
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt *time.Time
}
