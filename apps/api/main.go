package main

import (
	"apps/api/modules/categories"
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

	db, err := gorm.Open(mysql.Open(fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local", dbUsername, dbPassword, dbHost, dbPort, dbName)))
	if err != nil {
		panic("failed to connect database")
	}

	router := mux.NewRouter().StrictSlash(true)

	categoryRepository := categories.NewCategoryRepository(db)
	categoryUsecase := categories.NewCategoryUsecase(categoryRepository)
	categoryHandler := categories.NewCategoryHandler(categoryUsecase)

	router.HandleFunc("/categories", categoryHandler.GetCategoryList).Methods("GET")
	router.HandleFunc("/categories", categoryHandler.CreateCategory).Methods("POST")

	http.ListenAndServe(":8000", router)
}
