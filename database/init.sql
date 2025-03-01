CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    parent_id INT REFERENCES categories(id) ON DELETE SET NULL,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

CREATE TABLE slides (
    id SERIAL PRIMARY KEY,
    model_id INT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    slide_number INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    image_width DOUBLE PRECISION,
    image_height DOUBLE PRECISION,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_model_slide UNIQUE (model_id, slide_number)
);

CREATE TABLE parts (
    id SERIAL PRIMARY KEY,
    model_id INT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    slide_id INT REFERENCES slides(id) ON DELETE SET NULL,
    number INT NOT NULL,
    name VARCHAR(255),
    part_number VARCHAR(255) NOT NULL,
    x_coord DOUBLE PRECISION,
    y_coord DOUBLE PRECISION,
    width DOUBLE PRECISION,
    height DOUBLE PRECISION,
    price DOUBLE PRECISION DEFAULT 0,
    availability BOOLEAN DEFAULT TRUE,
    quantity INT DEFAULT 0,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_model_part UNIQUE (model_id, number)
);

-- Добавляем связи категорий (подкатегории)
ALTER TABLE categories ADD CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL;

-- Добавляем индексы для ускорения запросов
CREATE INDEX idx_models_category_id ON models (category_id);
CREATE INDEX idx_parts_model_id ON parts (model_id);
CREATE INDEX idx_parts_slide_id ON parts (slide_id);
CREATE INDEX idx_slides_model_id ON slides (model_id);
