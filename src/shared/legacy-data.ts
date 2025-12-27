const legacyDataJson = `{
    "state": {
        "meta": {
            "id": "e9be2c7e-292d-4b79-be19-bf7e86644a70",
            "name": "Untitled Project",
            "version": "1.1.0",
            "created": 1766800248730
        },
        "files": [
            {
                "name": "product_catalog_2025.csv",
                "path": "/Users/edward/Documents/report/product_catalog_2025.csv",
                "tableName": "t_product_catalog_2025",
                "status": "ready",
                "columns": [
                    {
                        "name": "product_id",
                        "safeName": "product_id",
                        "type": "VARCHAR",
                        "sampleValues": [
                            "PROD_001",
                            "PROD_002",
                            "PROD_003"
                        ]
                    },
                    {
                        "name": "product_name",
                        "safeName": "product_name",
                        "type": "VARCHAR",
                        "sampleValues": [
                            "Wansan Enterprise License",
                            "Cloud Connector Pack",
                            "Dedicated Support Plan"
                        ]
                    },
                    {
                        "name": "category",
                        "safeName": "category",
                        "type": "VARCHAR",
                        "sampleValues": [
                            "Software",
                            "Add-on",
                            "Service"
                        ]
                    },
                    {
                        "name": "base_price",
                        "safeName": "base_price",
                        "type": "DOUBLE",
                        "sampleValues": [
                            1499,
                            299,
                            4999
                        ]
                    },
                    {
                        "name": "cost_price",
                        "safeName": "cost_price",
                        "type": "DOUBLE",
                        "sampleValues": [
                            50,
                            10,
                            2000
                        ]
                    }
                ],
                "size": 551,
                "id": "1766800312206_ut77uzw",
                "createdAt": 1766800312206,
                "lastModified": 1766800312206,
                "rowCount": 10
            },
            {
                "name": "sales_transactions_2025.csv",
                "path": "/Users/edward/Documents/report/sales_transactions_2025.csv",
                "tableName": "t_sales_transactions_2025",
                "status": "ready",
                "columns": [
                    {
                        "name": "transaction_id",
                        "safeName": "transaction_id",
                        "type": "VARCHAR",
                        "sampleValues": [
                            "TRX-2025-0081",
                            "TRX-2025-0117",
                            "TRX-2025-0427"
                        ]
                    },
                    {
                        "name": "date",
                        "safeName": "date",
                        "type": "DATE",
                        "sampleValues": [
                            "2025-01-01",
                            "2025-01-02",
                            "2025-01-04"
                        ]
                    },
                    {
                        "name": "product_id",
                        "safeName": "product_id",
                        "type": "VARCHAR",
                        "sampleValues": [
                            "PROD_007",
                            "PROD_010",
                            "PROD_006"
                        ]
                    },
                    {
                        "name": "region",
                        "safeName": "region",
                        "type": "VARCHAR",
                        "sampleValues": [
                            "Europe",
                            "North America",
                            "APAC"
                        ]
                    },
                    {
                        "name": "sales_rep_id",
                        "safeName": "sales_rep_id",
                        "type": "VARCHAR",
                        "sampleValues": [
                            "REP_08",
                            "REP_06",
                            "REP_07"
                        ]
                    },
                    {
                        "name": "quantity",
                        "safeName": "quantity",
                        "type": "INTEGER",
                        "sampleValues": [
                            11,
                            12,
                            5
                        ]
                    },
                    {
                        "name": "discount",
                        "safeName": "discount",
                        "type": "DOUBLE",
                        "sampleValues": [
                            0,
                            0.05,
                            0.1
                        ]
                    }
                ],
                "size": 28707,
                "id": "1766800312357_zigz5aj",
                "createdAt": 1766800312357,
                "lastModified": 1766800312357,
                "rowCount": 500
            }
        ],
        "relations": [
            {
                "fileAId": "1766800312357_zigz5aj",
                "columnA": "product_id",
                "fileBId": "1766800312206_ut77uzw",
                "columnB": "product_id",
                "autoDetected": true,
                "id": "1766800318436_b0dz6hf"
            }
        ],
        "sessions": [
            {
                "id": "ea3d4240-a45f-4e09-95f3-63f548425da7",
                "title": "2025年各区域月度销售趋势分析",
                "createdAt": 1766800261799,
                "lastModified": 1766800337222,
                "messages": [
                    {
                        "id": "f37a2276-28d6-4317-aeed-d5eccf11c7da",
                        "type": "user",
                        "content": "分析2025年各区域的销售趋势",
                        "timestamp": 1766800322320
                    },
                    {
                        "id": "7fd2d6f7-9e00-46ae-b281-19d2abe005b5",
                        "type": "assistant",
                        "content": "本报告展示了2025年各区域（欧洲、北美、亚太等）的月度销售额变化趋势，帮助识别区域销售表现和季节性波动。",
                        "timestamp": 1766800322321,
                        "originalQuery": "分析2025年各区域的销售趋势",
                        "planSql": "WITH monthly_sales AS (\\n    SELECT \\n        t1.\\"region\\",\\n        strftime(t1.\\"date\\", '%Y-%m') AS \\"month\\",\\n        CAST(SUM(t1.\\"quantity\\" * (t2.\\"base_price\\" * (1 - COALESCE(t1.\\"discount\\", 0)))) AS DOUBLE) AS \\"sales_amount\\"\\n    FROM \\n        \\"t_sales_transactions_2025\\" AS t1\\n    LEFT JOIN \\n        \\"t_product_catalog_2025\\" AS t2\\n    ON \\n        t1.\\"product_id\\" = t2.\\"product_id\\"\\n    WHERE \\n        EXTRACT(YEAR FROM t1.\\"date\\") = 2025\\n    GROUP BY \\n        t1.\\"region\\", \\n        strftime(t1.\\"date\\", '%Y-%m')\\n)\\nSELECT \\n    \\"region\\",\\n    \\"month\\",\\n    \\"sales_amount\\"\\nFROM \\n    monthly_sales\\nORDER BY \\n    \\"region\\", \\n    \\"month\\" ASC\\nLIMIT 100",
                        "planReasoning": "使用t_sales_transactions_2025表的date列提取月份，region列作为区域维度，通过quantity、base_price和discount计算销售额，并限定为2025年数据。",
                        "metadata": {
                            "aiLatency": 14833,
                            "dbLatency": 68,
                            "latency": 14901
                        },
                        "widgetId": "7d2e5dbe-cab3-44fa-90b2-c63217976be2"
                    }
                ],
                "dashboard": {
                    "widgets": [
                        {
                            "id": "836ac2f6-b28e-49ae-bf37-5a82752da2b0",
                            "sourceMessageId": "system",
                            "widgetId": "025d03fb-ef7b-42e2-8f6b-b97b4afe865a",
                            "layout": {
                                "i": "836ac2f6-b28e-49ae-bf37-5a82752da2b0",
                                "x": 0,
                                "y": 0,
                                "w": 12,
                                "h": 2
                            },
                            "pageIndex": 0
                        }
                    ],
                    "layoutMode": "a4",
                    "pageCount": 1,
                    "zoom": 80
                }
            },
            {
                "id": "0c394a91-9170-4fd8-a9a1-f4ac2a027914",
                "title": "2025年销量最高的前5个产品分析",
                "createdAt": 1766800372998,
                "lastModified": 1766800419449,
                "messages": [
                    {
                        "id": "34ef6a94-908b-40d6-9869-39f94c2e8695",
                        "type": "user",
                        "content": "找出销量最高的前5个产品",
                        "timestamp": 1766800375191
                    },
                    {
                        "id": "52339a72-2421-47e3-b6cb-1893ac747c6c",
                        "type": "assistant",
                        "content": "基于2025年销售数据，识别出销量最高的前5个产品，包括产品名称、类别和基础价格。",
                        "timestamp": 1766800375192,
                        "originalQuery": "找出销量最高的前5个产品",
                        "planSql": "WITH sales_summary AS (\\n    SELECT \\n        t1.\\"product_id\\",\\n        CAST(SUM(t1.\\"quantity\\") AS BIGINT) AS \\"total_quantity\\"\\n    FROM \\"t_sales_transactions_2025\\" AS t1\\n    GROUP BY t1.\\"product_id\\"\\n),\\nranked_products AS (\\n    SELECT \\n        t2.\\"product_id\\",\\n        t2.\\"product_name\\",\\n        t2.\\"category\\",\\n        t2.\\"base_price\\",\\n        s.\\"total_quantity\\",\\n        ROW_NUMBER() OVER (ORDER BY s.\\"total_quantity\\" DESC) AS \\"rank\\"\\n    FROM sales_summary AS s\\n    LEFT JOIN \\"t_product_catalog_2025\\" AS t2 ON s.\\"product_id\\" = t2.\\"product_id\\"\\n)\\nSELECT \\n    \\"product_id\\",\\n    \\"product_name\\",\\n    \\"category\\",\\n    \\"base_price\\",\\n    \\"total_quantity\\",\\n    \\"rank\\"\\nFROM ranked_products\\nWHERE \\"rank\\" <= 5\\nORDER BY \\"rank\\" ASC\\nLIMIT 100",
                        "planReasoning": "通过连接销售交易表（t_sales_transactions_2025）和产品目录表（t_product_catalog_2025），按产品ID汇总总销量，然后使用ROW_NUMBER()函数排名并筛选前5名。",
                        "metadata": {
                            "aiLatency": 15878,
                            "dbLatency": 68,
                            "latency": 15946
                        },
                        "widgetId": "b7236ee3-5ee9-4ced-885c-568cbd598d3a"
                    },
                    {
                        "id": "01d1210a-97e5-4b44-9bea-c7f51c6502e8",
                        "type": "user",
                        "content": "这些高销量产品在不同区域的销售分布如何？",
                        "timestamp": 1766800394208
                    },
                    {
                        "id": "c662e486-f3fc-412a-9654-d932a47ee63f",
                        "type": "assistant",
                        "content": "分析销量前5的产品在不同区域的销售数量和占比，揭示区域市场偏好。",
                        "timestamp": 1766800394209,
                        "originalQuery": "这些高销量产品在不同区域的销售分布如何？",
                        "planSql": "WITH top_products AS (\\n    SELECT t1.\\"product_id\\",\\n           CAST(SUM(t1.\\"quantity\\") AS BIGINT) AS \\"total_quantity\\"\\n    FROM \\"t_sales_transactions_2025\\" AS t1\\n    GROUP BY t1.\\"product_id\\"\\n    ORDER BY \\"total_quantity\\" DESC\\n    LIMIT 5\\n),\\nregion_sales AS (\\n    SELECT tp.\\"product_id\\",\\n           t2.\\"product_name\\",\\n           t2.\\"category\\",\\n           t1.\\"region\\",\\n           CAST(SUM(t1.\\"quantity\\") AS BIGINT) AS \\"region_quantity\\",\\n           tp.\\"total_quantity\\" AS \\"global_quantity\\"\\n    FROM top_products AS tp\\n    LEFT JOIN \\"t_sales_transactions_2025\\" AS t1 ON tp.\\"product_id\\" = t1.\\"product_id\\"\\n    LEFT JOIN \\"t_product_catalog_2025\\" AS t2 ON tp.\\"product_id\\" = t2.\\"product_id\\"\\n    GROUP BY tp.\\"product_id\\", t2.\\"product_name\\", t2.\\"category\\", t1.\\"region\\", tp.\\"total_quantity\\"\\n)\\nSELECT \\"product_id\\",\\n       \\"product_name\\",\\n       \\"category\\",\\n       \\"region\\",\\n       \\"region_quantity\\",\\n       \\"global_quantity\\",\\n       ROUND(CAST(\\"region_quantity\\" AS DOUBLE) / CAST(\\"global_quantity\\" AS DOUBLE) * 100, 2) AS \\"region_percentage\\"\\nFROM region_sales\\nORDER BY \\"global_quantity\\" DESC, \\"region_quantity\\" DESC\\nLIMIT 100",
                        "planReasoning": "基于前一个查询的销量前5产品，通过左连接t_sales_transactions_2025和t_product_catalog_2025表，按产品和区域分组计算销售数量，并计算区域占比。",
                        "contextRef": {
                            "query": "找出销量最高的前5个产品",
                            "sqlSummary": "WITH sales_summary AS (\\n    SELECT \\n        t1.\\"product_id\\",\\n        CAST(SUM(t1.\\"quantity\\") AS BIGINT) AS \\"total_quantity\\"\\n    FROM \\"t_sales_transactions_2025\\" AS t1\\n    GROUP BY t1.\\"product_id\\"\\n),\\nranked_products AS (\\n    SELECT \\n        t2.\\"product_id\\",\\n        t2.\\"product_name\\",\\n        t2.\\"category\\",\\n        t2.\\"base_price\\",\\n        s.\\"total_quantity\\",\\n        ROW_NUMBER() OVER (ORDER BY s.\\"total_quantity\\" DESC) AS \\"rank\\"\\n    FROM sales_summary AS s\\n    LEFT JOIN \\"t_product_catalog_2025\\" AS t2 ON s.\\"product_id\\" = t2.\\"product_id\\"\\n)\\nSELECT \\n    \\"product_id\\",\\n    \\"product_name\\",\\n    \\"category\\",\\n    \\"base_price\\",\\n    \\"total_quantity\\",\\n    \\"rank\\"\\nFROM ranked_products\\nWHERE \\"rank\\" <= 5\\nORDER BY \\"rank\\" ASC\\nLIMIT 100"
                        },
                        "metadata": {
                            "aiLatency": 18242,
                            "dbLatency": 107,
                            "latency": 18349
                        },
                        "widgetId": "e71849a7-5384-40f1-ab8b-0b9f1f79a02b"
                    }
                ],
                "dashboard": {
                    "widgets": [
                        {
                            "id": "ef3ecf82-e929-4723-b766-f8e79775fceb",
                            "sourceMessageId": "system",
                            "widgetId": "84d0724c-2f23-4809-bac5-7694b6293a13",
                            "layout": {
                                "i": "ef3ecf82-e929-4723-b766-f8e79775fceb",
                                "x": 0,
                                "y": 0,
                                "w": 12,
                                "h": 2
                            },
                            "pageIndex": 0
                        },
                        {
                            "id": "1cea8431-7a54-4b00-91d4-b48fce09092d",
                            "sourceMessageId": "52339a72-2421-47e3-b6cb-1893ac747c6c",
                            "widgetId": "b7236ee3-5ee9-4ced-885c-568cbd598d3a",
                            "layout": {
                                "i": "1cea8431-7a54-4b00-91d4-b48fce09092d",
                                "x": 0,
                                "y": 2,
                                "w": 6,
                                "h": 10
                            },
                            "pageIndex": 0
                        },
                        {
                            "id": "22e7ee92-9367-457c-9106-e47ec0047cda",
                            "sourceMessageId": "c662e486-f3fc-412a-9654-d932a47ee63f",
                            "widgetId": "e71849a7-5384-40f1-ab8b-0b9f1f79a02b",
                            "layout": {
                                "i": "22e7ee92-9367-457c-9106-e47ec0047cda",
                                "x": 6,
                                "y": 2,
                                "w": 6,
                                "h": 10
                            },
                            "pageIndex": 0
                        }
                    ],
                    "layoutMode": "a4",
                    "pageCount": 1,
                    "zoom": 80
                }
            }
        ],
        "activeSessionId": "0c394a91-9170-4fd8-a9a1-f4ac2a027914",
        "activeFileId": "1766800312357_zigz5aj",
        "widgetRegistry": {
            "025d03fb-ef7b-42e2-8f6b-b97b4afe865a": {
                "title": "2025年各区域月度销售趋势分析",
                "content": "2025年各区域月度销售趋势分析",
                "chartType": "text",
                "timestamp": 1766800261799
            },
            "7d2e5dbe-cab3-44fa-90b2-c63217976be2": {
                "title": "2025年各区域月度销售趋势分析",
                "summary": "本报告展示了2025年各区域（欧洲、北美、亚太等）的月度销售额变化趋势，帮助识别区域销售表现和季节性波动。",
                "sql": "WITH monthly_sales AS (\\n    SELECT \\n        t1.\\"region\\",\\n        strftime(t1.\\"date\\", '%Y-%m') AS \\"month\\",\\n        CAST(SUM(t1.\\"quantity\\" * (t2.\\"base_price\\" * (1 - COALESCE(t1.\\"discount\\", 0)))) AS DOUBLE) AS \\"sales_amount\\"\\n    FROM \\n        \\"t_sales_transactions_2025\\" AS t1\\n    LEFT JOIN \\n        \\"t_product_catalog_2025\\" AS t2\\n    ON \\n        t1.\\"product_id\\" = t2.\\"product_id\\"\\n    WHERE \\n        EXTRACT(YEAR FROM t1.\\"date\\") = 2025\\n    GROUP BY \\n        t1.\\"region\\", \\n        strftime(t1.\\"date\\", '%Y-%m')\\n)\\nSELECT \\n    \\"region\\",\\n    \\"month\\",\\n    \\"sales_amount\\"\\nFROM \\n    monthly_sales\\nORDER BY \\n    \\"region\\", \\n    \\"month\\" ASC\\nLIMIT 100",
                "reasoning": "使用t_sales_transactions_2025表的date列提取月份，region列作为区域维度，通过quantity、base_price和discount计算销售额，并限定为2025年数据。",
                "suggestions": [
                    "哪个区域在2025年第四季度增长最快？",
                    "比较各区域的平均订单价值（AOV）差异",
                    "分析不同产品类别在各区域的销售分布"
                ],
                "chartType": "line",
                "chartTitle": "2025年各区域月度销售趋势分析",
                "tableData": [
                    {
                        "region": "APAC",
                        "month": "2025-01",
                        "sales_amount": 147873.3
                    },
                    {
                        "region": "APAC",
                        "month": "2025-02",
                        "sales_amount": 57825.2
                    },
                    {
                        "region": "APAC",
                        "month": "2025-03",
                        "sales_amount": 58851.2
                    },
                    {
                        "region": "APAC",
                        "month": "2025-04",
                        "sales_amount": 72772.5
                    },
                    {
                        "region": "APAC",
                        "month": "2025-05",
                        "sales_amount": 22419.7
                    },
                    {
                        "region": "APAC",
                        "month": "2025-06",
                        "sales_amount": 68239.6
                    },
                    {
                        "region": "APAC",
                        "month": "2025-07",
                        "sales_amount": 144384.25
                    },
                    {
                        "region": "APAC",
                        "month": "2025-08",
                        "sales_amount": 60830.15
                    },
                    {
                        "region": "APAC",
                        "month": "2025-09",
                        "sales_amount": 41254.9
                    },
                    {
                        "region": "APAC",
                        "month": "2025-10",
                        "sales_amount": 80015.3
                    },
                    {
                        "region": "APAC",
                        "month": "2025-11",
                        "sales_amount": 217628.2
                    },
                    {
                        "region": "APAC",
                        "month": "2025-12",
                        "sales_amount": 121082.55
                    },
                    {
                        "region": "Europe",
                        "month": "2025-01",
                        "sales_amount": 90147.65
                    },
                    {
                        "region": "Europe",
                        "month": "2025-02",
                        "sales_amount": 112290.8
                    },
                    {
                        "region": "Europe",
                        "month": "2025-03",
                        "sales_amount": 110133.25
                    },
                    {
                        "region": "Europe",
                        "month": "2025-04",
                        "sales_amount": 303765.3
                    },
                    {
                        "region": "Europe",
                        "month": "2025-05",
                        "sales_amount": 254255.5
                    },
                    {
                        "region": "Europe",
                        "month": "2025-06",
                        "sales_amount": 91388.9
                    },
                    {
                        "region": "Europe",
                        "month": "2025-07",
                        "sales_amount": 141488.65
                    },
                    {
                        "region": "Europe",
                        "month": "2025-08",
                        "sales_amount": 100579.1
                    },
                    {
                        "region": "Europe",
                        "month": "2025-09",
                        "sales_amount": 149209.1
                    },
                    {
                        "region": "Europe",
                        "month": "2025-10",
                        "sales_amount": 97909.2
                    },
                    {
                        "region": "Europe",
                        "month": "2025-11",
                        "sales_amount": 129907.75
                    },
                    {
                        "region": "Europe",
                        "month": "2025-12",
                        "sales_amount": 253779.7
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-01",
                        "sales_amount": 37101
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-02",
                        "sales_amount": 75694
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-03",
                        "sales_amount": 48405.3
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-04",
                        "sales_amount": 6318.25
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-05",
                        "sales_amount": 106143.35
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-06",
                        "sales_amount": 89111.75
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-07",
                        "sales_amount": 9420.6
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-08",
                        "sales_amount": 22522.45
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-09",
                        "sales_amount": 56078
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-10",
                        "sales_amount": 60108.85
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-11",
                        "sales_amount": 73988.05
                    },
                    {
                        "region": "LATAM",
                        "month": "2025-12",
                        "sales_amount": 12081
                    },
                    {
                        "region": "North America",
                        "month": "2025-01",
                        "sales_amount": 81812.9
                    },
                    {
                        "region": "North America",
                        "month": "2025-02",
                        "sales_amount": 233562.25
                    },
                    {
                        "region": "North America",
                        "month": "2025-03",
                        "sales_amount": 299415.4
                    },
                    {
                        "region": "North America",
                        "month": "2025-04",
                        "sales_amount": 163300.3
                    },
                    {
                        "region": "North America",
                        "month": "2025-05",
                        "sales_amount": 317862.3
                    },
                    {
                        "region": "North America",
                        "month": "2025-06",
                        "sales_amount": 98254.55
                    },
                    {
                        "region": "North America",
                        "month": "2025-07",
                        "sales_amount": 287232.05
                    },
                    {
                        "region": "North America",
                        "month": "2025-08",
                        "sales_amount": 480757.3
                    },
                    {
                        "region": "North America",
                        "month": "2025-09",
                        "sales_amount": 322620.1
                    },
                    {
                        "region": "North America",
                        "month": "2025-10",
                        "sales_amount": 174713.7
                    },
                    {
                        "region": "North America",
                        "month": "2025-11",
                        "sales_amount": 135848.85
                    },
                    {
                        "region": "North America",
                        "month": "2025-12",
                        "sales_amount": 343076.35
                    }
                ],
                "columnFields": [
                    {
                        "name": "region",
                        "type": "VARCHAR"
                    },
                    {
                        "name": "month",
                        "type": "VARCHAR"
                    },
                    {
                        "name": "sales_amount",
                        "type": "DOUBLE"
                    }
                ],
                "vizConfig": {
                    "x_axis": "month",
                    "y_axis": "sales_amount",
                    "series_name": "销售额"
                },
                "is_template": false,
                "insights": [

                ]
            },
            "a5a40318-b7b4-4c1c-a9d8-7ca521eb927a": {
                "title": "New Session",
                "content": "New Session",
                "chartType": "text",
                "timestamp": 1766800339993
            },
            "84d0724c-2f23-4809-bac5-7694b6293a13": {
                "title": "2025年销量最高的前5个产品分析",
                "content": "2025年销量最高的前5个产品分析",
                "chartType": "text",
                "timestamp": 1766800372998
            },
            "b7236ee3-5ee9-4ced-885c-568cbd598d3a": {
                "title": "2025年销量最高的前5个产品分析",
                "summary": "基于2025年销售数据，识别出销量最高的前5个产品，包括产品名称、类别和基础价格。",
                "sql": "WITH sales_summary AS (\\n    SELECT \\n        t1.\\"product_id\\",\\n        CAST(SUM(t1.\\"quantity\\") AS BIGINT) AS \\"total_quantity\\"\\n    FROM \\"t_sales_transactions_2025\\" AS t1\\n    GROUP BY t1.\\"product_id\\"\\n),\\nranked_products AS (\\n    SELECT \\n        t2.\\"product_id\\",\\n        t2.\\"product_name\\",\\n        t2.\\"category\\",\\n        t2.\\"base_price\\",\\n        s.\\"total_quantity\\",\\n        ROW_NUMBER() OVER (ORDER BY s.\\"total_quantity\\" DESC) AS \\"rank\\"\\n    FROM sales_summary AS s\\n    LEFT JOIN \\"t_product_catalog_2025\\" AS t2 ON s.\\"product_id\\" = t2.\\"product_id\\"\\n)\\nSELECT \\n    \\"product_id\\",\\n    \\"product_name\\",\\n    \\"category\\",\\n    \\"base_price\\",\\n    \\"total_quantity\\",\\n    \\"rank\\"\\nFROM ranked_products\\nWHERE \\"rank\\" <= 5\\nORDER BY \\"rank\\" ASC\\nLIMIT 100",
                "reasoning": "通过连接销售交易表（t_sales_transactions_2025）和产品目录表（t_product_catalog_2025），按产品ID汇总总销量，然后使用ROW_NUMBER()函数排名并筛选前5名。",
                "suggestions": [
                    "这5个产品的平均折扣率是多少？",
                    "这些高销量产品在不同区域的销售分布如何？",
                    "这些产品的总销售额和利润率分别是多少？"
                ],
                "chartType": "bar",
                "chartTitle": "2025年销量最高的前5个产品分析",
                "tableData": [
                    {
                        "product_id": "PROD_001",
                        "product_name": "Wansan Enterprise License",
                        "category": "Software",
                        "base_price": 1499,
                        "total_quantity": 619,
                        "rank": 1
                    },
                    {
                        "product_id": "PROD_007",
                        "product_name": "Legacy System Bridge",
                        "category": "Add-on",
                        "base_price": 599,
                        "total_quantity": 564,
                        "rank": 2
                    },
                    {
                        "product_id": "PROD_008",
                        "product_name": "AI Token Pack (1M)",
                        "category": "Consumable",
                        "base_price": 99,
                        "total_quantity": 557,
                        "rank": 3
                    },
                    {
                        "product_id": "PROD_003",
                        "product_name": "Dedicated Support Plan",
                        "category": "Service",
                        "base_price": 4999,
                        "total_quantity": 544,
                        "rank": 4
                    },
                    {
                        "product_id": "PROD_010",
                        "product_name": "Training Workshop",
                        "category": "Service",
                        "base_price": 1500,
                        "total_quantity": 525,
                        "rank": 5
                    }
                ],
                "columnFields": [
                    {
                        "name": "product_id",
                        "type": "VARCHAR"
                    },
                    {
                        "name": "product_name",
                        "type": "VARCHAR"
                    },
                    {
                        "name": "category",
                        "type": "VARCHAR"
                    },
                    {
                        "name": "base_price",
                        "type": "DOUBLE"
                    },
                    {
                        "name": "total_quantity",
                        "type": "INTEGER"
                    },
                    {
                        "name": "rank",
                        "type": "INTEGER"
                    }
                ],
                "vizConfig": {
                    "x_axis": "product_name",
                    "y_axis": "total_quantity",
                    "series_name": "销量"
                },
                "is_template": false,
                "insights": [

                ],
                "timestamp": 1766800375192
            },
            "e71849a7-5384-40f1-ab8b-0b9f1f79a02b": {
                "title": "高销量产品区域销售分布分析",
                "summary": "分析销量前5的产品在不同区域的销售数量和占比，揭示区域市场偏好。",
                "sql": "WITH top_products AS (\\n    SELECT t1.\\"product_id\\",\\n           CAST(SUM(t1.\\"quantity\\") AS BIGINT) AS \\"total_quantity\\"\\n    FROM \\"t_sales_transactions_2025\\" AS t1\\n    GROUP BY t1.\\"product_id\\"\\n    ORDER BY \\"total_quantity\\" DESC\\n    LIMIT 5\\n),\\nregion_sales AS (\\n    SELECT tp.\\"product_id\\",\\n           t2.\\"product_name\\",\\n           t2.\\"category\\",\\n           t1.\\"region\\",\\n           CAST(SUM(t1.\\"quantity\\") AS BIGINT) AS \\"region_quantity\\",\\n           tp.\\"total_quantity\\" AS \\"global_quantity\\"\\n    FROM top_products AS tp\\n    LEFT JOIN \\"t_sales_transactions_2025\\" AS t1 ON tp.\\"product_id\\" = t1.\\"product_id\\"\\n    LEFT JOIN \\"t_product_catalog_2025\\" AS t2 ON tp.\\"product_id\\" = t2.\\"product_id\\"\\n    GROUP BY tp.\\"product_id\\", t2.\\"product_name\\", t2.\\"category\\", t1.\\"region\\", tp.\\"total_quantity\\"\\n)\\nSELECT \\"product_id\\",\\n       \\"product_name\\",\\n       \\"category\\",\\n       \\"region\\",\\n       \\"region_quantity\\",\\n       \\"global_quantity\\",\\n       ROUND(CAST(\\"region_quantity\\" AS DOUBLE) / CAST(\\"global_quantity\\" AS DOUBLE) * 100, 2) AS \\"region_percentage\\"\\nFROM region_sales\\nORDER BY \\"global_quantity\\" DESC, \\"region_quantity\\" DESC\\nLIMIT 100",
                "reasoning": "基于前一个查询的销量前5产品，通过左连接t_sales_transactions_2025和t_product_catalog_2025表，按产品和区域分组计算销售数量，并计算区域占比。",
                "suggestions": [
                    "哪个区域对高销量产品的贡献最大？",
                    "高销量产品在不同区域的折扣策略有何差异？",
                    "区域销售分布与产品类别有何关联？"
                ],
                "chartType": "bar",
                "chartTitle": "高销量产品区域销售分布分析",
                "tableData": [
                    {
                        "product_id": "PROD_001",
                        "product_name": "Wansan Enterprise License",
                        "category": "Software",
                        "region": "North America",
                        "region_quantity": 240,
                        "global_quantity": 619,
                        "region_percentage": 38.77
                    },
                    {
                        "product_id": "PROD_001",
                        "product_name": "Wansan Enterprise License",
                        "category": "Software",
                        "region": "Europe",
                        "region_quantity": 215,
                        "global_quantity": 619,
                        "region_percentage": 34.73
                    },
                    {
                        "product_id": "PROD_001",
                        "product_name": "Wansan Enterprise License",
                        "category": "Software",
                        "region": "APAC",
                        "region_quantity": 99,
                        "global_quantity": 619,
                        "region_percentage": 15.99
                    },
                    {
                        "product_id": "PROD_001",
                        "product_name": "Wansan Enterprise License",
                        "category": "Software",
                        "region": "LATAM",
                        "region_quantity": 65,
                        "global_quantity": 619,
                        "region_percentage": 10.5
                    },
                    {
                        "product_id": "PROD_007",
                        "product_name": "Legacy System Bridge",
                        "category": "Add-on",
                        "region": "North America",
                        "region_quantity": 224,
                        "global_quantity": 564,
                        "region_percentage": 39.72
                    },
                    {
                        "product_id": "PROD_007",
                        "product_name": "Legacy System Bridge",
                        "category": "Add-on",
                        "region": "APAC",
                        "region_quantity": 166,
                        "global_quantity": 564,
                        "region_percentage": 29.43
                    },
                    {
                        "product_id": "PROD_007",
                        "product_name": "Legacy System Bridge",
                        "category": "Add-on",
                        "region": "Europe",
                        "region_quantity": 139,
                        "global_quantity": 564,
                        "region_percentage": 24.65
                    },
                    {
                        "product_id": "PROD_007",
                        "product_name": "Legacy System Bridge",
                        "category": "Add-on",
                        "region": "LATAM",
                        "region_quantity": 35,
                        "global_quantity": 564,
                        "region_percentage": 6.21
                    },
                    {
                        "product_id": "PROD_008",
                        "product_name": "AI Token Pack (1M)",
                        "category": "Consumable",
                        "region": "North America",
                        "region_quantity": 190,
                        "global_quantity": 557,
                        "region_percentage": 34.11
                    },
                    {
                        "product_id": "PROD_008",
                        "product_name": "AI Token Pack (1M)",
                        "category": "Consumable",
                        "region": "APAC",
                        "region_quantity": 139,
                        "global_quantity": 557,
                        "region_percentage": 24.96
                    },
                    {
                        "product_id": "PROD_008",
                        "product_name": "AI Token Pack (1M)",
                        "category": "Consumable",
                        "region": "Europe",
                        "region_quantity": 130,
                        "global_quantity": 557,
                        "region_percentage": 23.34
                    },
                    {
                        "product_id": "PROD_008",
                        "product_name": "AI Token Pack (1M)",
                        "category": "Consumable",
                        "region": "LATAM",
                        "region_quantity": 98,
                        "global_quantity": 557,
                        "region_percentage": 17.59
                    },
                    {
                        "product_id": "PROD_003",
                        "product_name": "Dedicated Support Plan",
                        "category": "Service",
                        "region": "North America",
                        "region_quantity": 262,
                        "global_quantity": 544,
                        "region_percentage": 48.16
                    },
                    {
                        "product_id": "PROD_003",
                        "product_name": "Dedicated Support Plan",
                        "category": "Service",
                        "region": "Europe",
                        "region_quantity": 143,
                        "global_quantity": 544,
                        "region_percentage": 26.29
                    },
                    {
                        "product_id": "PROD_003",
                        "product_name": "Dedicated Support Plan",
                        "category": "Service",
                        "region": "APAC",
                        "region_quantity": 95,
                        "global_quantity": 544,
                        "region_percentage": 17.46
                    },
                    {
                        "product_id": "PROD_003",
                        "product_name": "Dedicated Support Plan",
                        "category": "Service",
                        "region": "LATAM",
                        "region_quantity": 44,
                        "global_quantity": 544,
                        "region_percentage": 8.09
                    },
                    {
                        "product_id": "PROD_010",
                        "product_name": "Training Workshop",
                        "category": "Service",
                        "region": "North America",
                        "region_quantity": 208,
                        "global_quantity": 525,
                        "region_percentage": 39.62
                    },
                    {
                        "product_id": "PROD_010",
                        "product_name": "Training Workshop",
                        "category": "Service",
                        "region": "Europe",
                        "region_quantity": 194,
                        "global_quantity": 525,
                        "region_percentage": 36.95
                    },
                    {
                        "product_id": "PROD_010",
                        "product_name": "Training Workshop",
                        "category": "Service",
                        "region": "LATAM",
                        "region_quantity": 84,
                        "global_quantity": 525,
                        "region_percentage": 16
                    },
                    {
                        "product_id": "PROD_010",
                        "product_name": "Training Workshop",
                        "category": "Service",
                        "region": "APAC",
                        "region_quantity": 39,
                        "global_quantity": 525,
                        "region_percentage": 7.43
                    }
                ],
                "columnFields": [
                    {
                        "name": "product_id",
                        "type": "VARCHAR"
                    },
                    {
                        "name": "product_name",
                        "type": "VARCHAR"
                    },
                    {
                        "name": "category",
                        "type": "VARCHAR"
                    },
                    {
                        "name": "region",
                        "type": "VARCHAR"
                    },
                    {
                        "name": "region_quantity",
                        "type": "INTEGER"
                    },
                    {
                        "name": "global_quantity",
                        "type": "INTEGER"
                    },
                    {
                        "name": "region_percentage",
                        "type": "DOUBLE"
                    }
                ],
                "vizConfig": {
                    "x_axis": "product_name",
                    "y_axis": "region_quantity",
                    "series_name": "区域销售分布"
                },
                "is_template": false,
                "insights": [

                ],
                "timestamp": 1766800394209
            }
        },
        "suggestedPrompts": [
            "分析2025年各区域的销售趋势",
            "找出销量最高的前5个产品",
            "计算不同产品类别的平均利润率",
            "比较各销售代表的折扣使用情况"
        ]
    },
    "version": 0
}`

const legacyData = JSON.parse(legacyDataJson)
export default legacyData
