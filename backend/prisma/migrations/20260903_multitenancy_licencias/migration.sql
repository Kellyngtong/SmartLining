-- CreateTable: empresa (tenant)
CREATE TABLE `empresa` (
    `id_empresa` INT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `licencia` ENUM('RESTAURANTE', 'GENERAL') NOT NULL DEFAULT 'GENERAL',
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id_empresa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: usuario - add licencia
ALTER TABLE `usuario` ADD COLUMN `licencia` ENUM('RESTAURANTE', 'GENERAL') NOT NULL DEFAULT 'GENERAL';

-- AlterTable: usuario - add id_empresa (nullable temporalmente)
ALTER TABLE `usuario` ADD COLUMN `id_empresa` INT NULL;

-- AlterTable: cola - add id_empresa (nullable temporalmente)
ALTER TABLE `cola` ADD COLUMN `id_empresa` INT NULL;

-- AlterTable: turno - add peticion_especial
ALTER TABLE `turno` ADD COLUMN `peticion_especial` TEXT NULL;

-- Seed: crear empresas por licencia de usuarios existentes
INSERT INTO `empresa` (nombre, licencia) VALUES ('Empresa General SmartLining', 'GENERAL');
INSERT INTO `empresa` (nombre, licencia) VALUES ('Restaurante El Cordero', 'RESTAURANTE');

-- Asignar usuarios generales (id 1,2 del seed original) a empresa 1
UPDATE `usuario` SET `id_empresa` = 1, `licencia` = 'GENERAL' WHERE `email` IN ('admin@smartlining.com', 'empleado1@smartlining.com');

-- Asignar usuarios restaurante (id 3,4,5) a empresa 2
UPDATE `usuario` SET `id_empresa` = 2, `licencia` = 'RESTAURANTE' WHERE `email` IN ('admin.restaurante@smartlining.com', 'camarero1@smartlining.com', 'camarero2@smartlining.com');

-- Asignar cualquier usuario restante sin empresa a la empresa general
UPDATE `usuario` SET `id_empresa` = 1 WHERE `id_empresa` IS NULL;

-- Asignar colas generales (1-6) a empresa 1
UPDATE `cola` SET `id_empresa` = 1 WHERE `tipo` = 'GENERICA' OR `id_empresa` IS NULL;

-- Asignar cola restaurante (7) a empresa 2
UPDATE `cola` SET `id_empresa` = 2 WHERE `tipo` = 'RESTAURANTE';

-- Convertir id_empresa a NOT NULL
ALTER TABLE `usuario` MODIFY COLUMN `id_empresa` INT NOT NULL;
ALTER TABLE `cola` MODIFY COLUMN `id_empresa` INT NOT NULL;

-- AddForeignKey: usuario -> empresa
ALTER TABLE `usuario` ADD CONSTRAINT `usuario_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `empresa`(`id_empresa`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: cola -> empresa
ALTER TABLE `cola` ADD CONSTRAINT `cola_id_empresa_fkey` FOREIGN KEY (`id_empresa`) REFERENCES `empresa`(`id_empresa`) ON DELETE RESTRICT ON UPDATE CASCADE;
