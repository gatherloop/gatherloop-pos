package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"context"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	gormmysql "gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func newMockAvailabilityRepository(t *testing.T) (domain.AvailabilityRepository, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	return mysql.NewAvailabilityRepository(gormDB), mock
}

// FR-8: every availability change is written to the ledger in the same DB transaction.
func TestCreateAvailabilityMovement_InsertsExpectedColumns(t *testing.T) {
	db := newDryRunDb(t)

	delta := -2
	resulting := 4
	payload := mysql.ToAvailabilityMovementDB(domain.AvailabilityMovement{
		VariantId:         int64Ptr(1),
		Delta:             &delta,
		ResultingQuantity: &resulting,
		Reason:            domain.AvailabilityMovementReasonSale,
	})

	stmt := db.Table("availability_movements").Create(&payload).Statement

	assert.Contains(t, stmt.SQL.String(), "availability_movements")
	assert.Contains(t, stmt.SQL.String(), "`variant_id`")
	assert.Contains(t, stmt.SQL.String(), "`delta`")
	assert.Contains(t, stmt.SQL.String(), "`resulting_quantity`")
	assert.Contains(t, stmt.SQL.String(), "`reason`")
	assert.Contains(t, stmt.Vars, "sale")
	assert.Contains(t, stmt.Vars, &delta)
	assert.Contains(t, stmt.Vars, &resulting)
}

func TestAvailabilityRepository_GetAvailabilityMovementList_FiltersByVariant(t *testing.T) {
	repo, mock := newMockAvailabilityRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `availability_movements` WHERE variant_id = \\? ORDER BY created_at DESC, id DESC LIMIT \\?").
		WithArgs(int64(1), 10).
		WillReturnRows(sqlmock.NewRows([]string{"id", "variant_id", "reason"}).AddRow(1, 1, "sale"))

	movements, err := repo.GetAvailabilityMovementList(context.Background(), domain.AvailabilityMovementLevelVariant, 1, 0, 10)

	require.Nil(t, err)
	require.Len(t, movements, 1)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAvailabilityRepository_GetAvailabilityMovementList_FiltersByProduct(t *testing.T) {
	repo, mock := newMockAvailabilityRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `availability_movements` WHERE product_id = \\? ORDER BY created_at DESC, id DESC").
		WithArgs(int64(10)).
		WillReturnRows(sqlmock.NewRows([]string{"id", "product_id", "reason"}).AddRow(1, 10, "manual_set"))

	movements, err := repo.GetAvailabilityMovementList(context.Background(), domain.AvailabilityMovementLevelProduct, 10, 0, 0)

	require.Nil(t, err)
	require.Len(t, movements, 1)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAvailabilityRepository_GetAvailabilityMovementListTotal(t *testing.T) {
	repo, mock := newMockAvailabilityRepository(t)

	mock.ExpectQuery("SELECT count\\(\\*\\) FROM `availability_movements` WHERE variant_id = \\?").
		WithArgs(int64(1)).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))

	total, err := repo.GetAvailabilityMovementListTotal(context.Background(), domain.AvailabilityMovementLevelVariant, 1)

	require.Nil(t, err)
	require.Equal(t, int64(3), total)
	require.NoError(t, mock.ExpectationsWereMet())
}

func int64Ptr(v int64) *int64 { return &v }
