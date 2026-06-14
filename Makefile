.PHONY: up down build clean dev-local install test

up:
	docker compose up --build

build:
	docker compose build

down:
	docker compose down

clean:
	docker compose down -v

dev-local:
	npm run dev

install:
	npm install --prefix server && npm install --prefix client

test:
	npm run test --prefix server
