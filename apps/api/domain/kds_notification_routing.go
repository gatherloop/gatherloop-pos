package domain

import "time"

// StationLines groups a transaction's items under the station that must make them, in the fixed
// BAR-then-KITCHEN order (FR-2). NONE, empty and any unrecognised station are ignored, which is
// what makes the board-game exclusion the general rule rather than a special case.
func StationLines(transaction Transaction) []KdsStationLine {
	itemsByStation := map[KdsStation][]string{}

	for _, item := range transaction.TransactionItems {
		station := KdsStation(item.Variant.Product.Category.Station)
		if station != KdsStationBar && station != KdsStationKitchen {
			continue
		}
		itemsByStation[station] = append(itemsByStation[station], formatKdsItemAmount(item.Amount)+"× "+item.ProductName)
	}

	var lines []KdsStationLine
	for _, station := range kdsStationOrder {
		if items, ok := itemsByStation[station]; ok {
			lines = append(lines, KdsStationLine{Station: station, Items: items})
		}
	}
	return lines
}

// ShouldNotify is exactly len(StationLines(t)) > 0, which is what keeps the predicate and the
// message body from ever disagreeing (FR-2).
func ShouldNotify(transaction Transaction) bool {
	return len(StationLines(transaction)) > 0
}

// IsStaleForNotification implements D22's business-day comparison: the calendar day of
// created_at in the API host's local timezone, boundary at midnight, the same definition
// docs/prd-daily-transaction-number.md D6 already fixes for the transaction number.
func IsStaleForNotification(transaction Transaction, now time.Time) bool {
	const businessDayFormat = "2006-01-02"
	return transaction.CreatedAt.Format(businessDayFormat) != now.Format(businessDayFormat)
}
