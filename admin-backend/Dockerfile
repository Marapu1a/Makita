# Используем официальный образ Node.js
FROM node:18-alpine

WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install

# Копируем весь код проекта
COPY . .

# Запускаем сервер
CMD ["node", "app.js"]
