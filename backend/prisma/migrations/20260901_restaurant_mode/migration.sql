-- AlterTable: add tipo column to cola
ALTER TABLE `cola` ADD COLUMN `tipo` VARCHAR(30) NOT NULL DEFAULT 'GENERICA';

-- AlterTable: add restaurant fields to turno
ALTER TABLE `turno` ADD COLUMN `num_comensales` INT NULL;
ALTER TABLE `turno` ADD COLUMN `categoria` VARCHAR(30) NULL;
ALTER TABLE `turno` ADD COLUMN `mesa_id` INT NULL;
ALTER TABLE `turno` ADD UNIQUE INDEX `turno_mesa_id_key`(`mesa_id`);

-- CreateTable: mesa
CREATE TABLE `mesa` (
    `id_mesa` INT NOT NULL AUTO_INCREMENT,
    `numero` INT NOT NULL,
    `capacidad` INT NOT NULL,
    `estado` VARCHAR(20) NOT NULL DEFAULT 'LIBRE',
    `id_cola` INT NOT NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_actualizacion` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mesa_id_cola_numero_key`(`id_cola`, `numero`),
    PRIMARY KEY (`id_mesa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: turno -> mesa
ALTER TABLE `turno` ADD CONSTRAINT `turno_mesa_id_fkey` FOREIGN KEY (`mesa_id`) REFERENCES `mesa`(`id_mesa`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: mesa -> cola
ALTER TABLE `mesa` ADD CONSTRAINT `mesa_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE RESTRICT ON UPDATE CASCADE;