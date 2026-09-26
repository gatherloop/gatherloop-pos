package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"context"
	"testing"
	"time"

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

// FR-14 (D19): paid payments of either method, plus pending payments of either method, for the requesting session.
func TestPaymentRepository_GetPaymentsBySessionId_FiltersToPaidOrPendingForThatSession(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `payments` WHERE session_id = \\? AND deleted_at IS NULL AND status IN \\(\\?, \\?\\) ORDER BY id DESC").
		WithArgs("session-1", "paid", "pending").
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	payments, err := repo.GetPaymentsBySessionId(context.Background(), "session-1", 0, 0)

	require.Nil(t, err)
	require.Empty(t, payments)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentRepository_GetPaymentsBySessionId_AppliesSkipAndLimit(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `payments` WHERE session_id = \\? AND deleted_at IS NULL AND status IN \\(\\?, \\?\\) ORDER BY id DESC LIMIT \\? OFFSET \\?").
		WithArgs("session-1", "paid", "pending", 20, 5).
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

// D6: cancel, confirm, expire and settle all read the payment row with FOR UPDATE so they
// serialize on it instead of racing each other to a terminal state.
func TestPaymentRepository_GetPaymentByPartnerReferenceNoForUpdate_LocksForUpdate(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `payments` WHERE partner_reference_no = \\? AND deleted_at IS NULL ORDER BY `payments`.`id` LIMIT \\? FOR UPDATE").
		WithArgs("ORD0123456789ABC", 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "session_id"}).AddRow(1, "session-1"))

	payment, err := repo.GetPaymentByPartnerReferenceNoForUpdate(context.Background(), "ORD0123456789ABC")

	require.Nil(t, err)
	require.Equal(t, "session-1", payment.SessionId)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentRepository_GetPaymentByTransactionIdForUpdate_LocksForUpdate(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `payments` WHERE transaction_id = \\? AND deleted_at IS NULL ORDER BY `payments`.`id` LIMIT \\? FOR UPDATE").
		WithArgs(int64(42), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "session_id"}).AddRow(1, "session-1"))

	payment, err := repo.GetPaymentByTransactionIdForUpdate(context.Background(), 42)

	require.Nil(t, err)
	require.Equal(t, "session-1", payment.SessionId)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentRepository_GetPaymentsBySessionIdTotal_FiltersToPaidOrPendingForThatSession(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)

	mock.ExpectQuery("SELECT count\\(\\*\\) FROM `payments` WHERE session_id = \\? AND deleted_at IS NULL AND status IN \\(\\?, \\?\\)").
		WithArgs("session-1", "paid", "pending").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	total, err := repo.GetPaymentsBySessionIdTotal(context.Background(), "session-1")

	require.Nil(t, err)
	require.Equal(t, int64(0), total)
	require.NoError(t, mock.ExpectationsWereMet())
}

// FR-4: the sweeper claims pending, non-deleted payments past their expired_at, oldest first.
func TestPaymentRepository_GetExpirablePayments_FiltersToPendingPastExpiry(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)

	mock.ExpectQuery("SELECT \\* FROM `payments` WHERE status = \\? AND deleted_at IS NULL AND expired_at < \\? ORDER BY id ASC LIMIT \\?").
		WithArgs("pending", now, 50).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	payments, err := repo.GetExpirablePayments(context.Background(), now, 50)

	require.Nil(t, err)
	require.Empty(t, payments)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentRepository_GetExpirablePayments_NoLimitFetchesEverything(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)
	now := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)

	mock.ExpectQuery("SELECT \\* FROM `payments` WHERE status = \\? AND deleted_at IS NULL AND expired_at < \\? ORDER BY id ASC").
		WithArgs("pending", now).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	_, err := repo.GetExpirablePayments(context.Background(), now, 0)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// FR-4/D2: approving a COD payment writes verification_status and verified_at through the same
// UpdatePaymentById every other payment transition uses.
func TestPaymentRepository_UpdatePaymentById_PersistsVerificationStatusAndVerifiedAt(t *testing.T) {
	repo, mock := newMockPaymentRepository(t)
	verifiedAt := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)
	verificationStatus := domain.PaymentVerificationStatusApproved

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `payments` SET .*`verification_status`=\\?.*`verified_at`=\\?.* WHERE id = \\?").
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()
	mock.ExpectQuery("SELECT \\* FROM `payments` WHERE id = \\? AND deleted_at IS NULL ORDER BY `payments`.`id` LIMIT \\?").
		WithArgs(int64(1), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(int64(1)))

	_, err := repo.UpdatePaymentById(context.Background(), domain.Payment{
		Id:                 1,
		Method:             domain.PaymentMethodCod,
		Status:             domain.PaymentStatePending,
		VerificationStatus: &verificationStatus,
		VerifiedAt:         &verifiedAt,
	}, 1)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}
