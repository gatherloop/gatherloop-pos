package main

import (
	"net/http"
)

func HelloHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("hello world"))
}

func main() {
	http.HandleFunc("/", HelloHandler)
	http.ListenAndServe(":8000", nil)
}
