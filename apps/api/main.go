package main

import (
	budgets_http "apps/api/presentation/http/budgets"
	categories_http "apps/api/presentation/http/categories"
	expenses_http "apps/api/presentation/http/expenses"
	materials_http "apps/api/presentation/http/materials"
	products_http "apps/api/presentation/http/products"
	transactions_http "apps/api/presentation/http/transactions"
	wallets_http "apps/api/presentation/http/wallets"
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
	router.Use(utils.EnableCORS)
	categories_http.AddRouters(router, db)
	materials_http.AddRouters(router, db)
	wallets_http.AddRouters(router, db)
	products_http.AddRouters(router, db)
	budgets_http.AddRouters(router, db)
	transactions_http.AddRouters(router, db)
	expenses_http.AddRouters(router, db)
	http.ListenAndServe(fmt.Sprintf(":%s", env.Port), router)
}
