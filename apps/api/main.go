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
	"fmt"
	"net/http"
	"os"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		panic("Error loading .env file")
	}

	dbUsername := os.Getenv("DB_USERNAME")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	port := os.Getenv("PORT")

	db, err := gorm.Open(mysql.Open(fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", dbUsername, dbPassword, dbHost, dbPort, dbName)))
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
	http.ListenAndServe(fmt.Sprintf(":%s", port), router)
}
