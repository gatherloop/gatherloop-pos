package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"context"
	"database/sql/driver"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/require"
	gormmysql "gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func newMockTransactionRepository(t *testing.T) (domain.TransactionRepository, sqlmock.Sqlmock) {
	t.Helper()

	sqlDB, mock, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{})
	require.NoError(t, err)

	return mysql.NewTransactionRepository(gormDB), mock
}

// FR-3/D5/D22: a non-all fulfillment value narrows to source = 'order' server-side, so
// the filter answers "which guest orders" and never floods the result with POS rows.
func TestTransactionRepository_GetTransactionListTotal_Fulfillment(t *testing.T) {
	preparing := domain.TransactionFulfillmentPreparing
	ready := domain.TransactionFulfillmentReady

	tests := []struct {
		name          string
		fulfillment   *domain.TransactionFulfillment
		expectedQuery string
		expectedArgs  []driver.Value
	}{
		{
			name:          "preparing narrows to order rows not yet completed",
			fulfillment:   &preparing,
			expectedQuery: `source = \? AND completed_at IS NULL`,
			expectedArgs:  []driver.Value{"order"},
		},
		{
			name:          "ready narrows to order rows already completed",
			fulfillment:   &ready,
			expectedQuery: `source = \? AND completed_at IS NOT NULL`,
			expectedArgs:  []driver.Value{"order"},
		},
		{
			name:          "all applies no fulfillment predicate",
			fulfillment:   nil,
			expectedQuery: "SELECT count\\(\\*\\) FROM `transactions` WHERE `deleted_at` IS NULL",
			expectedArgs:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo, mock := newMockTransactionRepository(t)

			expectation := mock.ExpectQuery(tt.expectedQuery)
			if tt.expectedArgs != nil {
				expectation = expectation.WithArgs(tt.expectedArgs...)
			}
			expectation.WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(0))

			total, err := repo.GetTransactionListTotal(context.Background(), "", domain.All, nil, nil, tt.fulfillment)

			require.Nil(t, err)
			require.Equal(t, int64(0), total)
			require.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestTransactionRepository_GetTransactionList_Fulfillment(t *testing.T) {
	preparing := domain.TransactionFulfillmentPreparing
	ready := domain.TransactionFulfillmentReady

	tests := []struct {
		name          string
		fulfillment   *domain.TransactionFulfillment
		expectedQuery string
		expectedArgs  []driver.Value
	}{
		{
			name:          "preparing narrows to order rows not yet completed",
			fulfillment:   &preparing,
			expectedQuery: `source = \? AND completed_at IS NULL`,
			expectedArgs:  []driver.Value{"order"},
		},
		{
			name:          "ready narrows to order rows already completed",
			fulfillment:   &ready,
			expectedQuery: `source = \? AND completed_at IS NOT NULL`,
			expectedArgs:  []driver.Value{"order"},
		},
		{
			name:          "all applies no fulfillment predicate",
			fulfillment:   nil,
			expectedQuery: "SELECT \\* FROM `transactions` WHERE deleted_at is NULL",
			expectedArgs:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo, mock := newMockTransactionRepository(t)

			// An empty result set keeps GORM from firing the Preload queries this
			// repository method also issues, so only the base predicate is asserted.
			expectation := mock.ExpectQuery(tt.expectedQuery)
			if tt.expectedArgs != nil {
				expectation = expectation.WithArgs(tt.expectedArgs...)
			}
			expectation.WillReturnRows(sqlmock.NewRows([]string{"id"}))

			transactions, err := repo.GetTransactionList(context.Background(), "", domain.CreatedAt, domain.Ascending, 0, 0, domain.All, nil, nil, tt.fulfillment)

			require.Nil(t, err)
			require.Empty(t, transactions)
			require.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

func TestTransactionRepository_GetTransactionSummariesByIds_EmptyIdsShortCircuits(t *testing.T) {
	repo, mock := newMockTransactionRepository(t)

	summaries, err := repo.GetTransactionSummariesByIds(context.Background(), nil)

	require.Nil(t, err)
	require.Empty(t, summaries)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D2: one purpose-built query, not a per-row GetTransactionById preload chain.
func TestTransactionRepository_GetTransactionSummariesByIds_JoinsAndGroups(t *testing.T) {
	repo, mock := newMockTransactionRepository(t)

	mock.ExpectQuery("SELECT transactions.id AS id, transactions.transaction_number AS transaction_number, transactions.name AS name, transactions.completed_at AS completed_at, tables.label AS table_label, COUNT\\(transaction_items.id\\) AS item_count FROM `transactions` LEFT JOIN carts ON carts.id = transactions.cart_id LEFT JOIN tables ON tables.id = carts.table_id LEFT JOIN transaction_items ON transaction_items.transaction_id = transactions.id WHERE transactions.id IN \\(\\?\\) AND transactions.deleted_at IS NULL GROUP BY transactions.id, transactions.transaction_number, transactions.name, transactions.completed_at, tables.label").
		WithArgs(int64(99)).
		WillReturnRows(sqlmock.NewRows([]string{"id", "transaction_number", "name", "completed_at", "table_label", "item_count"}).
			AddRow(99, 12, "Budi", nil, "Meja 3", 2))

	summaries, err := repo.GetTransactionSummariesByIds(context.Background(), []int64{99})

	require.Nil(t, err)
	require.Len(t, summaries, 1)
	require.Equal(t, int64(99), summaries[0].Id)
	require.Equal(t, int64(12), summaries[0].TransactionNumber)
	require.Equal(t, "Budi", summaries[0].Name)
	require.Equal(t, "Meja 3", summaries[0].TableLabel)
	require.Equal(t, 2, summaries[0].ItemCount)
	require.Nil(t, summaries[0].CompletedAt)
	require.NoError(t, mock.ExpectationsWereMet())
}
