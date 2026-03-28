module apps/api

go 1.24.0

toolchain go1.24.7

require libs/api-contract v0.0.0-00010101000000-000000000000

require (
	github.com/DATA-DOG/go-sqlmock v1.5.2 // indirect
	github.com/go-sql-driver/mysql v1.7.0 // indirect
	github.com/golang-jwt/jwt/v5 v5.2.1 // indirect
	github.com/golang-migrate/migrate/v4 v4.19.1 // indirect
	github.com/gorilla/mux v1.8.1 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/joho/godotenv v1.5.1 // indirect
	github.com/rs/cors v1.11.0 // indirect
	github.com/stretchr/testify v1.11.1 // indirect
	go.uber.org/mock v0.6.0 // indirect
	golang.org/x/crypto v0.45.0 // indirect
	gorm.io/driver/mysql v1.5.7 // indirect
	gorm.io/gorm v1.25.10 // indirect
)

replace libs/api-contract => ../../libs/api-contract/src/__generated__/go
