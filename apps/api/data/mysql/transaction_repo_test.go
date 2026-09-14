package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"context"
	"errors"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// Phase 3 of docs/prd-daily-transaction-number.md assigns the number with a
// MySQL-specific atomic statement (D4), so it needs a real MySQL with
// migrations 000026/000027 applied rather than the mock repository. Set
// DB_HOST (and DB_USERNAME/DB_PASSWORD/DB_NAME/DB_PORT as needed, matching
// .github/workflows/e2e-main.yml) to run it; it skips otherwise.
func connectTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		t.Skip("DB_HOST not set; skipping test that needs a real MySQL instance")
	}

	db, err := mysql.ConnectDB(mysql.ConnectDBParams{
		DbUsername: os.Getenv("DB_USERNAME"),
		DbPassword: os.Getenv("DB_PASSWORD"),
		DbHost:     dbHost,
		DbPort:     os.Getenv("DB_PORT"),
		DbName:     os.Getenv("DB_NAME"),
	})
	require.NoError(t, err)

	return db
}

var errRollbackTestData = errors.New("rollback test data")

// withTestTransaction runs fn inside a DB transaction that is always rolled
// back, so tests never leave rows behind in a shared database.
func withTestTransaction(t *testing.T, db *gorm.DB, fn func(ctx context.Context, repo domain.TransactionRepository)) {
	t.Helper()

	err := db.Transaction(func(tx *gorm.DB) error {
		ctx := context.WithValue(context.Background(), "tx", tx)
		fn(ctx, mysql.NewTransactionRepository(db))
		return errRollbackTestData
	})

	if err != nil && !errors.Is(err, errRollbackTestData) {
		require.NoError(t, err)
	}
}

func minimalTransaction(createdAt time.Time) domain.Transaction {
	return domain.Transaction{
		Name:               "Test Customer",
		Source:             domain.TransactionSourcePos,
		CreatedAt:          createdAt,
		TransactionItems:   []domain.TransactionItem{},
		TransactionCoupons: []domain.TransactionCoupon{},
	}
}

func lastCounterNumber(t *testing.T, ctx context.Context, tx *gorm.DB, businessDate string) int64 {
	t.Helper()

	var lastNumber int64
	result := tx.WithContext(ctx).Raw("SELECT last_number FROM transaction_number_counters WHERE transaction_date = ?", businessDate).Scan(&lastNumber)
	require.NoError(t, result.Error)
	return lastNumber
}

func TestCreateTransaction_SequentialNumbersSameDay(t *testing.T) {
	db := connectTestDB(t)

	withTestTransaction(t, db, func(ctx context.Context, repo domain.TransactionRepository) {
		day := time.Date(2030, time.January, 15, 10, 0, 0, 0, time.Local)

		first, err := repo.CreateTransaction(ctx, minimalTransaction(day))
		require.Nil(t, err)
		assert.Equal(t, int64(1), first.TransactionNumber)

		second, err := repo.CreateTransaction(ctx, minimalTransaction(day.Add(time.Hour)))
		require.Nil(t, err)
		assert.Equal(t, int64(2), second.TransactionNumber)
	})
}

func TestCreateTransaction_RolloverToNewDay(t *testing.T) {
	db := connectTestDB(t)

	withTestTransaction(t, db, func(ctx context.Context, repo domain.TransactionRepository) {
		dayOne := time.Date(2030, time.January, 16, 23, 0, 0, 0, time.Local)
		dayTwo := dayOne.AddDate(0, 0, 1)

		_, err := repo.CreateTransaction(ctx, minimalTransaction(dayOne))
		require.Nil(t, err)

		second, err := repo.CreateTransaction(ctx, minimalTransaction(dayOne.Add(30*time.Minute)))
		require.Nil(t, err)
		assert.Equal(t, int64(2), second.TransactionNumber)

		firstOfNextDay, err := repo.CreateTransaction(ctx, minimalTransaction(dayTwo))
		require.Nil(t, err)
		assert.Equal(t, int64(1), firstOfNextDay.TransactionNumber)
	})
}

func TestCreateTransaction_DeletedTransactionNumberIsNotReissued(t *testing.T) {
	db := connectTestDB(t)

	withTestTransaction(t, db, func(ctx context.Context, repo domain.TransactionRepository) {
		day := time.Date(2030, time.January, 17, 9, 0, 0, 0, time.Local)

		first, err := repo.CreateTransaction(ctx, minimalTransaction(day))
		require.Nil(t, err)
		assert.Equal(t, int64(1), first.TransactionNumber)

		deleteErr := repo.DeleteTransactionById(ctx, first.Id)
		require.Nil(t, deleteErr)

		second, err := repo.CreateTransaction(ctx, minimalTransaction(day.Add(time.Hour)))
		require.Nil(t, err)
		assert.Equal(t, int64(2), second.TransactionNumber, "the deleted transaction's number must not be reissued")
	})
}

func TestCreateTransaction_CounterMatchesTheCreatedAtDate(t *testing.T) {
	db := connectTestDB(t)

	withTestTransaction(t, db, func(ctx context.Context, repo domain.TransactionRepository) {
		day := time.Date(2030, time.January, 18, 12, 0, 0, 0, time.Local)

		created, err := repo.CreateTransaction(ctx, minimalTransaction(day))
		require.Nil(t, err)

		tx := ctx.Value("tx").(*gorm.DB)
		lastNumber := lastCounterNumber(t, ctx, tx, "2030-01-18")
		assert.Equal(t, created.TransactionNumber, lastNumber)
	})
}

func TestCreateTransaction_DefaultsCreatedAtWhenZero(t *testing.T) {
	db := connectTestDB(t)

	withTestTransaction(t, db, func(ctx context.Context, repo domain.TransactionRepository) {
		created, err := repo.CreateTransaction(ctx, minimalTransaction(time.Time{}))
		require.Nil(t, err)

		assert.False(t, created.CreatedAt.IsZero())
		assert.Greater(t, created.TransactionNumber, int64(0))

		tx := ctx.Value("tx").(*gorm.DB)
		lastNumber := lastCounterNumber(t, ctx, tx, created.CreatedAt.Format("2006-01-02"))
		assert.Equal(t, created.TransactionNumber, lastNumber)
	})
}

// Phase 7 of docs/prd-daily-transaction-number.md (FR-8/D15): a fully numeric
// search query also matches transaction_number, on any date.
func TestGetTransactionList_SearchByTransactionNumber(t *testing.T) {
	db := connectTestDB(t)

	withTestTransaction(t, db, func(ctx context.Context, repo domain.TransactionRepository) {
		day := time.Date(2030, time.January, 19, 10, 0, 0, 0, time.Local)

		target, err := repo.CreateTransaction(ctx, minimalTransaction(day))
		require.Nil(t, err)

		other, err := repo.CreateTransaction(ctx, minimalTransaction(day.Add(time.Hour)))
		require.Nil(t, err)
		require.NotEqual(t, target.TransactionNumber, other.TransactionNumber)

		query := strconv.FormatInt(target.TransactionNumber, 10)

		results, listErr := repo.GetTransactionList(ctx, query, domain.CreatedAt, domain.Descending, 0, 0, domain.All, nil, nil)
		require.Nil(t, listErr)

		total, totalErr := repo.GetTransactionListTotal(ctx, query, domain.All, nil, nil)
		require.Nil(t, totalErr)

		var foundIds []int64
		for _, result := range results {
			foundIds = append(foundIds, result.Id)
		}
		assert.Contains(t, foundIds, target.Id)
		assert.NotContains(t, foundIds, other.Id)
		assert.EqualValues(t, len(results), total)
	})
}

func TestGetTransactionList_SearchByTransactionNumberMatchesAnyDate(t *testing.T) {
	db := connectTestDB(t)

	withTestTransaction(t, db, func(ctx context.Context, repo domain.TransactionRepository) {
		dayOne := time.Date(2030, time.January, 20, 9, 0, 0, 0, time.Local)
		dayTwo := time.Date(2030, time.January, 21, 9, 0, 0, 0, time.Local)

		firstOfDayOne, err := repo.CreateTransaction(ctx, minimalTransaction(dayOne))
		require.Nil(t, err)
		firstOfDayTwo, err := repo.CreateTransaction(ctx, minimalTransaction(dayTwo))
		require.Nil(t, err)
		require.Equal(t, int64(1), firstOfDayOne.TransactionNumber)
		require.Equal(t, int64(1), firstOfDayTwo.TransactionNumber)

		results, listErr := repo.GetTransactionList(ctx, "1", domain.CreatedAt, domain.Descending, 0, 0, domain.All, nil, nil)
		require.Nil(t, listErr)

		var foundIds []int64
		for _, result := range results {
			foundIds = append(foundIds, result.Id)
		}
		assert.Contains(t, foundIds, firstOfDayOne.Id)
		assert.Contains(t, foundIds, firstOfDayTwo.Id)
	})
}

func TestGetTransactionList_SearchByNameStillWorks(t *testing.T) {
	db := connectTestDB(t)

	withTestTransaction(t, db, func(ctx context.Context, repo domain.TransactionRepository) {
		day := time.Date(2030, time.January, 22, 10, 0, 0, 0, time.Local)

		named := minimalTransaction(day)
		named.Name = "Budi Santoso"
		target, err := repo.CreateTransaction(ctx, named)
		require.Nil(t, err)

		other := minimalTransaction(day.Add(time.Hour))
		other.Name = "Siti Aminah"
		unrelated, err := repo.CreateTransaction(ctx, other)
		require.Nil(t, err)

		results, listErr := repo.GetTransactionList(ctx, "Budi", domain.CreatedAt, domain.Descending, 0, 0, domain.All, nil, nil)
		require.Nil(t, listErr)

		total, totalErr := repo.GetTransactionListTotal(ctx, "Budi", domain.All, nil, nil)
		require.Nil(t, totalErr)

		var foundIds []int64
		for _, result := range results {
			foundIds = append(foundIds, result.Id)
		}
		assert.Contains(t, foundIds, target.Id)
		assert.NotContains(t, foundIds, unrelated.Id)
		assert.EqualValues(t, len(results), total)
	})
}
