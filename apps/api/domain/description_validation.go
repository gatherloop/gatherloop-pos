package domain

import "strings"

// maxDescriptionLength keeps a customer-facing description to roughly two
// lines on a 375px menu card (FR-2/FR-3).
const maxDescriptionLength = 160

// validateDescription enforces that description, when present, is a single
// short line safe to show a customer. recipe is unvalidated free text.
func validateDescription(description *string) *Error {
	if description == nil {
		return nil
	}
	if len(*description) > maxDescriptionLength {
		return &Error{Type: BadRequest, Message: "description must be at most 160 characters"}
	}
	if strings.ContainsAny(*description, "\n\r") {
		return &Error{Type: BadRequest, Message: "description must be a single line"}
	}
	return nil
}
