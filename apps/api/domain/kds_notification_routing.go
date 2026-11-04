package domain

import "time"

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
