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

func newMockPaymentRepository(t *testing.T) (domain.PaymentRepository, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	return mysql.NewPaymentRepository(gormDB), mock
}

// D14: only paid payments for the requesting session are ever a history row.
func TestPaymentRepository_GetPaymentsBySessionId_FiltersToPaidForThatSession(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `payments` WHERE session_id = \\? AND status = \\? AND deleted_at IS NULL ORDER BY id DESC").
		WithArgs("session-1", "paid").
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	payments, err := repo.GetPaymentsBySessionId(context.Background(), "session-1", 0, 0)

	require.Nil(t, err)
	require.Empty(t, payments)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentRepository_GetPaymentsBySessionId_AppliesSkipAndLimit(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `payments` WHERE session_id = \\? AND status = \\? AND deleted_at IS NULL ORDER BY id DESC LIMIT \\? OFFSET \\?").
		WithArgs("session-1", "paid", 20, 5).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	_, err := repo.GetPaymentsBySessionId(context.Background(), "session-1", 5, 20)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentRepository_GetPaymentByTransactionId_FiltersToThatTransaction(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `payments` WHERE transaction_id = \\? AND deleted_at IS NULL ORDER BY `payments`.`id` LIMIT \\?").
		WithArgs(int64(42), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "session_id"}).AddRow(1, "session-1"))

	payment, err := repo.GetPaymentByTransactionId(context.Background(), 42)

	require.Nil(t, err)
	require.Equal(t, "session-1", payment.SessionId)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentRepository_GetPaymentsBySessionIdTotal_FiltersToPaidForThatSession(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)

	mock.ExpectQuery("SELECT count\\(\\*\\) FROM `payments` WHERE session_id = \\? AND status = \\? AND deleted_at IS NULL").
		WithArgs("session-1", "paid").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	total, err := repo.GetPaymentsBySessionIdTotal(context.Background(), "session-1")

	require.Nil(t, err)
	require.Equal(t, int64(0), total)
	require.NoError(t, mock.ExpectationsWereMet())
}
