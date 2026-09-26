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

func newMockPaymentVerificationRepository(t *testing.T) (domain.PaymentVerificationRepository, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	return mysql.NewPaymentVerificationRepository(gormDB), mock
}

func TestPaymentVerificationRepository_Create_InsertsThePhoto(t *testing.T) {
	repo, mock := newMockPaymentVerificationRepository(t)
	createdAt := time.Now()

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `payment_verification_photos` \\(`content_type`,`byte_size`,`data`,`created_at`,`payment_id`\\) VALUES \\(\\?,\\?,\\?,\\?,\\?\\)").
		WithArgs("image/jpeg", 3, []byte{1, 2, 3}, sqlmock.AnyArg(), int64(1)).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.Create(context.Background(), domain.PaymentVerificationPhoto{
		PaymentId:   1,
		ContentType: "image/jpeg",
		ByteSize:    3,
		Data:        []byte{1, 2, 3},
		CreatedAt:   createdAt,
	})

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentVerificationRepository_GetByPaymentId_ReturnsTheStoredPhoto(t *testing.T) {
	repo, mock := newMockPaymentVerificationRepository(t)
	createdAt := time.Now()

	mock.ExpectQuery("SELECT \\* FROM `payment_verification_photos` WHERE payment_id = \\? ORDER BY `payment_verification_photos`.`payment_id` LIMIT \\?").
		WithArgs(int64(1), 1).
		WillReturnRows(sqlmock.NewRows([]string{"payment_id", "content_type", "byte_size", "data", "created_at"}).
			AddRow(int64(1), "image/jpeg", 3, []byte{1, 2, 3}, createdAt))

	photo, err := repo.GetByPaymentId(context.Background(), 1)

	require.Nil(t, err)
	require.Equal(t, domain.PaymentVerificationPhoto{
		PaymentId:   1,
		ContentType: "image/jpeg",
		ByteSize:    3,
		Data:        []byte{1, 2, 3},
		CreatedAt:   createdAt,
	}, photo)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentVerificationRepository_GetByPaymentId_NotFoundWhenThereIsNoRow(t *testing.T) {
	repo, mock := newMockPaymentVerificationRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `payment_verification_photos` WHERE payment_id = \\? ORDER BY `payment_verification_photos`.`payment_id` LIMIT \\?").
		WithArgs(int64(404), 1).
		WillReturnRows(sqlmock.NewRows([]string{"payment_id"}))

	_, err := repo.GetByPaymentId(context.Background(), 404)

	require.NotNil(t, err)
	require.Equal(t, domain.NotFound, err.Type)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentVerificationRepository_DeleteByPaymentId_DeletesTheRow(t *testing.T) {
	repo, mock := newMockPaymentVerificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `payment_verification_photos` WHERE payment_id = \\?").
		WithArgs(int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.DeleteByPaymentId(context.Background(), 1)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D5/FR-3: a terminal path that never had a photo (a non-COD payment) still calls
// DeleteByPaymentId unconditionally, so a missing row must not be an error.
func TestPaymentVerificationRepository_DeleteByPaymentId_MissingRowIsNotAnError(t *testing.T) {
	repo, mock := newMockPaymentVerificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `payment_verification_photos` WHERE payment_id = \\?").
		WithArgs(int64(999)).
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()

	err := repo.DeleteByPaymentId(context.Background(), 999)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D5 backstop: photos of a cancelled, expired, paid or approved payment are orphaned and swept;
// the awaiting one is the invariant's live case and must survive.
func TestPaymentVerificationRepository_DeleteOrphaned_DeletesPhotosOfDecidedPayments(t *testing.T) {
	repo, mock := newMockPaymentVerificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `payment_verification_photos` WHERE payment_id NOT IN \\(SELECT id FROM `payments` WHERE method = \\? AND status = \\? AND verification_status = \\?\\) LIMIT \\?").
		WithArgs("cod", "pending", "awaiting", 10).
		WillReturnResult(sqlmock.NewResult(0, 4))
	mock.ExpectCommit()

	count, err := repo.DeleteOrphaned(context.Background(), 10)

	require.Nil(t, err)
	require.Equal(t, int64(4), count)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestPaymentVerificationRepository_DeleteOrphaned_NoLimitDeletesEveryOrphan(t *testing.T) {
	repo, mock := newMockPaymentVerificationRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `payment_verification_photos` WHERE payment_id NOT IN \\(SELECT id FROM `payments` WHERE method = \\? AND status = \\? AND verification_status = \\?\\)").
		WithArgs("cod", "pending", "awaiting").
		WillReturnResult(sqlmock.NewResult(0, 0))
	mock.ExpectCommit()

	count, err := repo.DeleteOrphaned(context.Background(), 0)

	require.Nil(t, err)
	require.Equal(t, int64(0), count)
	require.NoError(t, mock.ExpectationsWereMet())
}
