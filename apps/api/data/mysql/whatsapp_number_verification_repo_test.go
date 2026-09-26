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

func newMockWhatsappNumberVerificationRepository(t *testing.T) (domain.WhatsappNumberVerificationRepository, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	return mysql.NewWhatsappNumberVerificationRepository(gormDB), mock
}

func TestIsWhatsappNumberVerified_TrueWhenARowExists(t *testing.T) {
	repo, mock := newMockWhatsappNumberVerificationRepository(t)

	mock.ExpectQuery("SELECT count\\(\\*\\) FROM `whatsapp_number_verifications` WHERE whatsapp_number = \\?").
		WithArgs("6281234567890").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(1))

	verified, err := repo.IsWhatsappNumberVerified(context.Background(), "6281234567890")

	require.Nil(t, err)
	require.True(t, verified)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestIsWhatsappNumberVerified_FalseWhenTheNumberIsUnknown(t *testing.T) {
	repo, mock := newMockWhatsappNumberVerificationRepository(t)

	mock.ExpectQuery("SELECT count\\(\\*\\) FROM `whatsapp_number_verifications` WHERE whatsapp_number = \\?").
		WithArgs("6281234567890").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

	verified, err := repo.IsWhatsappNumberVerified(context.Background(), "6281234567890")

	require.Nil(t, err)
	require.False(t, verified)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D2/table design: a re-verification upserts on the unique key instead of erroring or inserting a
// second row, so verified_at reflects the latest confirmation from Fonnte.
func TestMarkWhatsappNumberVerified_UpsertsOnTheUniqueNumber(t *testing.T) {
	repo, mock := newMockWhatsappNumberVerificationRepository(t)
	verifiedAt := time.Now()

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `whatsapp_number_verifications` \\(`whatsapp_number`,`verified_at`,`created_at`,`updated_at`\\) VALUES \\(\\?,\\?,\\?,\\?\\) ON DUPLICATE KEY UPDATE `verified_at`=VALUES\\(`verified_at`\\)").
		WithArgs("6281234567890", verifiedAt, sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	err := repo.MarkWhatsappNumberVerified(context.Background(), "6281234567890", verifiedAt)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}
