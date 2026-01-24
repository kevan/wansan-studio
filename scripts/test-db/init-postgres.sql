-- Create Schemas
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS sales;

-- 1. Standard Table (Small)
CREATE TABLE public.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

INSERT INTO public.users (username, email) VALUES 
('alice', 'alice@example.com'),
('bob', 'bob@example.com'),
('charlie', 'charlie@example.com');

-- 2. Multi-Schema Table (Audit Logs)
CREATE TABLE audit.login_logs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    login_ip VARCHAR(45),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO audit.login_logs (user_id, login_ip) VALUES (1, '192.168.1.1'), (2, '10.0.0.1');

-- 3. Large Table (1 Million Rows) - Sales Orders
CREATE TABLE sales.orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INT,
    amount DECIMAL(10, 2),
    order_date TIMESTAMP,
    region VARCHAR(20),
    notes TEXT
);

-- Generate 1,000,000 rows efficiently
INSERT INTO sales.orders (customer_id, amount, order_date, region, notes)
SELECT 
    (random() * 1000)::INT, 
    (random() * 10000)::DECIMAL(10,2),
    NOW() - (random() * 365 || ' days')::INTERVAL,
    (ARRAY['North', 'South', 'East', 'West'])[floor(random() * 4 + 1)],
    md5(random()::text)
FROM generate_series(1, 1000000);

-- 4. Complex Types Table
CREATE TABLE public.complex_types (
    id SERIAL PRIMARY KEY,
    json_data JSONB,
    tags TEXT[],
    active BOOLEAN
);

INSERT INTO public.complex_types (json_data, tags, active) VALUES 
('{"key": "value"}', ARRAY['tag1', 'tag2'], true);

-- 5. Massive Tables Simulation (Create 100+ tables)
DO $$
DECLARE
    i INT;
    t_name TEXT;
BEGIN
    -- Create 50 Monthly Report tables in public
    FOR i IN 1..50 LOOP
        t_name := 'report_202' || (i % 5) || '_' || lpad((i % 12 + 1)::text, 2, '0') || '_' || i;
        EXECUTE format('CREATE TABLE public.%I (id SERIAL PRIMARY KEY, summary TEXT, val NUMERIC)', t_name);
    END LOOP;

    -- Create 50 Log tables in audit schema
    FOR i IN 1..50 LOOP
        t_name := 'archive_log_' || i;
        EXECUTE format('CREATE TABLE audit.%I (log_id INT, message TEXT)', t_name);
    END LOOP;
END $$;
