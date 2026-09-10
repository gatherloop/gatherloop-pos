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

func TestCalculatePrice(t *testing.T) {
	tests := []struct {
		name          string
		tiers         []domain.PricingTier
		duration      time.Duration
		expectedPrice float32
		expectedError *domain.Error
	}{
		{
			name:          "row1: 120min exactly on tier boundary",
			tiers:         hourlyTiers,
			duration:      120 * time.Minute,
			expectedPrice: 30000,
		},
		{
			name:          "row3: 75min rounds up to 90min tier",
			tiers:         hourlyTiers,
			duration:      75 * time.Minute,
			expectedPrice: 20000,
		},
		{
			name:          "row4: 95min rounds up to 120min tier",
			tiers:         hourlyTiers,
			duration:      95 * time.Minute,
			expectedPrice: 30000,
		},
		{
			name:          "row5: 420min exactly on tier boundary",
			tiers:         hourlyTiers,
			duration:      420 * time.Minute,
			expectedPrice: 105000,
		},
		{
			name:          "row6: 540min exceeds all tiers, capped at last (120,000)",
			tiers:         hourlyTiers,
			duration:      540 * time.Minute,
			expectedPrice: 120000,
		},
		{
			name:          "row7: all day weekday single-tier variant",
			tiers:         allDayWeekdayTiers,
			duration:      300 * time.Minute,
			expectedPrice: 50000,
		},
		{
			name:          "row9: all day weekend single-tier variant",
			tiers:         allDayWeekendTiers,
			duration:      500 * time.Minute,
			expectedPrice: 60000,
		},
		{
			name:          "60min exactly on first tier",
			tiers:         hourlyTiers,
			duration:      60 * time.Minute,
			expectedPrice: 15000,
		},
		{
			name:          "481min above last tier, capped",
			tiers:         hourlyTiers,
			duration:      481 * time.Minute,
			expectedPrice: 120000,
		},
		{
			name:          "30 second duration rounds up to 1 minute, matches first tier",
			tiers:         hourlyTiers,
			duration:      30 * time.Second,
			expectedPrice: 15000,
		},
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
