FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# Ensure the data directory exists and is writable
RUN mkdir -p /app/data && chmod 777 /app/data

CMD ["npm", "run", "dev"]
