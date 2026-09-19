package domain

import "time"

// StationLines groups a transaction's items under the station that must make them, in the fixed
// BAR-then-KITCHEN order (FR-2). NONE, empty and any unrecognised station are ignored, which is
// what makes the board-game exclusion the general rule rather than a special case.
// Items are further grouped by product name, merging different variants of the same product
// (e.g. iced/hot Coffee Latte) into a single summed line, since the variant name isn't shown.
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
