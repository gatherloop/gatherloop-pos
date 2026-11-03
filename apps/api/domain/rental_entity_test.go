package domain_test

import (
	"apps/api/domain"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

var hourlyTiers = []domain.PricingTier{
	{UpToMinutes: 60, Price: 15000},
	{UpToMinutes: 90, Price: 20000},
	{UpToMinutes: 120, Price: 30000},
	{UpToMinutes: 150, Price: 35000},
	{UpToMinutes: 180, Price: 45000},
	{UpToMinutes: 210, Price: 50000},
	{UpToMinutes: 240, Price: 60000},
	{UpToMinutes: 270, Price: 65000},
	{UpToMinutes: 300, Price: 75000},
	{UpToMinutes: 330, Price: 80000},
	{UpToMinutes: 360, Price: 90000},
	{UpToMinutes: 390, Price: 95000},
	{UpToMinutes: 420, Price: 105000},
	{UpToMinutes: 450, Price: 110000},
	{UpToMinutes: 480, Price: 120000},
}

var allDayWeekdayTiers = []domain.PricingTier{{UpToMinutes: 840, Price: 50000}}
var allDayWeekendTiers = []domain.PricingTier{{UpToMinutes: 840, Price: 60000}}

func TestRentalTotal(t *testing.T) {
	checkinAt := time.Date(2025, 1, 1, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name          string
		tiers         []domain.PricingTier
		duration      time.Duration
		expectedTotal float32
	}{
		{
			name:          "row1: 120min exactly on tier boundary",
			tiers:         hourlyTiers,
			duration:      120 * time.Minute,
			expectedTotal: 30000,
		},
		{
			name:          "row3: 75min rounds up to 90min tier",
			tiers:         hourlyTiers,
			duration:      75 * time.Minute,
			expectedTotal: 20000,
		},
		{
			name:          "row4: 95min rounds up to 120min tier",
			tiers:         hourlyTiers,
			duration:      95 * time.Minute,
			expectedTotal: 30000,
		},
		{
			name:          "row5: 420min exactly on tier boundary",
			tiers:         hourlyTiers,
			duration:      420 * time.Minute,
			expectedTotal: 105000,
		},
		{
			name:          "row6: 540min exceeds all tiers, capped at last (120,000)",
			tiers:         hourlyTiers,
			duration:      540 * time.Minute,
			expectedTotal: 120000,
		},
		{
			name:          "row7: all day weekday single-tier variant",
			tiers:         allDayWeekdayTiers,
			duration:      300 * time.Minute,
			expectedTotal: 50000,
		},
		{
			name:          "row9: all day weekend single-tier variant",
			tiers:         allDayWeekendTiers,
			duration:      500 * time.Minute,
			expectedTotal: 60000,
		},
		{
			name:          "60min exactly on first tier",
			tiers:         hourlyTiers,
			duration:      60 * time.Minute,
			expectedTotal: 15000,
		},
		{
			name:          "481min above last tier, capped",
			tiers:         hourlyTiers,
			duration:      481 * time.Minute,
			expectedTotal: 120000,
		},
		{
			name:          "30 second duration rounds up to 1 minute, matches first tier",
			tiers:         hourlyTiers,
			duration:      30 * time.Second,
			expectedTotal: 15000,
		},
		{
			name:          "empty tier list returns zero",
			tiers:         []domain.PricingTier{},
			duration:      60 * time.Minute,
			expectedTotal: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			checkoutAt := checkinAt.Add(tt.duration)
			rental := domain.Rental{
				PricingTiers: tt.tiers,
				CheckinAt:    checkinAt,
				CheckoutAt:   &checkoutAt,
			}

			assert.Equal(t, tt.expectedTotal, rental.Total())
		})
	}

	t.Run("not yet checked out uses time elapsed since checkin", func(t *testing.T) {
		rental := domain.Rental{
			PricingTiers: hourlyTiers,
			CheckinAt:    time.Now().Add(-75 * time.Minute),
		}

		assert.Equal(t, float32(20000), rental.Total())
	})
}
