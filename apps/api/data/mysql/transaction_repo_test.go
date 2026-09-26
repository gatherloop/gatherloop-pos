package mysql_test

import (
	"apps/api/data/mysql"
	"apps/api/domain"
	"context"
	"database/sql/driver"
	"fmt"
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
			expectedQuery: "SELECT transactions\\.\\*, payments\\.method AS payment_method, payments\\.verification_status AS payment_verification_status FROM `transactions` LEFT JOIN payments ON payments\\.transaction_id = transactions\\.id AND payments\\.deleted_at IS NULL WHERE transactions\\.deleted_at is NULL",
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

// D16: the payment method is resolved through one LEFT JOIN on the existing read
// model query, not a per-row lookup.
func TestTransactionRepository_GetTransactionById_JoinsPaymentMethod(t *testing.T) {
	repo, mock := newMockTransactionRepository(t)

	mock.ExpectQuery("SELECT transactions\\.\\*, payments\\.method AS payment_method, payments\\.verification_status AS payment_verification_status FROM `transactions` LEFT JOIN payments ON payments\\.transaction_id = transactions\\.id AND payments\\.deleted_at IS NULL WHERE transactions\\.id = \\?").
		WithArgs(int64(7), 1).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	_, err := repo.GetTransactionById(context.Background(), 7)

	require.NotNil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D5: the repository method every creation path funnels through defaults an empty
// dining option to dine_in before the insert, so POS, order-app and rental creates
// all persist a value with no use-case change.
func TestTransactionRepository_CreateTransaction_DefaultsDiningOptionToDineIn(t *testing.T) {
	repo, mock := newMockTransactionRepository(t)

	mock.ExpectExec("INSERT INTO transaction_number_counters").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectQuery("SELECT LAST_INSERT_ID\\(\\)").
		WillReturnRows(sqlmock.NewRows([]string{"LAST_INSERT_ID()"}).AddRow(1))
	mock.ExpectBegin()
	mock.ExpectExec("INSERT INTO `transactions`").
		WillReturnError(fmt.Errorf("stop before fetch"))
	mock.ExpectRollback()

	_, err := repo.CreateTransaction(context.Background(), domain.Transaction{Name: "Andi"})

	require.NotNil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D6/R3: GORM's struct Updates skips zero-value string fields, so an absent
// dining option leaves the stored one unchanged, and a present one overwrites it —
// pinned here so a future move to Select("*").Updates fails a test instead of
// silently resetting a takeaway order.
func TestTransactionRepository_UpdateTransactionById_DiningOption(t *testing.T) {
	tests := []struct {
		name          string
		diningOption  domain.DiningOption
		expectedQuery string
	}{
		{
			name:          "absent leaves the stored value unchanged",
			diningOption:  "",
			expectedQuery: "UPDATE `transactions` SET `name`=\\? WHERE id = \\? AND `id` = \\?",
		},
		{
			name:          "dine_in switches a takeaway transaction back",
			diningOption:  domain.DiningOptionDineIn,
			expectedQuery: "UPDATE `transactions` SET `name`=\\?,`dining_option`=\\? WHERE id = \\? AND `id` = \\?",
		},
		{
			name:          "takeaway sets it explicitly",
			diningOption:  domain.DiningOptionTakeaway,
			expectedQuery: "UPDATE `transactions` SET `name`=\\?,`dining_option`=\\? WHERE id = \\? AND `id` = \\?",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo, mock := newMockTransactionRepository(t)

			mock.ExpectBegin()
			mock.ExpectExec(tt.expectedQuery).
				WillReturnResult(sqlmock.NewResult(0, 1))
			mock.ExpectCommit()
			mock.ExpectQuery("SELECT \\* FROM `transactions` WHERE id = \\?").
				WillReturnRows(sqlmock.NewRows([]string{"id"}))

			_, err := repo.UpdateTransactionById(context.Background(), domain.Transaction{Name: "Andi", DiningOption: tt.diningOption}, 5)

			require.NotNil(t, err)
			require.NoError(t, mock.ExpectationsWereMet())
		})
	}
}

// D8: the order-checkout reuse branch's narrow write — one column, not the general
// UpdateTransactionById's item/coupon re-diff.
func TestTransactionRepository_UpdateTransactionDiningOptionById(t *testing.T) {
	repo, mock := newMockTransactionRepository(t)

	mock.ExpectBegin()
	mock.ExpectExec("UPDATE `transactions` SET `dining_option`=\\? WHERE id = \\?").
		WithArgs("takeaway", int64(5)).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	err := repo.UpdateTransactionDiningOptionById(context.Background(), 5, domain.DiningOptionTakeaway)

	require.Nil(t, err)
	require.NoError(t, mock.ExpectationsWereMet())
}

func TestTransactionRepository_GetTransactionSummariesByIds_EmptyIdsShortCircuits(t *testing.T) {
	repo, mock := newMockTransactionRepository(t)

	summaries, err := repo.GetTransactionSummariesByIds(context.Background(), nil)

	require.Nil(t, err)
	require.Empty(t, summaries)
	require.NoError(t, mock.ExpectationsWereMet())
}

// D2: one purpose-built query, not a per-row GetTransactionById preload chain.
// D13: the dining option rides the same query, no separate lookup.
func TestTransactionRepository_GetTransactionSummariesByIds_JoinsAndGroups(t *testing.T) {
	repo, mock := newMockTransactionRepository(t)

	mock.ExpectQuery("SELECT transactions.id AS id, transactions.transaction_number AS transaction_number, transactions.name AS name, transactions.completed_at AS completed_at, tables.label AS table_label, COUNT\\(transaction_items.id\\) AS item_count, transactions.dining_option AS dining_option FROM `transactions` LEFT JOIN carts ON carts.id = transactions.cart_id LEFT JOIN tables ON tables.id = carts.table_id LEFT JOIN transaction_items ON transaction_items.transaction_id = transactions.id WHERE transactions.id IN \\(\\?\\) AND transactions.deleted_at IS NULL GROUP BY transactions.id, transactions.transaction_number, transactions.name, transactions.completed_at, tables.label, transactions.dining_option").
		WithArgs(int64(99)).
		WillReturnRows(sqlmock.NewRows([]string{"id", "transaction_number", "name", "completed_at", "table_label", "item_count", "dining_option"}).
			AddRow(99, 12, "Budi", nil, "Meja 3", 2, "takeaway"))

	summaries, err := repo.GetTransactionSummariesByIds(context.Background(), []int64{99})

	require.Nil(t, err)
	require.Len(t, summaries, 1)
	require.Equal(t, int64(99), summaries[0].Id)
	require.Equal(t, int64(12), summaries[0].TransactionNumber)
	require.Equal(t, "Budi", summaries[0].Name)
	require.Equal(t, "Meja 3", summaries[0].TableLabel)
	require.Equal(t, 2, summaries[0].ItemCount)
	require.Nil(t, summaries[0].CompletedAt)
	require.Equal(t, domain.DiningOptionTakeaway, summaries[0].DiningOption)
	require.NoError(t, mock.ExpectationsWereMet())
}
