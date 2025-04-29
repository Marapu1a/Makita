# Этап сборки
FROM node:18 AS builder
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Этап запуска
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
