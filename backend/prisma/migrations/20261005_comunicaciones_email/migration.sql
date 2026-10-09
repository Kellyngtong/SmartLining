-- AlterTable
ALTER TABLE `reserva` ADD COLUMN `recordatorio_enviado_at` DATETIME(3) NULL,
    ADD COLUMN `review_enviado_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `reserva_config` ADD COLUMN `google_review_url` VARCHAR(500) NULL,
    ADD COLUMN `marca_color` VARCHAR(20) NULL,
    ADD COLUMN `marca_logo_url` VARCHAR(500) NULL,
    ADD COLUMN `marca_nombre` VARCHAR(150) NULL,
    ADD COLUMN `notif_cambio` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notif_cancelacion` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notif_confirmada` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notif_creada` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notif_recordatorio` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `notif_review` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `recordatorio_horas_antelacion` INTEGER NOT NULL DEFAULT 24,
    ADD COLUMN `review_retardo_horas` INTEGER NOT NULL DEFAULT 2;

-- CreateTable
CREATE TABLE `email_log` (
    `id_email` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cola` INTEGER NOT NULL,
    `destinatario` VARCHAR(150) NOT NULL,
    `plantilla` VARCHAR(60) NOT NULL,
    `asunto` VARCHAR(200) NOT NULL,
    `estado` VARCHAR(20) NOT NULL,
    `error` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_log_id_cola_created_at_idx`(`id_cola`, `created_at`),
    PRIMARY KEY (`id_email`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `email_log` ADD CONSTRAINT `email_log_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE CASCADE ON UPDATE CASCADE;
