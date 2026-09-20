package mysql

import (
	"apps/api/domain"

	"gorm.io/gorm"
)

// EXISTS, not JOIN, so a product can never fan out into more than one row here.
// Every token must match some field (AND-of-ORs); tokens are matched independently of each other.
func applyProductSearchFilter(db *gorm.DB, query string) *gorm.DB {
	for _, token := range domain.TokenizeSearchQuery(query) {
		like := "%" + token + "%"
		db = db.Where(
			`(
				products.name LIKE ?
				OR EXISTS (SELECT 1 FROM categories c WHERE c.id = products.category_id AND c.name LIKE ?)
				OR EXISTS (SELECT 1 FROM variants v WHERE v.product_id = products.id AND v.deleted_at IS NULL AND v.name LIKE ?)
				OR EXISTS (SELECT 1 FROM options o JOIN option_values ov ON ov.option_id = o.id WHERE o.product_id = products.id AND ov.name LIKE ?)
			)`,
			like, like, like, like,
		)
	}

	return db
}
