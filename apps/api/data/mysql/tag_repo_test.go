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
	mock.ExpectQuery("SELECT tags.\\*, \\(SELECT COUNT\\(\\*\\) FROM variant_tags .+ AS variant_count FROM `tags` WHERE tags.id = \\? ORDER BY `tags`.`id` LIMIT \\?").
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

	mock.ExpectQuery("SELECT tags.\\*, \\(SELECT COUNT\\(\\*\\) FROM variant_tags .+ AS variant_count FROM `tags` ORDER BY sort_order ASC, name ASC").
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "color", "is_highlighted", "sort_order", "variant_count"}).
			AddRow(2, "Best Seller", "orange", true, 1, 4).
			AddRow(1, "New", "green", true, 2, 0))

	tags, err := repo.GetTagList(context.Background())

	require.Nil(t, err)
	require.Len(t, tags, 2)
	require.Equal(t, "Best Seller", tags[0].Name)
	require.True(t, tags[0].IsHighlighted)
	require.Equal(t, int64(4), tags[0].VariantCount)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTagRepository_InsertVariantTags_IgnoresPairsThatAlreadyExist(t *testing.T) {
	repo, mock := newMockTagRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `variant_tags` \\(`variant_id`,`tag_id`,`created_at`\\) VALUES \\(\\?,\\?,\\?\\),\\(\\?,\\?,\\?\\) ON DUPLICATE KEY UPDATE `variant_id`=`variant_id`").
		WithArgs(int64(1), int64(5), sqlmock.AnyArg(), int64(2), int64(5), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectCommit()

	err := repo.InsertVariantTags(context.Background(), []domain.VariantTagPair{
		{VariantId: 1, TagId: 5},
		{VariantId: 2, TagId: 5},
	})

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTagRepository_DeleteVariantTags_RemovesOnlyTheGivenPairs(t *testing.T) {
	repo, mock := newMockTagRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("DELETE FROM `variant_tags` WHERE \\(variant_id, tag_id\\) IN \\(\\(\\?,\\?\\),\\(\\?,\\?\\)\\)").
		WithArgs(int64(1), int64(5), int64(2), int64(5)).
		WillReturnResult(sqlmock.NewResult(0, 2))
	mock.ExpectCommit()

	err := repo.DeleteVariantTags(context.Background(), []domain.VariantTagPair{
		{VariantId: 1, TagId: 5},
		{VariantId: 2, TagId: 5},
	})

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTagRepository_GetLiveVariantIds_SkipsDeletedAndUnknownVariants(t *testing.T) {
	repo, mock := newMockTagRepository(t)

	mock.ExpectQuery("SELECT `id` FROM `variants` WHERE id IN \\(\\?,\\?,\\?\\) AND deleted_at IS NULL").
		WithArgs(int64(1), int64(2), int64(3)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1).AddRow(3))

	liveIds, err := repo.GetLiveVariantIds(context.Background(), []int64{1, 2, 3})

	require.Nil(t, err)
	require.Equal(t, []int64{1, 3}, liveIds)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTagRepository_GetLiveVariantIds_EmptyInputSkipsTheQuery(t *testing.T) {
	repo, mock := newMockTagRepository(t)

	liveIds, err := repo.GetLiveVariantIds(context.Background(), []int64{})

	require.Nil(t, err)
	require.Empty(t, liveIds)
	require.NoError(t, mock.ExpectationsWereMet())
}
