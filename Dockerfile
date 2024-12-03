# Build stage
FROM node:18 AS builder

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    gcc \
    g++

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build
RUN cp -r public dist/
RUN ls -la dist/
FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 \
    make \
    gcc \
    g++ \
    curl

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/dist/ ./dist/
RUN ls -la dist/

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["npm", "run", "start:prod"]