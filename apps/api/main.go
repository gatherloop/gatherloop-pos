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

	db, err := mysql.ConnectDB(mysql.ConnectDBParams{
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

	walletHandler := restapi.NewWalletHandler(walletUsecase)
	transactionHandler := restapi.NewTransactionHandler(transactionUsecase)
	productHandler := restapi.NewProductHandler(productUsecase)
	materialHandler := restapi.NewMaterialHandler(materialUsecase)
	expenseHandler := restapi.NewExpenseHandler(expenseUsecase)
	categoryHandler := restapi.NewCategoryHandler(categoryUsecase)
	budgetHandler := restapi.NewBudgetHandler(budgetUsecase)
	authHandler := restapi.NewAuthHandler(authUsecase)

	restapi.NewAuthRouter(authHandler).AddRouter(router)
	restapi.NewBudgetRouter(budgetHandler).AddRouter(router)
	restapi.NewCategoryRouter(categoryHandler).AddRouter(router)
	restapi.NewExpenseRouter(expenseHandler).AddRouter(router)
	restapi.NewMaterialRouter(materialHandler).AddRouter(router)
	restapi.NewProductRouter(productHandler).AddRouter(router)
	restapi.NewTransactionRouter(transactionHandler).AddRouter(router)
	restapi.NewWalletRouter(walletHandler).AddRouter(router)

	router.HandleFunc("/health-check", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("health check success"))
	})

	http.ListenAndServe(fmt.Sprintf(":%s", env.Port), router)
}
