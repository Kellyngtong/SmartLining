-- CreateTable
CREATE TABLE `resena_enlace` (
    `id_enlace` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cola` INTEGER NOT NULL,
    `nombre` VARCHAR(60) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `resena_enlace_id_cola_orden_idx`(`id_cola`, `orden`),
    PRIMARY KEY (`id_enlace`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `resena_enlace` ADD CONSTRAINT `resena_enlace_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Portar URLs existentes a filas (Google orden 1, TripAdvisor orden 2)
INSERT INTO `resena_enlace` (`id_cola`, `nombre`, `url`, `orden`, `activa`)
SELECT `id_cola`, 'Google', `google_review_url`, 1, true FROM `reserva_config`
WHERE `google_review_url` IS NOT NULL AND `google_review_url` <> '';

INSERT INTO `resena_enlace` (`id_cola`, `nombre`, `url`, `orden`, `activa`)
SELECT `id_cola`, 'TripAdvisor', `tripadvisor_review_url`, 2, true FROM `reserva_config`
WHERE `tripadvisor_review_url` IS NOT NULL AND `tripadvisor_review_url` <> '';

-- AlterTable
ALTER TABLE `reserva_config` DROP COLUMN `google_review_url`,
    DROP COLUMN `tripadvisor_review_url`;
