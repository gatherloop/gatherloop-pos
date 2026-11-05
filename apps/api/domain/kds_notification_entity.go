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

const cashCancelledNotificationBody = "Guest cancelled. Don't wait at the till."

func buildCodVerificationNotificationTitle(transaction Transaction) string {
	return fmt.Sprintf("Verify COD order #%d — %s", transaction.TransactionNumber, kdsOrderSubject(transaction))
}

func buildCodVerificationNotificationBody(transaction Transaction) string {
	return fmt.Sprintf("Check the photo in the POS · %s", formatRupiah(transaction.Total))
}

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

func StationLines(transaction Transaction) []KdsStationLine {
	type productAmount struct {
		productName string
		amount      float32
	}

	amountsByStation := map[KdsStation][]*productAmount{}
	indexByStation := map[KdsStation]map[string]int{}

	for _, item := range transaction.TransactionItems {
		station := KdsStation(item.Variant.Product.Category.Station)
		if station != KdsStationBar && station != KdsStationKitchen {
			continue
		}

		if indexByStation[station] == nil {
			indexByStation[station] = map[string]int{}
		}

		if index, ok := indexByStation[station][item.ProductName]; ok {
			amountsByStation[station][index].amount += item.Amount
			continue
		}

		indexByStation[station][item.ProductName] = len(amountsByStation[station])
		amountsByStation[station] = append(amountsByStation[station], &productAmount{
			productName: item.ProductName,
			amount:      item.Amount,
		})
	}

	var lines []KdsStationLine
	for _, station := range kdsStationOrder {
		products, ok := amountsByStation[station]
		if !ok {
			continue
		}

		items := make([]string, len(products))
		for i, product := range products {
			items[i] = formatKdsItemAmount(product.amount) + "× " + product.productName
		}
		lines = append(lines, KdsStationLine{Station: station, Items: items})
	}
	return lines
}

func ShouldNotify(transaction Transaction) bool {
	return len(StationLines(transaction)) > 0
}

func IsStaleForNotification(transaction Transaction, now time.Time) bool {
	const businessDayFormat = "2006-01-02"
	return transaction.CreatedAt.Format(businessDayFormat) != now.Format(businessDayFormat)
}

const KdsPushPriorityHigh = "high"

type KdsPushMessage struct {
	To        string
	Title     string
	Body      string
	Sound     string
	ChannelId string
	Priority  string
	Data      map[string]any
}

type KdsPushReceiptStatus string

const (
	KdsPushReceiptStatusOk    KdsPushReceiptStatus = "ok"
	KdsPushReceiptStatusError KdsPushReceiptStatus = "error"
)

const KdsPushErrorCodeDeviceNotRegistered = "DeviceNotRegistered"

type KdsPushReceipt struct {
	Status    KdsPushReceiptStatus
	Message   string
	ErrorCode string
}
