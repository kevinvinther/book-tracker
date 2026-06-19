## 1. CLI setup target

- [x] 1.1 Add `client/.certs/` to `.gitignore`
- [x] 1.2 Add `make certs` target to `Makefile` that checks for `mkcert`, runs `mkcert -install`, and generates `localhost.pem` + `localhost-key.pem` into `client/.certs/`

## 2. Vite config update

- [x] 2.1 Update `client/vite.config.ts` to check for `mkcert` certs at `.certs/` (local) and `/app/certs/` (Docker) before falling back to `@vitejs/plugin-basic-ssl`
- [x] 2.2 Add `console.warn` hint to run `make certs` when falling back to self-signed certs

## 3. Docker changes

- [x] 3.1 Remove `openssl` cert generation step from the `dev-https` stage in `client/Dockerfile`
- [x] 3.2 Add volume mount `./client/.certs:/app/certs:ro` to the client service in `docker-compose.yml`
