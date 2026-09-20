package mysql

import (
	"strings"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	gormmysql "gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func newSearchDryRunDb(t *testing.T) *gorm.DB {
	t.Helper()

	sqlDB, _, err := sqlmock.New()
	require.NoError(t, err)
	t.Cleanup(func() { sqlDB.Close() })

	gormDB, err := gorm.Open(gormmysql.New(gormmysql.Config{
		Conn:                      sqlDB,
		SkipInitializeWithVersion: true,
	}), &gorm.Config{SkipDefaultTransaction: true})
	require.NoError(t, err)

	return gormDB.Session(&gorm.Session{DryRun: true})
}

func TestApplyProductSearchFilter_MatchesNameCategoryVariantAndOptionValue(t *testing.T) {
	db := newSearchDryRunDb(t)

	var products []Product
	stmt := applyProductSearchFilter(db.Table("products"), "grey").Find(&products).Statement

	sql := stmt.SQL.String()
	assert.Contains(t, sql, "products.name LIKE")
	assert.Contains(t, sql, "EXISTS (SELECT 1 FROM categories")
	assert.Contains(t, sql, "EXISTS (SELECT 1 FROM variants")
	assert.Contains(t, sql, "v.deleted_at IS NULL")
	assert.Contains(t, sql, "EXISTS (SELECT 1 FROM options")
	assert.Contains(t, sql, "JOIN option_values")
	assert.NotContains(t, sql, "description")

	require.Len(t, stmt.Vars, 4)
	for _, v := range stmt.Vars {
		assert.Equal(t, "%grey%", v)
	}
}

func TestApplyProductSearchFilter_MultipleTokensProduceAndedGroups(t *testing.T) {
	db := newSearchDryRunDb(t)

	var products []Product
	stmt := applyProductSearchFilter(db.Table("products"), "teh besar").Find(&products).Statement

	sql := stmt.SQL.String()
	assert.Equal(t, 2, strings.Count(sql, "products.name LIKE"))

	require.Len(t, stmt.Vars, 8)
	for _, v := range stmt.Vars[:4] {
		assert.Equal(t, "%teh%", v)
	}
	for _, v := range stmt.Vars[4:] {
		assert.Equal(t, "%besar%", v)
	}
}

func TestApplyProductSearchFilter_CapsAtEightTokens(t *testing.T) {
	db := newSearchDryRunDb(t)

	var products []Product
	stmt := applyProductSearchFilter(db.Table("products"), "one two three four five six seven eight nine").Find(&products).Statement

	assert.Equal(t, 8, strings.Count(stmt.SQL.String(), "products.name LIKE"))
	require.Len(t, stmt.Vars, 32)
	assert.NotContains(t, stmt.Vars, "%nine%")
}

func TestApplyProductSearchFilter_EmptyQueryAddsNoFilter(t *testing.T) {
	db := newSearchDryRunDb(t)

	var products []Product
	stmt := applyProductSearchFilter(db.Table("products"), "").Find(&products).Statement

	assert.NotContains(t, stmt.SQL.String(), "LIKE")
	assert.Empty(t, stmt.Vars)
}

// A page's rows and its total must agree on which products matched.
func TestApplyProductSearchFilter_ListAndTotalProduceIdenticalWhereFragment(t *testing.T) {
	db := newSearchDryRunDb(t)

	var products []Product
	listSql := applyProductSearchFilter(db.Table("products").Where("deleted_at", nil).Order("created_at desc"), "besar").Find(&products).Statement.SQL.String()

	var count int64
	totalSql := applyProductSearchFilter(db.Table("products").Where("deleted_at", nil), "besar").Count(&count).Statement.SQL.String()

	fragment := "products.name LIKE ?"
	require.Contains(t, listSql, fragment)
	require.Contains(t, totalSql, fragment)

	listWhere := listSql[strings.Index(listSql, "WHERE"):]
	if idx := strings.Index(listWhere, "ORDER BY"); idx != -1 {
		listWhere = listWhere[:idx]
	}
	totalWhere := totalSql[strings.Index(totalSql, "WHERE"):]

	assert.Equal(t, strings.TrimSpace(listWhere), strings.TrimSpace(totalWhere))
}
