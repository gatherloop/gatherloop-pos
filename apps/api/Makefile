# Makefile for gatherloop-pos API
# Usage: make <target>

include .env
export

DB_URL ?= mysql://$(DB_USERNAME):$(DB_PASSWORD)@tcp($(DB_HOST):$(DB_PORT))/$(DB_NAME)
MIGRATIONS_DIR ?= migrations

.PHONY: migrate-up migrate-down migrate-create migrate-version dev build test

## migrate-up: Run all pending migrations
migrate-up:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" up

## migrate-down: Rollback the last migration
migrate-down:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" down 1

## migrate-create: Create a new migration (usage: make migrate-create name=add_foo_table)
migrate-create:
	@if [ -z "$(name)" ]; then echo "Usage: make migrate-create name=<migration_name>"; exit 1; fi
	migrate create -ext sql -dir $(MIGRATIONS_DIR) -seq $(name)

## migrate-version: Print current migration version
migrate-version:
	migrate -path $(MIGRATIONS_DIR) -database "$(DB_URL)" version

## dev: Run the API in development mode (with hot reload via `go run`)
dev:
	go run main.go

## build: Build the API binary
build:
	go build -o dist/api main.go

## test: Run all tests
test:
	go test ./...
