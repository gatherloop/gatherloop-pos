package restapi

import (
	"apps/api/utils"
	"fmt"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

func EnableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "*")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		} else {
			next.ServeHTTP(w, r)
		}
	})
}

func CheckAuth(next http.HandlerFunc) http.HandlerFunc {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		authorizationToken := ""

		cookie, err := r.Cookie("Authorization")
		if err != nil {
			authorizationToken = r.Header.Get("Authorization")
		} else {
			authorizationToken = cookie.Value
		}

		tokenSplit := strings.Split(authorizationToken, " ")

		tokenString := ""
		if len(tokenSplit) > 1 {
			tokenString = tokenSplit[1]
		}

		_, err = jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return []byte(utils.GetEnv().JwtSecret), nil
		})

		if err != nil {
			w.Write([]byte("authentication error"))
			return
		}

		next.ServeHTTP(w, r)
	})
}
