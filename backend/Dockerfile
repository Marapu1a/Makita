# Используем официальное Node.js-образ
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файлы package.json и package-lock.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install --omit=dev

# Копируем весь код
COPY . .

# Пробрасываем переменные окружения
ENV NODE_ENV=production

# Указываем порт, который слушает приложение
EXPOSE 5000

# Команда для запуска
CMD ["node", "app.js"]
