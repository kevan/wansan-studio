-- Basic Users Table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active'
);

INSERT INTO users (username, email) VALUES 
('alice', 'alice@example.com'),
('bob', 'bob@example.com');

-- Large Orders Table
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    amount DECIMAL(10, 2),
    order_date TIMESTAMP,
    region VARCHAR(20),
    notes TEXT
);

-- Procedure to generate 100,000 rows (MySQL is slower than PG for inserts, stick to 100k for quick init)
DELIMITER $$
CREATE PROCEDURE GenerateOrders()
BEGIN
    DECLARE i INT DEFAULT 0;
    WHILE i < 100000 DO
        INSERT INTO orders (customer_id, amount, order_date, region, notes)
        VALUES (
            FLOOR(RAND() * 1000),
            ROUND(RAND() * 10000, 2),
            NOW() - INTERVAL FLOOR(RAND() * 365) DAY,
            ELT(FLOOR(1 + RAND() * 4), 'North', 'South', 'East', 'West'),
            MD5(RAND())
        );
        SET i = i + 1;
    END WHILE;
END$$

CREATE PROCEDURE CreateMassiveTables()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE t_name VARCHAR(64);
    
    WHILE i <= 100 DO
        SET t_name = CONCAT('report_202', (i % 5), '_', LPAD((i % 12 + 1), 2, '0'), '_', i);
        SET @sql = CONCAT('CREATE TABLE ', t_name, ' (id INT PRIMARY KEY, summary TEXT, val DECIMAL(10,2))');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SET i = i + 1;
    END WHILE;
END$$
DELIMITER ;

CALL GenerateOrders();
CALL CreateMassiveTables();
