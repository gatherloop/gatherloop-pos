package migrator

import (
	"fmt"
	"io/fs"
	"log/slog"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/mysql"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	gormMySQL "gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// Params holds the configuration for the migrator.
type Params struct {
	DbUsername   string
	DbPassword   string
	DbHost       string
	DbPort       string
	DbName       string
	MigrationsFS fs.FS
}

// Run applies all pending UP migrations from the provided filesystem
// and logs the resulting schema version.
func Run(params Params) error {
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local&multiStatements=true",
		params.DbUsername, params.DbPassword,
		params.DbHost, params.DbPort,
		params.DbName,
	)

	// Open via GORM so we can extract the underlying *sql.DB.
	gormDB, err := gorm.Open(gormMySQL.Open(dsn))
	if err != nil {
		return fmt.Errorf("migrator: open db: %w", err)
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		return fmt.Errorf("migrator: get sql.DB: %w", err)
	}
	defer sqlDB.Close()

	// Build the iofs source from the provided filesystem.
	srcDriver, err := iofs.New(params.MigrationsFS, ".")
	if err != nil {
		return fmt.Errorf("migrator: create iofs source: %w", err)
	}

	// Build the MySQL driver for golang-migrate.
	dbDriver, err := mysql.WithInstance(sqlDB, &mysql.Config{})
	if err != nil {
		return fmt.Errorf("migrator: create db driver: %w", err)
	}

	m, err := migrate.NewWithInstance("iofs", srcDriver, params.DbName, dbDriver)
	if err != nil {
		return fmt.Errorf("migrator: create migrate instance: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("migrator: run up: %w", err)
	}

	version, dirty, vErr := m.Version()
	if vErr != nil && vErr != migrate.ErrNilVersion {
		return fmt.Errorf("migrator: get version: %w", vErr)
	}

	slog.Info("migrations applied",
		slog.Uint64("version", uint64(version)),
		slog.Bool("dirty", dirty),
	)

	return nil
}
