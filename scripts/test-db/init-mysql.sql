-- 1. 显式设置会话编码
SET NAMES utf8mb4;
SET character_set_client = utf8mb4;

-- 2. 确保数据库级别也是 utf8mb4 (如果已创建则修改)
ALTER DATABASE test_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. 创建表时显式指定编码
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `uuid` CHAR(36) NOT NULL,
    `产品名称` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100),
    `price` DECIMAL(10, 2),
    `库存数量` INT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_logs (
    log_id BIGINT PRIMARY KEY,
    `order_sn` VARCHAR(100),
    `status` VARCHAR(20),
    `raw_payload` TEXT,
    `remark` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 插入数据
INSERT INTO products (`uuid`, `产品名称`, `category`, `price`, `库存数量`) VALUES
('550e8400-e29b-41d4-a716-446655440000', '高性能笔记本', 'Electronics', 8999.00, 50),
('550e8400-e29b-41d4-a716-446655440001', '人体工学椅', 'Furniture', 1200.50, 100),
('550e8400-e29b-41d4-a716-446655440002', '4K显示器', 'Electronics', 2500.00, 30);

INSERT INTO order_logs (log_id, `order_sn`, `status`, `remark`) VALUES
(1, 'ORD20250101001', 'SUCCESS', '用户反馈非常好'),
(2, 'ORD20250101002', 'PENDING', '等待支付中'),
(3, 'ORD20250101003', 'FAILED', '库存不足导致失败');
