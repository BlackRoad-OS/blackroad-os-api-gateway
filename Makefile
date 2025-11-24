.PHONY: run test lint build sig

run:
go run ./cmd/beacon

test:
go test ./...

lint:
golangci-lint run ./...

build:
go build ./cmd/beacon

sig:
go run ./scripts/postbuild.go
