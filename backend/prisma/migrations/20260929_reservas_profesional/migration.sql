-- AlterTable
ALTER TABLE `reserva` ADD COLUMN `token_publico` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `reserva_config` (
    `id_config` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cola` INTEGER NOT NULL,
    `antelacion_min_min` INTEGER NOT NULL DEFAULT 60,
    `antelacion_max_dias` INTEGER NOT NULL DEFAULT 60,
    `slot_min` INTEGER NOT NULL DEFAULT 30,
    `max_comensales_online` INTEGER NOT NULL DEFAULT 20,
    `max_reservas_por_telefono` INTEGER NOT NULL DEFAULT 3,
    `modificacion_limite_horas` INTEGER NOT NULL DEFAULT 2,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reserva_config_id_cola_key`(`id_cola`),
    PRIMARY KEY (`id_config`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `reserva_token_publico_key` ON `reserva`(`token_publico`);

-- AddForeignKey
ALTER TABLE `reserva_config` ADD CONSTRAINT `reserva_config_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE CASCADE ON UPDATE CASCADE;
