package mysql

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// PricingTiersJSON is a []byte-backed type that reads and writes the MySQL JSON
// column storing the pricing-tier snapshot on a rental row.
type PricingTiersJSON []byte

func (p PricingTiersJSON) Value() (driver.Value, error) {
	if len(p) == 0 {
		return "[]", nil
	}
	return string(p), nil
}

func (p *PricingTiersJSON) Scan(value interface{}) error {
	switch v := value.(type) {
	case []byte:
		*p = make([]byte, len(v))
		copy(*p, v)
	case string:
		*p = []byte(v)
	case nil:
		*p = []byte("[]")
	default:
		return fmt.Errorf("unsupported type for PricingTiersJSON: %T", value)
	}
	return nil
}

type Rental struct {
	Id           int64
	Code         string
	Name         string
	VariantId    int64
	Variant      Variant
	CheckinAt    time.Time
	CheckoutAt   *time.Time
	PricingTiers PricingTiersJSON
	CreatedAt    time.Time
	DeletedAt    *time.Time
}

// toPricingTierList unmarshals the JSON snapshot into a slice of PricingTier.
func (p PricingTiersJSON) toPricingTierList() []PricingTier {
	var tiers []PricingTier
	_ = json.Unmarshal(p, &tiers)
	return tiers
}

// pricingTierListToJSON marshals a slice of PricingTier to PricingTiersJSON.
func pricingTierListToJSON(tiers []PricingTier) PricingTiersJSON {
	b, _ := json.Marshal(tiers)
	return PricingTiersJSON(b)
}
