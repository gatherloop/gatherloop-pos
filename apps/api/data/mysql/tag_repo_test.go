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

func newMockTagRepository(t *testing.T) (domain.TagRepository, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	return mysql.NewTagRepository(gormDB), mock
}

func TestTagRepository_Update_WritesFalseAndZeroValues(t *testing.T) {
	repo, mock := newMockTagRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `tags` SET `name`=\\?,`color`=\\?,`is_highlighted`=\\?,`sort_order`=\\? WHERE id = \\?").
		WithArgs("New", "green", false, 0, int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()
	mock.ExpectQuery("SELECT \\* FROM `tags` WHERE id = \\? ORDER BY `tags`.`id` LIMIT \\?").
		WithArgs(int64(1), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "color", "is_highlighted", "sort_order"}).
			AddRow(1, "New", "green", false, 0))

	tag, err := repo.UpdateTagById(context.Background(), domain.Tag{Name: "New", Color: domain.TagColorGreen}, 1)

	require.Nil(t, err)
	require.Equal(t, domain.Tag{Id: 1, Name: "New", Color: domain.TagColorGreen}, tag)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTagRepository_Delete_RemovesTheRow(t *testing.T) {
	repo, mock := newMockTagRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `tags` WHERE id = \\?").
		WithArgs(int64(1)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.DeleteTagById(context.Background(), 1)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTagRepository_GetList_OrdersBySortOrderThenName(t *testing.T) {
	repo, mock := newMockTagRepository(t)

	mock.ExpectQuery("SELECT \\* FROM `tags` ORDER BY sort_order ASC, name ASC").
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "color", "is_highlighted", "sort_order"}).
			AddRow(2, "Best Seller", "orange", true, 1).
			AddRow(1, "New", "green", true, 2))

	tags, err := repo.GetTagList(context.Background())

	require.Nil(t, err)
	require.Len(t, tags, 2)
	require.Equal(t, "Best Seller", tags[0].Name)
	require.True(t, tags[0].IsHighlighted)
	require.NoError(t, mock.ExpectationsWereMet())
}
