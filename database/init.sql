CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parts (
    id SERIAL PRIMARY KEY,
    model_id INT REFERENCES models(id) ON DELETE CASCADE,
    number INT NOT NULL,
    name VARCHAR(255), -- Разрешаем пустое значение
    part_number VARCHAR(255) NOT NULL UNIQUE, -- Уникальный артикул
    x_coord FLOAT,
    y_coord FLOAT,
    price FLOAT DEFAULT 0, -- Цена по умолчанию 0
    availability BOOLEAN DEFAULT TRUE,
    quantity INT DEFAULT 0,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);
