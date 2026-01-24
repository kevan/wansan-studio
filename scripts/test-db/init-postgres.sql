-- Create Users table with BIGINT ID
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    "注册时间" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    preferences JSONB
);

-- Create Sales table with DECIMAL
CREATE TABLE sales (
    sale_id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(user_id),
    "金额" DECIMAL(18, 4),
    "region" VARCHAR(50),
    "tags" VARCHAR[]
);

-- Insert Sample Data
INSERT INTO users (user_id, username, email, is_active, preferences) VALUES
(9007199254740993, 'Edward', 'edward@example.com', true, '{"theme": "dark", "lang": "zh"}'),
(9007199254740994, 'Alice', 'alice@example.com', true, '{"theme": "light", "lang": "en"}'),
(1003, 'Bob', 'bob@example.com', false, '{"theme": "dark"}');

INSERT INTO sales (user_id, "金额", "region", "tags") VALUES
(9007199254740993, 1250.50, 'East', ARRAY['new_customer', 'promo']),
(9007199254740994, 3400.00, 'West', ARRAY['returning']),
(1003, 150.75, 'South', ARRAY['discount']);
