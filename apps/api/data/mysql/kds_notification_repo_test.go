package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"context"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	gormmysql "gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func newMockKdsNotificationRepository(t *testing.T) (domain.KdsNotificationRepository, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	return mysql.NewKdsNotificationRepository(gormDB), mock
}

func kdsBarTransaction(id int64, createdAt time.Time) domain.Transaction {
	return domain.Transaction{
		Id:        id,
		CreatedAt: createdAt,
		TransactionItems: []domain.TransactionItem{
			{
				Amount:      1,
				ProductName: "Americano",
				Variant: domain.Variant{
					Product: domain.Product{Category: domain.Category{Station: "BAR"}},
				},
			},
		},
	}
}

// FR-3/D4/D8: the insert is a self-referential no-op on conflict, which is what makes a duplicate
// enqueue for the same (transaction, kind) leave exactly one row rather than erroring or writing
// a second.
func TestEnqueueForTransaction_DuplicateEnqueueIsIdempotentByConstruction(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `kds_notifications` \\(`transaction_id`,`kind`,`status`,`attempt_count`,`detail`,`created_at`,`sent_at`\\) VALUES \\(\\?,\\?,\\?,\\?,\\?,\\?,\\?\\) ON DUPLICATE KEY UPDATE `id`=id").
		WithArgs(int64(1), "order_paid", "pending", 0, nil, sqlmock.AnyArg(), nil).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.EnqueueForTransaction(context.Background(), kdsBarTransaction(1, time.Now()), domain.KdsNotificationKindOrderPaid)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D8: the unique key is (transaction_id, kind), so two different kinds for the same transaction
// are two rows, not a conflict — this is precisely what widening the key makes possible.
func TestEnqueueForTransaction_TwoKindsForTheSameTransactionBothInsert(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)
	transaction := kdsBarTransaction(1, time.Now())

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `kds_notifications` \\(`transaction_id`,`kind`,`status`,`attempt_count`,`detail`,`created_at`,`sent_at`\\) VALUES \\(\\?,\\?,\\?,\\?,\\?,\\?,\\?\\) ON DUPLICATE KEY UPDATE `id`=id").
		WithArgs(int64(1), "cash_pending", "pending", 0, nil, sqlmock.AnyArg(), nil).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.EnqueueForTransaction(context.Background(), transaction, domain.KdsNotificationKindCashPending)
	require.Nil(t, err)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `kds_notifications` \\(`transaction_id`,`kind`,`status`,`attempt_count`,`detail`,`created_at`,`sent_at`\\) VALUES \\(\\?,\\?,\\?,\\?,\\?,\\?,\\?\\) ON DUPLICATE KEY UPDATE `id`=id").
		WithArgs(int64(1), "order_paid", "pending", 0, nil, sqlmock.AnyArg(), nil).
		WillReturnResult(sqlmock.NewResult(2, 1))
	mock.ExpectCommit()

	err = repo.EnqueueForTransaction(context.Background(), transaction, domain.KdsNotificationKindOrderPaid)
	require.Nil(t, err)

	require.NoError(t, mock.ExpectationsWereMet())
}

func TestEnqueueForTransaction_SkipsEntirelyWhenShouldNotifyIsFalse(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	transaction := domain.Transaction{
		Id: 1,
		TransactionItems: []domain.TransactionItem{
			{
				Amount:      1,
				ProductName: "Board Game Ticket",
				Variant:     domain.Variant{Product: domain.Product{Category: domain.Category{Station: "NONE"}}},
			},
		},
	}

	err := repo.EnqueueForTransaction(context.Background(), transaction, domain.KdsNotificationKindOrderPaid)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D9: cash_pending exists to move someone to the till, not to make a drink, so the station rule
// that gates order_paid does not gate it — a board-game-only cash order still needs collecting.
func TestEnqueueForTransaction_CashPendingBypassesTheStationRule(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	transaction := domain.Transaction{
		Id: 1,
		TransactionItems: []domain.TransactionItem{
			{
				Amount:      1,
				ProductName: "Board Game Ticket",
				Variant:     domain.Variant{Product: domain.Product{Category: domain.Category{Station: "NONE"}}},
			},
		},
	}

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `kds_notifications` \\(`transaction_id`,`kind`,`status`,`attempt_count`,`detail`,`created_at`,`sent_at`\\) VALUES \\(\\?,\\?,\\?,\\?,\\?,\\?,\\?\\) ON DUPLICATE KEY UPDATE `id`=id").
		WithArgs(int64(1), "cash_pending", "pending", 0, nil, sqlmock.AnyArg(), nil).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.EnqueueForTransaction(context.Background(), transaction, domain.KdsNotificationKindCashPending)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D9: a cash_pending row is written the instant the transaction is created, so the business-day
// staleness check can never fire for it — it stays a pure order_paid concern.
func TestEnqueueForTransaction_CashPendingBypassesTheStaleCheck(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `kds_notifications` \\(`transaction_id`,`kind`,`status`,`attempt_count`,`detail`,`created_at`,`sent_at`\\) VALUES \\(\\?,\\?,\\?,\\?,\\?,\\?,\\?\\) ON DUPLICATE KEY UPDATE `id`=id").
		WithArgs(int64(1), "cash_pending", "pending", 0, nil, sqlmock.AnyArg(), nil).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.EnqueueForTransaction(context.Background(), kdsBarTransaction(1, time.Now().AddDate(0, 0, -1)), domain.KdsNotificationKindCashPending)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// FR-9/D15: cod_verification asks a barista to look at a photo, not make a drink, so a board-game-
// only COD order still needs a decision.
func TestEnqueueForTransaction_CodVerificationBypassesTheStationRule(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	transaction := domain.Transaction{
		Id: 1,
		TransactionItems: []domain.TransactionItem{
			{
				Amount:      1,
				ProductName: "Board Game Ticket",
				Variant:     domain.Variant{Product: domain.Product{Category: domain.Category{Station: "NONE"}}},
			},
		},
	}

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `kds_notifications` \\(`transaction_id`,`kind`,`status`,`attempt_count`,`detail`,`created_at`,`sent_at`\\) VALUES \\(\\?,\\?,\\?,\\?,\\?,\\?,\\?\\) ON DUPLICATE KEY UPDATE `id`=id").
		WithArgs(int64(1), "cod_verification", "pending", 0, nil, sqlmock.AnyArg(), nil).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.EnqueueForTransaction(context.Background(), transaction, domain.KdsNotificationKindCodVerification)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// FR-9/D15: a cod_verification row is written the instant the transaction is created, so the
// business-day staleness check can never fire for it either.
func TestEnqueueForTransaction_CodVerificationBypassesTheStaleCheck(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `kds_notifications` \\(`transaction_id`,`kind`,`status`,`attempt_count`,`detail`,`created_at`,`sent_at`\\) VALUES \\(\\?,\\?,\\?,\\?,\\?,\\?,\\?\\) ON DUPLICATE KEY UPDATE `id`=id").
		WithArgs(int64(1), "cod_verification", "pending", 0, nil, sqlmock.AnyArg(), nil).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.EnqueueForTransaction(context.Background(), kdsBarTransaction(1, time.Now().AddDate(0, 0, -1)), domain.KdsNotificationKindCodVerification)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D22: a transaction paid on a later business day is enqueued as 'skipped' rather than left
// unwritten, so the outbox still answers what happened to this order's notification.
func TestEnqueueForTransaction_WritesSkippedStatusForAStaleTransaction(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `kds_notifications`").
		WithArgs(int64(1), "order_paid", "skipped", 0, sqlmock.AnyArg(), sqlmock.AnyArg(), nil).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.EnqueueForTransaction(context.Background(), kdsBarTransaction(1, time.Now().AddDate(0, 0, -1)), domain.KdsNotificationKindOrderPaid)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// FR-7: HasNotificationForTransaction is what lets a cash cancel decide whether there is a
// cash_pending row to retract before enqueueing cash_cancelled.
func TestHasNotificationForTransaction_TrueWhenARowExists(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectQuery("SELECT count\\(\\*\\) FROM `kds_notifications` WHERE transaction_id = \\? AND kind = \\?").
		WithArgs(int64(1), "cash_pending").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	has, err := repo.HasNotificationForTransaction(context.Background(), 1, domain.KdsNotificationKindCashPending)

	require.Nil(t, err)
	assert.True(t, has)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestHasNotificationForTransaction_FalseWhenNoRowExists(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectQuery("SELECT count\\(\\*\\) FROM `kds_notifications` WHERE transaction_id = \\? AND kind = \\?").
		WithArgs(int64(1), "cash_pending").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	has, err := repo.HasNotificationForTransaction(context.Background(), 1, domain.KdsNotificationKindCashPending)

	require.Nil(t, err)
	assert.False(t, has)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestClaimPendingKdsNotifications_FiltersByStatusAndAttemptCount(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `kds_notifications` WHERE status = \\? AND attempt_count < \\? ORDER BY created_at ASC LIMIT \\?").
		WithArgs("pending", domain.KdsNotificationMaxAttempts, 50).
		WillReturnRows(sqlmock.NewRows([]string{"id", "transaction_id", "status", "attempt_count"}).AddRow(1, 10, "pending", 0))

	notifications, err := repo.ClaimPendingKdsNotifications(context.Background(), 50)

	require.Nil(t, err)
	require.Len(t, notifications, 1)
	assert.Equal(t, domain.KdsNotificationStatusPending, notifications[0].Status)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestMarkKdsNotificationSent_SetsStatusAndSentAt(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `kds_notifications` SET `detail`=\\?,`sent_at`=\\?,`status`=\\? WHERE id = \\?").
		WithArgs("test detail", sqlmock.AnyArg(), "sent", int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.MarkKdsNotificationSent(context.Background(), 1, "test detail")

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestMarkKdsNotificationFailed_IncrementsAttemptCountAndStaysPendingBelowThreshold(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `kds_notifications` WHERE id = \\? ORDER BY `kds_notifications`.`id` LIMIT \\?").
		WithArgs(int64(1), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "attempt_count"}).AddRow(1, 3))

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `kds_notifications` SET `attempt_count`=\\?,`detail`=\\?,`status`=\\? WHERE id = \\?").
		WithArgs(4, "expo timeout", "pending", int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.MarkKdsNotificationFailed(context.Background(), 1, "expo timeout")

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestMarkKdsNotificationFailed_BecomesFailedAtMaxAttempts(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `kds_notifications` WHERE id = \\? ORDER BY `kds_notifications`.`id` LIMIT \\?").
		WithArgs(int64(1), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "attempt_count"}).AddRow(1, domain.KdsNotificationMaxAttempts-1))

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `kds_notifications` SET `attempt_count`=\\?,`detail`=\\?,`status`=\\? WHERE id = \\?").
		WithArgs(domain.KdsNotificationMaxAttempts, "expo timeout", "failed", int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.MarkKdsNotificationFailed(context.Background(), 1, "expo timeout")

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestMarkKdsNotificationSkipped_SetsStatusAndDetail(t *testing.T) {
	repo, mock := newMockKdsNotificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `kds_notifications` SET `detail`=\\?,`status`=\\? WHERE id = \\?").
		WithArgs("no registered devices", "skipped", int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.MarkKdsNotificationSkipped(context.Background(), 1, "no registered devices")

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}
