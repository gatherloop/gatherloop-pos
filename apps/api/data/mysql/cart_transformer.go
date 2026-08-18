package mysql

import "apps/api/domain"

func ToCartItemDB(d domain.CartItem) CartItem {
	return CartItem{
		Id:        d.Id,
		CartId:    d.CartId,
		VariantId: d.VariantId,
		Variant:   ToVariantDB(d.Variant),
		Amount:    d.Amount,
		Note:      d.Note,
		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
		DeletedAt: d.DeletedAt,
	}
}

func ToCartItemDomain(db CartItem) domain.CartItem {
	return domain.CartItem{
		Id:        db.Id,
		CartId:    db.CartId,
		VariantId: db.VariantId,
		Variant:   ToVariantDomain(db.Variant),
		Amount:    db.Amount,
		Note:      db.Note,
		CreatedAt: db.CreatedAt,
		UpdatedAt: db.UpdatedAt,
		DeletedAt: db.DeletedAt,
	}
}

func ToCartItemListDB(domainItems []domain.CartItem) []CartItem {
	items := make([]CartItem, 0, len(domainItems))
	for _, item := range domainItems {
		items = append(items, ToCartItemDB(item))
	}
	return items
}

func ToCartItemListDomain(dbItems []CartItem) []domain.CartItem {
	items := make([]domain.CartItem, 0, len(dbItems))
	for _, item := range dbItems {
		items = append(items, ToCartItemDomain(item))
	}
	return items
}

func ToCartDB(d domain.Cart) Cart {
	var table *Table
	if d.Table != nil {
		dbTable := ToTableDB(*d.Table)
		table = &dbTable
	}

	return Cart{
		Id:        d.Id,
		SessionId: d.SessionId,
		TableId:   d.TableId,
		Table:     table,
		Status:    string(d.Status),
		Items:     ToCartItemListDB(d.Items),
		CreatedAt: d.CreatedAt,
		UpdatedAt: d.UpdatedAt,
		DeletedAt: d.DeletedAt,
	}
}

func ToCartDomain(db Cart) domain.Cart {
	var table *domain.Table
	if db.Table != nil {
		domainTable := ToTableDomain(*db.Table)
		table = &domainTable
	}

	return domain.Cart{
		Id:        db.Id,
		SessionId: db.SessionId,
		TableId:   db.TableId,
		Table:     table,
		Status:    domain.CartStatus(db.Status),
		Items:     ToCartItemListDomain(db.Items),
		CreatedAt: db.CreatedAt,
		UpdatedAt: db.UpdatedAt,
		DeletedAt: db.DeletedAt,
	}
}
