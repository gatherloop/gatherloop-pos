package main

import (
	"apps/api/middlewares"
	"apps/api/modules/budgets"
	"apps/api/modules/categories"
	"apps/api/modules/expenses"
	"apps/api/modules/materials"
	"apps/api/modules/products"
	"apps/api/modules/transactions"
	"apps/api/modules/wallets"
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
	router.Use(middlewares.EnableCORS)
	categories.AddRouters(router, db)
	materials.AddRouters(router, db)
	wallets.AddRouters(router, db)
	products.AddRouters(router, db)
	budgets.AddRouters(router, db)
	transactions.AddRouters(router, db)
	expenses.AddRouters(router, db)
	http.ListenAndServe(fmt.Sprintf(":%s", env.Port), router)
}
