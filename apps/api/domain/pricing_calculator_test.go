package domain_test

import (
	"apps/api/domain"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// hourlyTiers is the seeded 15-row Hourly tier set used in TRD §FR-5.
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

func TestCalculatePrice(t *testing.T) {
	tests := []struct {
		name          string
		tiers         []domain.PricingTier
		duration      time.Duration
		expectedPrice float32
		expectedError *domain.Error
	}{
		// TRD §FR-5 row 1: Hourly, 2h 0m, 1 person → 30,000
		{
			name:          "row1: 120min exactly on tier boundary",
			tiers:         hourlyTiers,
			duration:      120 * time.Minute,
			expectedPrice: 30000,
		},
		// TRD §FR-5 row 3: Hourly, 1h 15m → 20,000 (75min, first tier ≥75 is 90)
		{
			name:          "row3: 75min rounds up to 90min tier",
			tiers:         hourlyTiers,
			duration:      75 * time.Minute,
			expectedPrice: 20000,
		},
		// TRD §FR-5 row 4: Hourly, 1h 35m → 30,000 (95min, first tier ≥95 is 120)
		{
			name:          "row4: 95min rounds up to 120min tier",
			tiers:         hourlyTiers,
			duration:      95 * time.Minute,
			expectedPrice: 30000,
		},
		// TRD §FR-5 row 5: Hourly, 7h 0m → 105,000 (420min exactly on tier)
		{
			name:          "row5: 420min exactly on tier boundary",
			tiers:         hourlyTiers,
			duration:      420 * time.Minute,
			expectedPrice: 105000,
		},
		// TRD §FR-5 row 6: Hourly, 9h 0m → 120,000 (540min > 480, capped at last tier)
		{
			name:          "row6: 540min exceeds all tiers, capped at last (120,000)",
			tiers:         hourlyTiers,
			duration:      540 * time.Minute,
			expectedPrice: 120000,
		},
		// TRD §FR-5 row 7: All Day Weekday, any duration → 50,000
		{
			name:          "row7: all day weekday single-tier variant",
			tiers:         allDayWeekdayTiers,
			duration:      300 * time.Minute,
			expectedPrice: 50000,
		},
		// TRD §FR-5 row 9: All Day Weekend → 60,000 per person
		{
			name:          "row9: all day weekend single-tier variant",
			tiers:         allDayWeekendTiers,
			duration:      500 * time.Minute,
			expectedPrice: 60000,
		},
		// Duration exactly equal to first tier boundary (60min)
		{
			name:          "60min exactly on first tier",
			tiers:         hourlyTiers,
			duration:      60 * time.Minute,
			expectedPrice: 15000,
		},
		// Duration just above the last tier — still capped
		{
			name:          "481min above last tier, capped",
			tiers:         hourlyTiers,
			duration:      481 * time.Minute,
			expectedPrice: 120000,
		},
		// Sub-minute duration still rounds up to 1 minute, matches first tier
		{
			name:          "30 second duration rounds up to 1 minute, matches first tier",
			tiers:         hourlyTiers,
			duration:      30 * time.Second,
			expectedPrice: 15000,
		},
		// Empty tier list → error
		{
			name:          "empty tier list returns error",
			tiers:         []domain.PricingTier{},
			duration:      60 * time.Minute,
			expectedError: &domain.Error{Type: domain.BadRequest},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := domain.CalculatePrice(tt.tiers, tt.duration)

			if tt.expectedError != nil {
				assert.NotNil(t, err)
				assert.Equal(t, tt.expectedError.Type, err.Type)
			} else {
				assert.Nil(t, err)
				assert.Equal(t, tt.expectedPrice, result.Price)
			}
		})
	}
}
