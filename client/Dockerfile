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

# Certs are volume-mounted from the host at /app/certs/.
# Run `make certs` on the host before starting Docker.
RUN mkdir -p /app/certs

CMD ["npm", "run", "dev:https"]
