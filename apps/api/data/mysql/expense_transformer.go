package mysql

import "apps/api/domain"

func ToExpenseDB(domainExpense domain.Expense) Expense {
	return Expense{
		Id:           domainExpense.Id,
		DeletedAt:    domainExpense.DeletedAt,
		CreatedAt:    domainExpense.CreatedAt,
		WalletId:     domainExpense.WalletId,
		Wallet:       ToWalletDB(domainExpense.Wallet),
		BudgetId:     domainExpense.BudgetId,
		Budget:       ToBudgetDB(domainExpense.Budget),
		Total:        domainExpense.Total,
		ExpenseItems: ToExpenseItemsListDB(domainExpense.ExpenseItems),
	}
}

func ToExpenseDomain(dbExpense Expense) domain.Expense {
	return domain.Expense{
		Id:           dbExpense.Id,
		DeletedAt:    dbExpense.DeletedAt,
		CreatedAt:    dbExpense.CreatedAt,
		WalletId:     dbExpense.WalletId,
		Wallet:       ToWalletDomain(dbExpense.Wallet),
		BudgetId:     dbExpense.BudgetId,
		Budget:       ToBudgetDomain(dbExpense.Budget),
		Total:        dbExpense.Total,
		ExpenseItems: ToExpenseItemsListDomain(dbExpense.ExpenseItems),
	}
}

func ToExpensesListDomain(dbExpenses []Expense) []domain.Expense {
	var domainExpenses []domain.Expense
	for _, dbExp := range dbExpenses {
		domainExpenses = append(domainExpenses, ToExpenseDomain(dbExp))
	}
	return domainExpenses
}

func ToExpenseItemDB(domainExpenseItem domain.ExpenseItem) ExpenseItem {
	return ExpenseItem{
		Id:        domainExpenseItem.Id,
		Name:      domainExpenseItem.Name,
		Unit:      domainExpenseItem.Unit,
		Price:     domainExpenseItem.Price,
		Amount:    domainExpenseItem.Amount,
		Subtotal:  domainExpenseItem.Subtotal,
		ExpenseId: domainExpenseItem.ExpenseId,
	}
}

func ToExpenseItemDomain(dbExpenseItem ExpenseItem) domain.ExpenseItem {
	return domain.ExpenseItem{
		Id:        dbExpenseItem.Id,
		Name:      dbExpenseItem.Name,
		Unit:      dbExpenseItem.Unit,
		Price:     dbExpenseItem.Price,
		Amount:    dbExpenseItem.Amount,
		Subtotal:  dbExpenseItem.Subtotal,
		ExpenseId: dbExpenseItem.ExpenseId,
	}
}

func ToExpenseItemsListDomain(dbExpenseItems []ExpenseItem) []domain.ExpenseItem {
	var domainExpenseItems []domain.ExpenseItem
	for _, dbExpItem := range dbExpenseItems {
		domainExpenseItems = append(domainExpenseItems, ToExpenseItemDomain(dbExpItem))
	}
	return domainExpenseItems
}

func ToExpenseItemsListDB(domainExpenseItems []domain.ExpenseItem) []ExpenseItem {
	var dbExpenseItems []ExpenseItem
	for _, domainExpItem := range domainExpenseItems {
		dbExpenseItems = append(dbExpenseItems, ToExpenseItemDB(domainExpItem))
	}
	return dbExpenseItems
}
