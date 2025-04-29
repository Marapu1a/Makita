# Базовый образ Node.js на Alpine
FROM node:18-alpine

# Рабочая директория
WORKDIR /app

# Копируем зависимости и устанавливаем их
COPY package*.json ./
RUN npm install

# Устанавливаем Python, pip, pg_dump и Python-библиотеки
RUN apk add --no-cache \
    python3 \
    py3-pip \
    postgresql-client && \
    pip3 install --break-system-packages \
    pandas \
    openpyxl \
    psycopg2-binary

# Копируем остальной код
COPY . .

# Команда запуска
CMD ["node", "app.js"]
