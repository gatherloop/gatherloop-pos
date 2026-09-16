package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"context"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
	gormmysql "gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func newMockAvailabilityReservationRepository(t *testing.T) (domain.AvailabilityReservationRepository, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	return mysql.NewAvailabilityReservationRepository(gormDB), mock
}

// D6: the counter row is read SELECT ... FOR UPDATE inside the enclosing transaction so two
// concurrent checkouts serialize instead of both reading the same pre-decrement value.
func TestAvailabilityReservationRepository_LockVariantById_LocksForUpdate(t *testing.T) {
	repo, mock := newMockAvailabilityReservationRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `variants` WHERE id = \\? ORDER BY `variants`.`id` LIMIT \\? FOR UPDATE").
		WithArgs(int64(1), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "product_id", "available_quantity"}).AddRow(1, 10, 4))
	mock.ExpectQuery("SELECT \\* FROM `products` WHERE `products`.`id` = \\?").
		WithArgs(int64(10)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(10))

	variant, err := repo.LockVariantById(context.Background(), 1)

	require.Nil(t, err)
	require.Equal(t, int64(1), variant.Id)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAvailabilityReservationRepository_LockProductById_LocksForUpdate(t *testing.T) {
	repo, mock := newMockAvailabilityReservationRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `products` WHERE id = \\? ORDER BY `products`.`id` LIMIT \\? FOR UPDATE").
		WithArgs(int64(10), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "available_quantity"}).AddRow(10, 5))

	product, err := repo.LockProductById(context.Background(), 10)

	require.Nil(t, err)
	require.Equal(t, int64(10), product.Id)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAvailabilityReservationRepository_UpdateVariantAvailableQuantity(t *testing.T) {
	repo, mock := newMockAvailabilityReservationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `variants` SET `available_quantity`=\\? WHERE id = \\?").
		WithArgs(3, int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.UpdateVariantAvailableQuantity(context.Background(), 1, 3)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestAvailabilityReservationRepository_UpdateProductAvailableQuantity(t *testing.T) {
	repo, mock := newMockAvailabilityReservationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `products` SET `available_quantity`=\\? WHERE id = \\?").
		WithArgs(2, int64(10)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.UpdateProductAvailableQuantity(context.Background(), 10, 2)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}
