package main

import (
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
	restapi.AddRouters(router, db)

	router.HandleFunc("/health-check", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("health check success"))
	})

	http.ListenAndServe(fmt.Sprintf(":%s", env.Port), router)
}
