-- CreateTable
CREATE TABLE `dia_cierre` (
    `id_cierre` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cola` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `motivo` VARCHAR(150) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `dia_cierre_id_cola_fecha_key`(`id_cola`, `fecha`),
    PRIMARY KEY (`id_cierre`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dia_cierre` ADD CONSTRAINT `dia_cierre_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE CASCADE ON UPDATE CASCADE;
