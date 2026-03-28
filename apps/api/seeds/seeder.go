package seeds

import (
	"fmt"
	"log/slog"

	"gorm.io/gorm"
)

// Seeder defines the interface every seeder must implement.
type Seeder interface {
	// Name returns a human-readable identifier for logging.
	Name() string
	// Seed inserts (or skips) data idempotently using the provided transaction.
	Seed(tx *gorm.DB) error
}

// RunAll executes every registered Seeder in order, each wrapped in its own
// database transaction. If any seeder fails the whole run stops and the error
// is returned.
func RunAll(db *gorm.DB, seeders []Seeder) error {
	for _, s := range seeders {
		slog.Info("seeder: running", slog.String("name", s.Name()))

		if err := db.Transaction(func(tx *gorm.DB) error {
			return s.Seed(tx)
		}); err != nil {
			return fmt.Errorf("seeder %q failed: %w", s.Name(), err)
		}

		slog.Info("seeder: done", slog.String("name", s.Name()))
	}
	return nil
}

// All returns the ordered list of all seeders.
// Independent tables are seeded first so that FK constraints are satisfied.
func All() []Seeder {
	return []Seeder{
		UserSeeder{},
		CategorySeeder{},
		MaterialSeeder{},
		SupplierSeeder{},
		WalletSeeder{},
		BudgetSeeder{},
		CouponSeeder{},
	}
}
