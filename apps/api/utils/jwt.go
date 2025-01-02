package utils

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func CheckAuth(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authorizationHeader := r.Header.Get("Authorization")
		tokenSplit := strings.Split(authorizationHeader, " ")

		tokenString := ""
		if len(tokenSplit) > 1 {
			tokenString = tokenSplit[1]
		}

		_, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte("my_secret_key"), nil
		})

		if err != nil {
			w.Write([]byte("authentication error"))
			return
		}

		next.ServeHTTP(w, r)
	})
}
