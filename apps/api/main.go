package main

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
	"apps/api/presentation/restapi"
	"apps/api/presentation/restapi/handlers"
	"apps/api/presentation/restapi/routers"
	"apps/api/utils"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	err := utils.LoadEnv()
	if err == nil {
		fmt.Println("Loading .env file")
	}

	env := utils.GetEnv()

	db, err := utils.ConnectDB(utils.ConnectDBParams{
		DbUsername: env.DbUsername,
		DbPassword: env.DbPassword,
		DbHost:     env.DbHost,
		DbPort:     env.DbPort,
		DbName:     env.DbName,
	})
	if err != nil {
		panic("failed to connect database")
	}

	router := mux.NewRouter().StrictSlash(true)
	router.Use(restapi.EnableCORS)

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

	walletHandler := handlers.NewWalletHandler(walletUsecase)
	transactionHandler := handlers.NewTransactionHandler(transactionUsecase)
	productHandler := handlers.NewProductHandler(productUsecase)
	materialHandler := handlers.NewMaterialHandler(materialUsecase)
	expenseHandler := handlers.NewExpenseHandler(expenseUsecase)
	categoryHandler := handlers.NewCategoryHandler(categoryUsecase)
	budgetHandler := handlers.NewBudgetHandler(budgetUsecase)
	authHandler := handlers.NewAuthHandler(authUsecase)

	routers.NewAuthRouter(authHandler).AddRouter(router)
	routers.NewBudgetRouter(budgetHandler).AddRouter(router)
	routers.NewCategoryRouter(categoryHandler).AddRouter(router)
	routers.NewExpenseRouter(expenseHandler).AddRouter(router)
	routers.NewMaterialRouter(materialHandler).AddRouter(router)
	routers.NewProductRouter(productHandler).AddRouter(router)
	routers.NewTransactionRouter(transactionHandler).AddRouter(router)
	routers.NewWalletRouter(walletHandler).AddRouter(router)

	router.HandleFunc("/health-check", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("health check success"))
	})

	http.ListenAndServe(fmt.Sprintf(":%s", env.Port), router)
}
