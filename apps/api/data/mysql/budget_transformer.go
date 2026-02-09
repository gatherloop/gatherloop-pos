package mysql

import "apps/api/domain"

func ToBudgetDB(domainBudget domain.Budget) Budget {
	return Budget{
		Id:         domainBudget.Id,
		Name:       domainBudget.Name,
		Percentage: domainBudget.Percentage,
		Balance:    domainBudget.Balance,
		DeletedAt:  domainBudget.DeletedAt,
		CreatedAt:  domainBudget.CreatedAt,
	}
}

func ToBudgetDomain(dbBudget Budget) domain.Budget {
	return domain.Budget{
		Id:         dbBudget.Id,
		Name:       dbBudget.Name,
		Percentage: dbBudget.Percentage,
		Balance:    dbBudget.Balance,
		DeletedAt:  dbBudget.DeletedAt,
		CreatedAt:  dbBudget.CreatedAt,
	}
}

func ToBudgetsListDomain(dbBudgets []Budget) []domain.Budget {
	var domainBudgets []domain.Budget
	for _, dbBud := range dbBudgets {
		domainBudgets = append(domainBudgets, ToBudgetDomain(dbBud))
	}
	return domainBudgets
}
