/*
  Warnings:

  - Added the required column `nombre` to the `cliente` table without a default value. This is not possible if the table is not empty.

*/
ALTER TABLE `atencion` DROP FOREIGN KEY `atencion_ibfk_1`;

ALTER TABLE `atencion` DROP FOREIGN KEY `atencion_ibfk_2`;

ALTER TABLE `cola_evento` DROP FOREIGN KEY `cola_evento_ibfk_1`;

ALTER TABLE `cola_evento` DROP FOREIGN KEY `cola_evento_ibfk_2`;

ALTER TABLE `horario_cola` DROP FOREIGN KEY `horario_cola_ibfk_1`;

ALTER TABLE `turno` DROP FOREIGN KEY `turno_ibfk_1`;

ALTER TABLE `turno` DROP FOREIGN KEY `turno_ibfk_2`;

ALTER TABLE `valoracion` DROP FOREIGN KEY `valoracion_ibfk_1`;

DROP INDEX `id_empleado` ON `atencion`;

DROP INDEX `id_evento` ON `cola_evento`;

DROP INDEX `id_cola` ON `horario_cola`;

DROP INDEX `id_cliente` ON `turno`;

DROP INDEX `id_cola` ON `turno`;

-- AlterTable: add columna as nullable so we can backfill existing rows
ALTER TABLE `cliente` ADD COLUMN `nombre` VARCHAR(100);

-- Backfill existing rows with a placeholder (or you can set a meaningful name)
UPDATE `cliente` SET `nombre` = CONCAT('Cliente ', id_cliente) WHERE `nombre` IS NULL;

-- Make the column required after backfill
ALTER TABLE `cliente` MODIFY `nombre` VARCHAR(100) NOT NULL;

ALTER TABLE `horario_cola` ADD CONSTRAINT `horario_cola_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `turno` ADD CONSTRAINT `turno_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `turno` ADD CONSTRAINT `turno_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `cliente`(`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `atencion` ADD CONSTRAINT `atencion_id_turno_fkey` FOREIGN KEY (`id_turno`) REFERENCES `turno`(`id_turno`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `atencion` ADD CONSTRAINT `atencion_id_empleado_fkey` FOREIGN KEY (`id_empleado`) REFERENCES `usuario`(`id_usuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `valoracion` ADD CONSTRAINT `valoracion_id_turno_fkey` FOREIGN KEY (`id_turno`) REFERENCES `turno`(`id_turno`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `cola_evento` ADD CONSTRAINT `cola_evento_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `cola_evento` ADD CONSTRAINT `cola_evento_id_evento_fkey` FOREIGN KEY (`id_evento`) REFERENCES `evento`(`id_evento`) ON DELETE CASCADE ON UPDATE CASCADE;
