package domain_test

import (
	"apps/api/domain"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func kdsItem(station string, amount float32, productName string) domain.TransactionItem {
	return domain.TransactionItem{
		Amount:      amount,
		ProductName: productName,
		Variant: domain.Variant{
			Product: domain.Product{
				Category: domain.Category{Station: station},
			},
		},
	}
}

// FR-2's table: every row asserts ShouldNotify(t) == (len(StationLines(t)) > 0), the property
// that keeps the predicate and the message body from ever disagreeing.
func TestKdsNotificationRouting_FR2Table(t *testing.T) {
	tests := []struct {
		name             string
		items            []domain.TransactionItem
		expectedStations []domain.KdsStation
		expectedNotify   bool
	}{
		{
			name:             "2 coffees",
			items:            []domain.TransactionItem{kdsItem("BAR", 2, "Kopi Susu Gula Aren")},
			expectedStations: []domain.KdsStation{domain.KdsStationBar},
			expectedNotify:   true,
		},
		{
			name: "1 coffee + 1 sandwich",
			items: []domain.TransactionItem{
				kdsItem("BAR", 1, "Kopi Susu Gula Aren"),
				kdsItem("KITCHEN", 1, "Sandwich"),
			},
			expectedStations: []domain.KdsStation{domain.KdsStationBar, domain.KdsStationKitchen},
			expectedNotify:   true,
		},
		{
			name:             "1 board-game ticket",
			items:            []domain.TransactionItem{kdsItem("NONE", 1, "Board Game Ticket")},
			expectedStations: []domain.KdsStation{},
			expectedNotify:   false,
		},
		{
			name: "1 board-game ticket + 1 coffee",
			items: []domain.TransactionItem{
				kdsItem("NONE", 1, "Board Game Ticket"),
				kdsItem("BAR", 1, "Kopi Susu Gula Aren"),
			},
			expectedStations: []domain.KdsStation{domain.KdsStationBar},
			expectedNotify:   true,
		},
		{
			name:             "an item whose category station is empty",
			items:            []domain.TransactionItem{kdsItem("", 1, "Untracked Item")},
			expectedStations: []domain.KdsStation{},
			expectedNotify:   false,
		},
		{
			name:             "no items at all (a rental checkout)",
			items:            nil,
			expectedStations: []domain.KdsStation{},
			expectedNotify:   false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			transaction := domain.Transaction{TransactionItems: test.items}

			lines := domain.StationLines(transaction)
			stations := make([]domain.KdsStation, len(lines))
			for i, line := range lines {
				stations[i] = line.Station
			}

			assert.Equal(t, test.expectedStations, stations)
			assert.Equal(t, test.expectedNotify, domain.ShouldNotify(transaction))
			assert.Equal(t, len(lines) > 0, domain.ShouldNotify(transaction))
		})
	}
}

func TestIsStaleForNotification(t *testing.T) {
	now := time.Date(2026, 3, 15, 10, 0, 0, 0, time.Local)

	tests := []struct {
		name        string
		createdAt   time.Time
		expectStale bool
	}{
		{
			name:        "same day",
			createdAt:   time.Date(2026, 3, 15, 8, 0, 0, 0, time.Local),
			expectStale: false,
		},
		{
			name:        "previous day",
			createdAt:   time.Date(2026, 3, 14, 23, 0, 0, 0, time.Local),
			expectStale: true,
		},
		{
			name:        "created 23:59, notified 00:01 the next day",
			createdAt:   time.Date(2026, 3, 14, 23, 59, 0, 0, time.Local),
			expectStale: true,
		},
		{
			name:        "created 00:01, notified the same day",
			createdAt:   time.Date(2026, 3, 15, 0, 1, 0, 0, time.Local),
			expectStale: false,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			transaction := domain.Transaction{CreatedAt: test.createdAt}
			assert.Equal(t, test.expectStale, domain.IsStaleForNotification(transaction, now))
		})
	}
}
