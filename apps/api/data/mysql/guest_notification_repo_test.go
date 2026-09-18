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

func newMockGuestNotificationRepository(t *testing.T) (domain.GuestNotificationRepository, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	return mysql.NewGuestNotificationRepository(gormDB), mock
}

// The insert is a self-referential no-op on conflict, which is what makes a duplicate enqueue
// for the same transaction leave exactly one row rather than erroring or writing a second.
func TestEnqueueForCompletedTransaction_DuplicateEnqueueIsIdempotentByConstruction(t *testing.T) {
	repo, mock := newMockGuestNotificationRepository(t)
	sessionId := "session-1"

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `guest_notifications` \\(`transaction_id`,`session_id`,`status`,`attempt_count`,`detail`,`created_at`,`sent_at`\\) VALUES \\(\\?,\\?,\\?,\\?,\\?,\\?,\\?\\) ON DUPLICATE KEY UPDATE `id`=id").
		WithArgs(int64(1), sessionId, "pending", 0, nil, sqlmock.AnyArg(), nil).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.EnqueueForCompletedTransaction(context.Background(), domain.Transaction{Id: 1}, &sessionId)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// FR-2: a completable transaction with no payment row still gets an outbox row, recorded skipped
// rather than failing the completion the barista already performed.
func TestEnqueueForCompletedTransaction_WritesSkippedStatusWhenThereIsNoSession(t *testing.T) {
	repo, mock := newMockGuestNotificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `guest_notifications`").
		WithArgs(int64(1), "", "skipped", 0, "no payment for transaction", sqlmock.AnyArg(), nil).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.EnqueueForCompletedTransaction(context.Background(), domain.Transaction{Id: 1}, nil)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestClaimPendingGuestNotifications_FiltersByStatusAndAttemptCount(t *testing.T) {
	repo, mock := newMockGuestNotificationRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `guest_notifications` WHERE status = \\? AND attempt_count < \\? ORDER BY created_at ASC LIMIT \\?").
		WithArgs("pending", domain.GuestNotificationMaxAttempts, 50).
		WillReturnRows(sqlmock.NewRows([]string{"id", "transaction_id", "session_id", "status", "attempt_count"}).AddRow(1, 10, "session-1", "pending", 0))

	notifications, err := repo.ClaimPendingGuestNotifications(context.Background(), 50)

	require.Nil(t, err)
	require.Len(t, notifications, 1)
	assert.Equal(t, domain.GuestNotificationStatusPending, notifications[0].Status)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestMarkGuestNotificationSent_SetsStatusAndSentAt(t *testing.T) {
	repo, mock := newMockGuestNotificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `guest_notifications` SET `detail`=\\?,`sent_at`=\\?,`status`=\\? WHERE id = \\?").
		WithArgs("test detail", sqlmock.AnyArg(), "sent", int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.MarkGuestNotificationSent(context.Background(), 1, "test detail")

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestMarkGuestNotificationFailed_IncrementsAttemptCountAndStaysPendingBelowThreshold(t *testing.T) {
	repo, mock := newMockGuestNotificationRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `guest_notifications` WHERE id = \\? ORDER BY `guest_notifications`.`id` LIMIT \\?").
		WithArgs(int64(1), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "attempt_count"}).AddRow(1, 3))

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `guest_notifications` SET `attempt_count`=\\?,`detail`=\\?,`status`=\\? WHERE id = \\?").
		WithArgs(4, "push timeout", "pending", int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.MarkGuestNotificationFailed(context.Background(), 1, "push timeout")

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestMarkGuestNotificationFailed_BecomesFailedAtMaxAttempts(t *testing.T) {
	repo, mock := newMockGuestNotificationRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `guest_notifications` WHERE id = \\? ORDER BY `guest_notifications`.`id` LIMIT \\?").
		WithArgs(int64(1), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "attempt_count"}).AddRow(1, domain.GuestNotificationMaxAttempts-1))

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `guest_notifications` SET `attempt_count`=\\?,`detail`=\\?,`status`=\\? WHERE id = \\?").
		WithArgs(domain.GuestNotificationMaxAttempts, "push timeout", "failed", int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.MarkGuestNotificationFailed(context.Background(), 1, "push timeout")

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestMarkGuestNotificationSkipped_SetsStatusAndDetail(t *testing.T) {
	repo, mock := newMockGuestNotificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `guest_notifications` SET `detail`=\\?,`status`=\\? WHERE id = \\?").
		WithArgs("no active subscription for session", "skipped", int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.MarkGuestNotificationSkipped(context.Background(), 1, "no active subscription for session")

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D7: UncompleteTransaction deletes the row so a re-completion enqueues a fresh one instead of
// being suppressed by the unique key on transaction_id.
func TestDeleteGuestNotificationByTransactionId_RemovesTheRow(t *testing.T) {
	repo, mock := newMockGuestNotificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `guest_notifications` WHERE transaction_id = \\?").
		WithArgs(int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.DeleteGuestNotificationByTransactionId(context.Background(), 1)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}
