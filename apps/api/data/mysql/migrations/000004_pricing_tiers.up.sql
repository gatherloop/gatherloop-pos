CREATE TABLE IF NOT EXISTS `pricing_tiers` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `variant_id`    BIGINT       NOT NULL,
  `up_to_minutes` INT          NOT NULL,
  `price`         FLOAT        NOT NULL DEFAULT 0,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_variant_up_to` (`variant_id`, `up_to_minutes`),
  KEY `idx_variant_id` (`variant_id`),
  CONSTRAINT `fk_pricing_tiers_variant` FOREIGN KEY (`variant_id`) REFERENCES `variants`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `rentals` ADD COLUMN `pricing_tiers` JSON NULL;

INSERT INTO pricing_tiers (variant_id, up_to_minutes, price)
SELECT v.id, t.up_to_minutes, t.price
FROM variants v
JOIN products p ON p.id = v.product_id
CROSS JOIN (
  SELECT  60 AS up_to_minutes, 15000 AS price UNION ALL
  SELECT  90, 20000  UNION ALL SELECT 120, 30000 UNION ALL
  SELECT 150, 35000  UNION ALL SELECT 180, 45000 UNION ALL
  SELECT 210, 50000  UNION ALL SELECT 240, 60000 UNION ALL
  SELECT 270, 65000  UNION ALL SELECT 300, 75000 UNION ALL
  SELECT 330, 80000  UNION ALL SELECT 360, 90000 UNION ALL
  SELECT 390, 95000  UNION ALL SELECT 420, 105000 UNION ALL
  SELECT 450, 110000 UNION ALL SELECT 480, 120000
) t
WHERE p.sale_type = 'rental';

UPDATE variants v
JOIN products p ON p.id = v.product_id
SET v.price = 0
WHERE p.sale_type = 'rental';

UPDATE rentals
SET pricing_tiers = CAST('[
  {"up_to_minutes":60,"price":15000},
  {"up_to_minutes":90,"price":20000},
  {"up_to_minutes":120,"price":30000},
  {"up_to_minutes":150,"price":35000},
  {"up_to_minutes":180,"price":45000},
  {"up_to_minutes":210,"price":50000},
  {"up_to_minutes":240,"price":60000},
  {"up_to_minutes":270,"price":65000},
  {"up_to_minutes":300,"price":75000},
  {"up_to_minutes":330,"price":80000},
  {"up_to_minutes":360,"price":90000},
  {"up_to_minutes":390,"price":95000},
  {"up_to_minutes":420,"price":105000},
  {"up_to_minutes":450,"price":110000},
  {"up_to_minutes":480,"price":120000}
]' AS JSON);

ALTER TABLE `rentals` MODIFY COLUMN `pricing_tiers` JSON NOT NULL;
