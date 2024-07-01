module apps/api

go 1.18

require libs/api-contract v0.0.0-00010101000000-000000000000

require (
	github.com/go-sql-driver/mysql v1.7.0 // indirect
	github.com/gorilla/mux v1.8.1 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/joho/godotenv v1.5.1 // indirect
	gorm.io/driver/mysql v1.5.7 // indirect
	gorm.io/gorm v1.25.10 // indirect
)

replace libs/api-contract => ../../libs/api-contract/src/__generated__/go
