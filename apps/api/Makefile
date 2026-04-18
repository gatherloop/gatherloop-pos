# Makefile for gatherloop-pos API
# Usage: make <target>

include .env
export

DB_URL ?= mysql://$(DB_USERNAME):$(DB_PASSWORD)@tcp($(DB_HOST):$(DB_PORT))/$(DB_NAME)
MIGRATIONS_DIR ?= migrations

.PHONY: migrate-up migrate-down migrate-create migrate-version dev build build-migrate build-seed migrate seed test

## migrate-up: Run all pending migrations (via migrate CLI)
migrate-up:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" up

## migrate-down: Rollback the last migration (via migrate CLI)
migrate-down:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" down 1

## migrate-create: Create a new migration (usage: make migrate-create name=add_foo_table)
migrate-create:
	@if [ -z "$(name)" ]; then echo "Usage: make migrate-create name=<migration_name>"; exit 1; fi
	migrate create -ext sql -dir $(MIGRATIONS_DIR) -seq $(name)

## migrate-version: Print current migration version
migrate-version:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" version

## dev: Run the API in development mode
dev:
	go run main.go

## build: Build the API server binary
build:
	go build -o dist/api main.go

## build-migrate: Build the migration binary
build-migrate:
	go build -o dist/migrate cmd/migrate/main.go

## build-seed: Build the seeder binary
build-seed:
	go build -o dist/seed cmd/seed/main.go

## migrate: Run database migrations using the Go binary
migrate:
	go run cmd/migrate/main.go

## seed: Run database seeders using the Go binary
seed:
	go run cmd/seed/main.go

## test: Run all tests
test:
	go test ./...
