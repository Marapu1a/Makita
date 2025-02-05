CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

CREATE TABLE parts (
    id SERIAL PRIMARY KEY,
    model_id INT REFERENCES models(id) ON DELETE CASCADE,
    number INT NOT NULL,
    name VARCHAR(255),
    part_number VARCHAR(255) NOT NULL,
    x_coord FLOAT,
    y_coord FLOAT,
    width FLOAT,
    height FLOAT,
    price FLOAT DEFAULT 0,
    availability BOOLEAN DEFAULT TRUE,
    quantity INT DEFAULT 0,
    slide_number INT,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

CREATE TABLE slides (
    id SERIAL PRIMARY KEY,
    model_id INT REFERENCES models(id) ON DELETE CASCADE,
    slide_number INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    image_width FLOAT,
    image_height FLOAT,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);
