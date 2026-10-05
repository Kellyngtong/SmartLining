-- CreateTable
CREATE TABLE `actividad_log` (
    `id_actividad` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cola` INTEGER NOT NULL,
    `tipo` VARCHAR(30) NOT NULL,
    `descripcion` VARCHAR(280) NOT NULL,
    `id_mesa` INTEGER NULL,
    `id_turno` INTEGER NULL,
    `id_reserva` INTEGER NULL,
    `id_waitlist` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `actividad_log_id_cola_created_at_idx`(`id_cola`, `created_at`),
    PRIMARY KEY (`id_actividad`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `actividad_log` ADD CONSTRAINT `actividad_log_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE CASCADE ON UPDATE CASCADE;
