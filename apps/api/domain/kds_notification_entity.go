package domain

import (
	"fmt"
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
	Status        KdsNotificationStatus
	AttemptCount  int
	Detail        *string
	CreatedAt     time.Time
	SentAt        *time.Time
}

const kdsNotificationBodyItemLimit = 4

// BuildKdsPushMessage is pure and re-derived at send time (FR-6): a paid transaction cannot be
// edited, so there is nothing to snapshot against.
func BuildKdsPushMessage(transaction Transaction, sound string) KdsPushMessage {
	lines := StationLines(transaction)

	stations := make([]string, len(lines))
	for i, line := range lines {
		stations[i] = string(line.Station)
	}

	return KdsPushMessage{
		Title:     buildKdsNotificationTitle(transaction),
		Body:      buildKdsNotificationBody(lines),
		Sound:     sound,
		ChannelId: kdsPushChannelId,
		Data: map[string]any{
			"transactionId":     transaction.Id,
			"transactionNumber": transaction.TransactionNumber,
			"stations":          stations,
			"source":            string(transaction.Source),
		},
	}
}

func buildKdsNotificationTitle(transaction Transaction) string {
	return fmt.Sprintf("New order #%d — %s", transaction.TransactionNumber, kdsOrderSubject(transaction))
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
