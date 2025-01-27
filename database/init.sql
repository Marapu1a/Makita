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
    number INT NOT NULL, -- Номер детали на схеме
    name VARCHAR(255), -- Наименование (может быть пустым)
    part_number VARCHAR(255) NOT NULL, -- Артикул (может повторяться)
    x_coord FLOAT, -- Координаты детали на схеме
    y_coord FLOAT,
    width FLOAT, -- Ширина детали
    height FLOAT, -- Высота детали
    price FLOAT DEFAULT 0, -- Цена (по умолчанию 0)
    availability BOOLEAN DEFAULT TRUE, -- Доступность детали
    quantity INT DEFAULT 0, -- Количество на складе
    slide_number INT, -- Номер слайда
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);
