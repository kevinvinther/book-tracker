.PHONY: up down build clean certs dev-local install test

up:
	docker compose up --build

build:
	docker compose build

down:
	docker compose down

clean:
	docker compose down -v

certs:
	@which mkcert >/dev/null 2>&1 || (echo "mkcert is not installed. Install it from https://github.com/FiloSottile/mkcert" && exit 1)
	@mkdir -p client/.certs
	mkcert -install
	mkcert -key-file client/.certs/localhost-key.pem -cert-file client/.certs/localhost.pem localhost 127.0.0.1 ::1

dev-local:
	npm run dev

install:
	npm install --prefix server && npm install --prefix client

test:
	npm run test --prefix server
