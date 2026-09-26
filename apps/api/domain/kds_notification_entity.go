package domain

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

type KdsNotificationStatus string

const (
	KdsNotificationStatusPending KdsNotificationStatus = "pending"
	KdsNotificationStatusSent    KdsNotificationStatus = "sent"
	KdsNotificationStatusFailed  KdsNotificationStatus = "failed"
	KdsNotificationStatusSkipped KdsNotificationStatus = "skipped"
)

// FR-4: a pending row that never gets a device to accept it stops retrying and becomes failed.
const KdsNotificationMaxAttempts = 5

type KdsNotificationKind string

const (
	KdsNotificationKindOrderPaid       KdsNotificationKind = "order_paid"
	KdsNotificationKindCashPending     KdsNotificationKind = "cash_pending"
	KdsNotificationKindCashCancelled   KdsNotificationKind = "cash_cancelled"
	KdsNotificationKindCodVerification KdsNotificationKind = "cod_verification"
)

type KdsStation string

const (
	KdsStationBar     KdsStation = "BAR"
	KdsStationKitchen KdsStation = "KITCHEN"
)

// The fixed display order for every station line in a notification body (FR-6).
var kdsStationOrder = []KdsStation{KdsStationBar, KdsStationKitchen}

type KdsStationLine struct {
	Station KdsStation
	Items   []string
}

type KdsNotification struct {
	Id            int64
	TransactionId int64
	Kind          KdsNotificationKind
	Status        KdsNotificationStatus
	AttemptCount  int
	Detail        *string
	CreatedAt     time.Time
	SentAt        *time.Time
}

const kdsNotificationBodyItemLimit = 4

// BuildKdsPushMessage is pure and re-derived at send time (FR-6): a paid transaction cannot be
// edited, so there is nothing to snapshot against. The kind picks the title/body pair (FR-7):
// order_paid gains a pay-at-pickup line for an unpaid COD transaction (FR-9) but is otherwise
// unchanged, cash_pending leads with the amount to collect, cash_cancelled retracts it, and
// cod_verification asks a barista to look at the photo before anything is made.
func BuildKdsPushMessage(transaction Transaction, kind KdsNotificationKind, sound string) KdsPushMessage {
	lines := StationLines(transaction)

	stations := make([]string, len(lines))
	for i, line := range lines {
		stations[i] = string(line.Station)
	}

	title := buildKdsNotificationTitle(transaction)
	body := buildOrderPaidNotificationBody(transaction, lines)
	switch kind {
	case KdsNotificationKindCashPending:
		title = buildCashPendingNotificationTitle(transaction)
		body = buildCashPendingNotificationBody(transaction, lines)
	case KdsNotificationKindCashCancelled:
		title = buildCashCancelledNotificationTitle(transaction)
		body = cashCancelledNotificationBody
	case KdsNotificationKindCodVerification:
		title = buildCodVerificationNotificationTitle(transaction)
		body = buildCodVerificationNotificationBody(transaction)
	}

	return KdsPushMessage{
		Title:     title,
		Body:      body,
		Sound:     sound,
		ChannelId: kdsPushChannelId,
		Priority:  KdsPushPriorityHigh,
		Data: map[string]any{
			"transactionId":     transaction.Id,
			"transactionNumber": transaction.TransactionNumber,
			"stations":          stations,
			"source":            string(transaction.Source),
			"kind":              string(kind),
		},
	}
}

func buildKdsNotificationTitle(transaction Transaction) string {
	return fmt.Sprintf("New order #%d — %s", transaction.TransactionNumber, kdsOrderSubject(transaction))
}

func buildCashPendingNotificationTitle(transaction Transaction) string {
	return fmt.Sprintf("Cash order #%d — %s", transaction.TransactionNumber, kdsOrderSubject(transaction))
}

// buildCashPendingNotificationBody leads with the amount to collect, since the point of this
// notification is a barista walking to the till, not making a drink (D9) — a transaction with no
// station items (a board-game ticket paid in cash) still renders the amount line alone.
func buildCashPendingNotificationBody(transaction Transaction, lines []KdsStationLine) string {
	amountLine := fmt.Sprintf("Collect %s at the counter", formatRupiah(transaction.Total))

	stationsBody := buildKdsNotificationBody(lines)
	if stationsBody == "" {
		return amountLine
	}
	return amountLine + " · " + stationsBody
}

func buildCashCancelledNotificationTitle(transaction Transaction) string {
	return fmt.Sprintf("Cash order #%d cancelled — %s", transaction.TransactionNumber, kdsOrderSubject(transaction))
}

// cashCancelledNotificationBody is a fixed retraction, not a description of items (D16): its only
// job is telling a barista who may already be walking to the till to stand down.
const cashCancelledNotificationBody = "Guest cancelled. Don't wait at the till."

func buildCodVerificationNotificationTitle(transaction Transaction) string {
	return fmt.Sprintf("Verify COD order #%d — %s", transaction.TransactionNumber, kdsOrderSubject(transaction))
}

// buildCodVerificationNotificationBody leads with the instruction to check the photo, not the
// items (D15): this push asks for a presence decision, not preparation — nothing is made until
// order_paid follows approval.
func buildCodVerificationNotificationBody(transaction Transaction) string {
	return fmt.Sprintf("Check the photo in the POS · %s", formatRupiah(transaction.Total))
}

// buildOrderPaidNotificationBody appends a pay-at-pickup reminder for a still-unpaid COD
// transaction (FR-9): order_paid is the "start making it" signal for every method, but COD is the
// only one where approval, not payment, triggers it.
func buildOrderPaidNotificationBody(transaction Transaction, lines []KdsStationLine) string {
	body := buildKdsNotificationBody(lines)
	if !isUnpaidCod(transaction) {
		return body
	}

	pickupLine := fmt.Sprintf("COD — collect %s at pickup", formatRupiah(transaction.Total))
	if body == "" {
		return pickupLine
	}
	return body + " · " + pickupLine
}

func isUnpaidCod(transaction Transaction) bool {
	return transaction.PaymentMethod != nil && *transaction.PaymentMethod == PaymentMethodCod && transaction.PaidAt == nil
}

func kdsOrderSubject(transaction Transaction) string {
	if transaction.Source == TransactionSourceOrder && transaction.Cart != nil && transaction.Cart.Table != nil {
		return transaction.Cart.Table.Label
	}
	return transaction.Name
}

func buildKdsNotificationBody(lines []KdsStationLine) string {
	type flatItem struct {
		Station KdsStation
		Text    string
	}

	var flat []flatItem
	for _, line := range lines {
		for _, item := range line.Items {
			flat = append(flat, flatItem{Station: line.Station, Text: item})
		}
	}

	shown := flat
	hidden := 0
	if len(flat) > kdsNotificationBodyItemLimit {
		shown = flat[:kdsNotificationBodyItemLimit]
		hidden = len(flat) - kdsNotificationBodyItemLimit
	}

	var segments []string
	for _, station := range kdsStationOrder {
		var items []string
		for _, item := range shown {
			if item.Station == station {
				items = append(items, item.Text)
			}
		}
		if len(items) > 0 {
			segments = append(segments, fmt.Sprintf("%s: %s", station, strings.Join(items, ", ")))
		}
	}

	body := strings.Join(segments, " · ")
	if hidden > 0 {
		body = fmt.Sprintf("%s, +%d more", body, hidden)
	}
	return body
}

func formatKdsItemAmount(amount float32) string {
	if amount == float32(int64(amount)) {
		return strconv.FormatInt(int64(amount), 10)
	}
	return strconv.FormatFloat(float64(amount), 'f', 2, 32)
}

// formatRupiah mirrors libs/ui/src/utils/currency.ts's formatRupiah: whole rupiah, dot-grouped
// thousands, no decimals — the same money format the order slip renders.
func formatRupiah(amount float32) string {
	rounded := int64(math.Round(float64(amount)))

	sign := ""
	if rounded < 0 {
		sign = "-"
		rounded = -rounded
	}

	digits := strconv.FormatInt(rounded, 10)
	var groups []string
	for len(digits) > 3 {
		groups = append([]string{digits[len(digits)-3:]}, groups...)
		digits = digits[:len(digits)-3]
	}
	groups = append([]string{digits}, groups...)

	return sign + "Rp " + strings.Join(groups, ".")
}
