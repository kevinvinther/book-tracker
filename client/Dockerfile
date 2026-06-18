FROM node:22-alpine AS dev-http

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]


FROM node:22-alpine AS dev-https

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Generate a self-signed cert for local HTTPS (needed for camera on mobile).
# The cert lives at /app/certs/ so Vite can serve it.
RUN mkdir -p /app/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /app/certs/localhost.key \
      -out /app/certs/localhost.crt \
      -subj "/CN=localhost" \
      -addext "subjectAltName=IP:0.0.0.0"

CMD ["npm", "run", "dev:https"]
