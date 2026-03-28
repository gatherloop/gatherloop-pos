package migrator_test

import (
	"apps/api/migrations"
	"apps/api/pkg/migrator"
	"database/sql"
	"fmt"
	"testing"

	_ "github.com/go-sql-driver/mysql"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	migrate "github.com/golang-migrate/migrate/v4"
	migrateMySQL "github.com/golang-migrate/migrate/v4/database/mysql"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

const (
	testDBUser = "root"
	testDBPass = ""
	testDBHost = "127.0.0.1"
	testDBPort = "3306"
	testDBName = "gatherloop_pos_test"
)

// expectedTables lists all tables created by the initial migration.
var expectedTables = []string{
	"users",
	"categories",
	"materials",
	"suppliers",
	"wallets",
	"budgets",
	"coupons",
	"products",
	"options",
	"option_values",
	"variants",
	"variant_materials",
	"variant_values",
	"wallet_transfers",
	"transactions",
	"transaction_items",
	"transaction_coupons",
	"expenses",
	"expense_items",
	"calculations",
	"calculation_items",
	"rentals",
}

func TestMigrator_RunUp(t *testing.T) {
	requireMySQL(t)
	// Ensure we start from a clean state.
	dropAllTables(t)

	err := migrator.Run(migrator.Params{
		DbUsername:   testDBUser,
		DbPassword:   testDBPass,
		DbHost:       testDBHost,
		DbPort:       testDBPort,
		DbName:       testDBName,
		MigrationsFS: migrations.FS,
	})
	require.NoError(t, err, "migrator.Run should not return an error")

	db := openDB(t)
	defer db.Close()

	for _, table := range expectedTables {
		exists := tableExists(t, db, table)
		assert.True(t, exists, "table %q should exist after migrate up", table)
	}
}

func TestMigrator_RunUp_Idempotent(t *testing.T) {
	requireMySQL(t)
	// Running up a second time should be a no-op (ErrNoChange is swallowed).
	err := migrator.Run(migrator.Params{
		DbUsername:   testDBUser,
		DbPassword:   testDBPass,
		DbHost:       testDBHost,
		DbPort:       testDBPort,
		DbName:       testDBName,
		MigrationsFS: migrations.FS,
	})
	require.NoError(t, err, "second migrator.Run should not return an error")
}

func TestMigration_Down(t *testing.T) {
	requireMySQL(t)
	db := openDB(t)
	defer db.Close()

	srcDriver, err := iofs.New(migrations.FS, ".")
	require.NoError(t, err)

	dbDriver, err := migrateMySQL.WithInstance(db, &migrateMySQL.Config{})
	require.NoError(t, err)

	m, err := migrate.NewWithInstance("iofs", srcDriver, testDBName, dbDriver)
	require.NoError(t, err)

	require.NoError(t, m.Down(), "migrate down should succeed")

	for _, table := range expectedTables {
		exists := tableExists(t, db, table)
		assert.False(t, exists, "table %q should not exist after migrate down", table)
	}
}

// helpers

// requireMySQL skips the test when a MySQL instance is not reachable.
// This prevents integration tests from failing in environments without a DB.
func requireMySQL(t *testing.T) {
	t.Helper()
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		testDBUser, testDBPass, testDBHost, testDBPort, testDBName)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		t.Skipf("skipping: cannot open MySQL DSN: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		t.Skipf("skipping: MySQL not reachable at %s:%s — %v", testDBHost, testDBPort, err)
	}
}

func openDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local&multiStatements=true",
		testDBUser, testDBPass, testDBHost, testDBPort, testDBName)
	db, err := sql.Open("mysql", dsn)
	require.NoError(t, err)
	require.NoError(t, db.Ping())
	return db
}

func tableExists(t *testing.T, db *sql.DB, table string) bool {
	t.Helper()
	var name string
	err := db.QueryRow(
		"SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
		testDBName, table,
	).Scan(&name)
	if err == sql.ErrNoRows {
		return false
	}
	require.NoError(t, err)
	return name == table
}

func dropAllTables(t *testing.T) {
	t.Helper()
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local&multiStatements=true",
		testDBUser, testDBPass, testDBHost, testDBPort, testDBName)
	db, err := sql.Open("mysql", dsn)
	require.NoError(t, err)
	defer db.Close()

	// Disable FK checks so we can drop in any order.
	_, err = db.Exec("SET FOREIGN_KEY_CHECKS = 0")
	require.NoError(t, err)

	rows, err := db.Query(
		"SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
		testDBName,
	)
	require.NoError(t, err)
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		require.NoError(t, rows.Scan(&name))
		tables = append(tables, name)
	}
	require.NoError(t, rows.Err())

	for _, tbl := range tables {
		_, err = db.Exec(fmt.Sprintf("DROP TABLE IF EXISTS `%s`", tbl))
		require.NoError(t, err, "drop table %s", tbl)
	}

	_, err = db.Exec("SET FOREIGN_KEY_CHECKS = 1")
	require.NoError(t, err)
}
