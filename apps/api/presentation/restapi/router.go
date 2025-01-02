package restapi

import (
	"apps/api/data/mysql"
	"apps/api/domain/auth"
	"apps/api/domain/budget"
	"apps/api/domain/category"
	"apps/api/domain/expense"
	"apps/api/domain/material"
	"apps/api/domain/product"
	"apps/api/domain/transaction"
	"apps/api/domain/wallet"
	"apps/api/utils"
	"net/http"

	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AddRouters(router *mux.Router, db *gorm.DB) {
	walletRepository := mysql.NewWalletRepository(db)
	productRepository := mysql.NewProductRepository(db)
	budgetRepository := mysql.NewBudgetRepository(db)
	transactionRepository := mysql.NewTransactionRepository(db)
	materialRepository := mysql.NewMaterialRepository(db)
	expenseRepository := mysql.NewExpenseRepository(db)
	categoryRepository := mysql.NewCategoryRepository(db)
	authRepository := mysql.NewAuthRepository(db)

	walletUsecase := wallet.NewUsecase(walletRepository)
	transactionUsecase := transaction.NewUsecase(transactionRepository, productRepository, walletRepository, budgetRepository)
	productUsecase := product.NewUsecase(productRepository)
	materialUsecase := material.NewUsecase(materialRepository)
	expenseUsecase := expense.NewUsecase(expenseRepository, budgetRepository, walletRepository)
	categoryUsecase := category.NewUsecase(categoryRepository)
	budgetUsecase := budget.NewUsecase(budgetRepository)
	authUsecase := auth.NewUsecase(authRepository)

	walletHandler := NewWalletHandler(walletUsecase)
	transactionHandler := NewTransactionHandler(transactionUsecase)
	productHandler := NewProductHandler(productUsecase)
	materialHandler := NewMaterialHandler(materialUsecase)
	expenseHandler := NewExpenseHandler(expenseUsecase)
	categoryHandler := NewCategoryHandler(categoryUsecase)
	budgetHandler := NewBudgetHandler(budgetUsecase)
	authHandler := NewAuthHandler(authUsecase)

	router.HandleFunc("/wallets", walletHandler.GetWalletList).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}", walletHandler.GetWalletById).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}", walletHandler.DeleteWalletById).Methods(http.MethodDelete)
	router.HandleFunc("/wallets/{walletId}", walletHandler.UpdateWalletById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/wallets", walletHandler.CreateWallet).Methods(http.MethodPost, http.MethodOptions)
	router.HandleFunc("/wallets/{walletId}/transfers", walletHandler.GetWalletTransferList).Methods(http.MethodGet)
	router.HandleFunc("/wallets/{walletId}/transfers", walletHandler.CreateWalletTransfer).Methods(http.MethodPost, http.MethodOptions)

	router.HandleFunc("/transactions", transactionHandler.GetTransactionList).Methods(http.MethodGet)
	router.HandleFunc("/transactions/statistics", transactionHandler.GetTransactionStatistics).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}", transactionHandler.GetTransactionById).Methods(http.MethodGet)
	router.HandleFunc("/transactions/{transactionId}", transactionHandler.UpdateTransactionById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions/{transactionId}", transactionHandler.DeleteTransactionById).Methods(http.MethodDelete)
	router.HandleFunc("/transactions/{transactionId}/pay", transactionHandler.PayTransaction).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/transactions", transactionHandler.CreateTransaction).Methods(http.MethodPost, http.MethodOptions)

	router.HandleFunc("/products", productHandler.GetProductList).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}", productHandler.GetProductById).Methods(http.MethodGet)
	router.HandleFunc("/products/{productId}", productHandler.DeleteProductById).Methods(http.MethodDelete)
	router.HandleFunc("/products/{productId}", productHandler.UpdateProductById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/products", productHandler.CreateProduct).Methods(http.MethodPost, http.MethodOptions)

	router.HandleFunc("/materials", materialHandler.GetMaterialList).Methods(http.MethodGet)
	router.HandleFunc("/materials/{materialId}", materialHandler.GetMaterialById).Methods(http.MethodGet)
	router.HandleFunc("/materials/{materialId}", materialHandler.DeleteMaterialById).Methods(http.MethodDelete)
	router.HandleFunc("/materials/{materialId}", materialHandler.UpdateMaterialById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/materials", materialHandler.CreateMaterial).Methods(http.MethodPost, http.MethodOptions)

	router.HandleFunc("/expenses", expenseHandler.GetExpenseList).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", expenseHandler.GetExpenseById).Methods(http.MethodGet)
	router.HandleFunc("/expenses/{expenseId}", expenseHandler.UpdateExpenseById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/expenses/{expenseId}", expenseHandler.DeleteExpenseById).Methods(http.MethodDelete)
	router.HandleFunc("/expenses", expenseHandler.CreateExpense).Methods(http.MethodPost, http.MethodOptions)

	router.HandleFunc("/categories", utils.CheckAuth(categoryHandler.GetCategoryList)).Methods(http.MethodGet)
	router.HandleFunc("/categories/{categoryId}", categoryHandler.GetCategoryById).Methods(http.MethodGet)
	router.HandleFunc("/categories/{categoryId}", categoryHandler.DeleteCategoryById).Methods(http.MethodDelete)
	router.HandleFunc("/categories/{categoryId}", categoryHandler.UpdateCategoryById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/categories", categoryHandler.CreateCategory).Methods(http.MethodPost, http.MethodOptions)

	router.HandleFunc("/budgets", budgetHandler.GetBudgetList).Methods(http.MethodGet)
	router.HandleFunc("/budgets/{budgetId}", budgetHandler.GetBudgetById).Methods(http.MethodGet)
	router.HandleFunc("/budgets/{budgetId}", budgetHandler.DeleteBudgetById).Methods(http.MethodDelete)
	router.HandleFunc("/budgets/{budgetId}", budgetHandler.UpdateBudgetById).Methods(http.MethodPut, http.MethodOptions)
	router.HandleFunc("/budgets", budgetHandler.CreateBudget).Methods(http.MethodPost, http.MethodOptions)

	router.HandleFunc("/auth/login", authHandler.Login).Methods(http.MethodPost, http.MethodOptions)
}
