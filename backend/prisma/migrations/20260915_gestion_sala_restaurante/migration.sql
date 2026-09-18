-- DropForeignKey
ALTER TABLE `mesa_grupo_mesa` DROP FOREIGN KEY `mesa_grupo_mesa_id_grupo_fkey`;

-- DropForeignKey
ALTER TABLE `mesa_grupo_mesa` DROP FOREIGN KEY `mesa_grupo_mesa_id_mesa_fkey`;

-- DropIndex
DROP INDEX `mesa_grupo_mesa_id_mesa_fkey` ON `mesa_grupo_mesa`;

-- AlterTable
ALTER TABLE `cliente` ADD COLUMN `cancelaciones` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `email` VARCHAR(150) NULL,
    ADD COLUMN `id_empresa` INTEGER NULL,
    ADD COLUMN `no_shows` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `notas` TEXT NULL,
    ADD COLUMN `preferencias` TEXT NULL,
    ADD COLUMN `telefono` VARCHAR(30) NULL,
    ADD COLUMN `visitas` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `cola` ADD COLUMN `duracion_estimada_comida_min` INTEGER NOT NULL DEFAULT 90;

-- AlterTable
ALTER TABLE `empresa` ALTER COLUMN `licencia` DROP DEFAULT;

-- AlterTable
ALTER TABLE `mesa` ADD COLUMN `activa` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `capacidad_min` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `height` DOUBLE NULL,
    ADD COLUMN `id_zona` INTEGER NULL,
    ADD COLUMN `notas` TEXT NULL,
    ADD COLUMN `rotation` DOUBLE NOT NULL DEFAULT 0,
    ADD COLUMN `shape` ENUM('REDONDA', 'CUADRADA', 'RECTANGULAR') NOT NULL DEFAULT 'RECTANGULAR',
    ADD COLUMN `width` DOUBLE NULL,
    ADD COLUMN `x` DOUBLE NULL,
    ADD COLUMN `y` DOUBLE NULL,
    MODIFY `estado` ENUM('LIBRE', 'OCUPADA', 'RESERVADA', 'AGRUPADA', 'BLOQUEADA', 'LIMPIEZA', 'FUERA_SERVICIO') NOT NULL DEFAULT 'LIBRE';

-- AlterTable
ALTER TABLE `mesa_grupo` ADD COLUMN `activa` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `fecha_fin` DATETIME(3) NULL,
    ADD COLUMN `fecha_inicio` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `zona` (
    `id_zona` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cola` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `tipo` ENUM('SALA', 'TERRAZA', 'BARRA', 'VIP', 'EXTERIOR', 'PRIVADO') NOT NULL DEFAULT 'SALA',
    `orden` INTEGER NOT NULL DEFAULT 0,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `zona_id_cola_nombre_key`(`id_cola`, `nombre`),
    PRIMARY KEY (`id_zona`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mesa_config_historial` (
    `id_historial` INTEGER NOT NULL AUTO_INCREMENT,
    `mesa_id` INTEGER NOT NULL,
    `capacidad` INTEGER NOT NULL,
    `sillas` INTEGER NOT NULL DEFAULT 0,
    `zona_id` INTEGER NULL,
    `fecha_inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_fin` DATETIME(3) NULL,

    INDEX `mesa_config_historial_mesa_id_fecha_inicio_idx`(`mesa_id`, `fecha_inicio`),
    PRIMARY KEY (`id_historial`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reserva` (
    `id_reserva` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cola` INTEGER NOT NULL,
    `id_cliente` INTEGER NULL,
    `cliente_nombre` VARCHAR(150) NOT NULL,
    `cliente_telefono` VARCHAR(30) NULL,
    `cliente_email` VARCHAR(150) NULL,
    `fecha` DATE NOT NULL,
    `hora_inicio` TIME NOT NULL,
    `hora_fin` TIME NULL,
    `num_comensales` INTEGER NOT NULL,
    `estado` ENUM('PENDIENTE', 'CONFIRMADA', 'CHECKED_IN', 'SENTADA', 'COMPLETADA', 'CANCELADA', 'NO_SHOW') NOT NULL DEFAULT 'PENDIENTE',
    `notas` TEXT NULL,
    `preferencia_zona` INTEGER NULL,
    `preferencia_mesa` INTEGER NULL,
    `origen` ENUM('TELEFONO', 'WEB', 'APP', 'WALK_IN', 'WHATSAPP', 'OTRO') NOT NULL DEFAULT 'TELEFONO',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reserva_id_cola_fecha_idx`(`id_cola`, `fecha`),
    INDEX `reserva_fecha_hora_inicio_idx`(`fecha`, `hora_inicio`),
    PRIMARY KEY (`id_reserva`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `waitlist_entry` (
    `id_waitlist` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cola` INTEGER NOT NULL,
    `id_cliente` INTEGER NULL,
    `cliente_nombre` VARCHAR(150) NOT NULL,
    `cliente_telefono` VARCHAR(30) NULL,
    `num_comensales` INTEGER NOT NULL,
    `hora_llegada` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` ENUM('ESPERANDO', 'NOTIFICADO', 'ASIGNADO', 'SENTADO', 'CANCELADO', 'NO_SHOW') NOT NULL DEFAULT 'ESPERANDO',
    `tiempo_estimado_min` INTEGER NULL,
    `prioridad` INTEGER NOT NULL DEFAULT 0,
    `preferencia_zona` INTEGER NULL,
    `preferencia_mesa` INTEGER NULL,
    `notas` TEXT NULL,
    `turno_legacy_id` INTEGER NULL,

    UNIQUE INDEX `waitlist_entry_turno_legacy_id_key`(`turno_legacy_id`),
    INDEX `waitlist_entry_id_cola_estado_idx`(`id_cola`, `estado`),
    INDEX `waitlist_entry_hora_llegada_idx`(`hora_llegada`),
    PRIMARY KEY (`id_waitlist`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `table_assignment` (
    `id_asignacion` INTEGER NOT NULL AUTO_INCREMENT,
    `id_cola` INTEGER NOT NULL,
    `tipo_origen` ENUM('RESERVA', 'WAITLIST') NOT NULL,
    `id_reserva` INTEGER NULL,
    `id_waitlist` INTEGER NULL,
    `mesa_id` INTEGER NOT NULL,
    `grupo_id` INTEGER NULL,
    `num_comensales` INTEGER NOT NULL,
    `hora_inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hora_fin_prevista` DATETIME(3) NULL,
    `estado` ENUM('PENDIENTE', 'ACTIVA', 'COMPLETADA', 'CANCELADA') NOT NULL DEFAULT 'ACTIVA',

    INDEX `table_assignment_id_cola_estado_idx`(`id_cola`, `estado`),
    INDEX `table_assignment_mesa_id_idx`(`mesa_id`),
    INDEX `table_assignment_grupo_id_idx`(`grupo_id`),
    PRIMARY KEY (`id_asignacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `cliente_id_empresa_idx` ON `cliente`(`id_empresa`);

-- CreateIndex
CREATE INDEX `mesa_id_cola_estado_idx` ON `mesa`(`id_cola`, `estado`);

-- CreateIndex
CREATE INDEX `mesa_id_zona_idx` ON `mesa`(`id_zona`);

-- CreateIndex
CREATE INDEX `mesa_grupo_id_cola_activa_idx` ON `mesa_grupo`(`id_cola`, `activa`);

-- CreateIndex
CREATE INDEX `turno_id_cola_estado_idx` ON `turno`(`id_cola`, `estado`);

-- AddForeignKey
ALTER TABLE `mesa` ADD CONSTRAINT `mesa_id_zona_fkey` FOREIGN KEY (`id_zona`) REFERENCES `zona`(`id_zona`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mesa_grupo_mesa` ADD CONSTRAINT `mesa_grupo_mesa_id_grupo_fkey` FOREIGN KEY (`id_grupo`) REFERENCES `mesa_grupo`(`id_grupo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mesa_grupo_mesa` ADD CONSTRAINT `mesa_grupo_mesa_id_mesa_fkey` FOREIGN KEY (`id_mesa`) REFERENCES `mesa`(`id_mesa`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zona` ADD CONSTRAINT `zona_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mesa_config_historial` ADD CONSTRAINT `mesa_config_historial_mesa_id_fkey` FOREIGN KEY (`mesa_id`) REFERENCES `mesa`(`id_mesa`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mesa_config_historial` ADD CONSTRAINT `mesa_config_historial_zona_id_fkey` FOREIGN KEY (`zona_id`) REFERENCES `zona`(`id_zona`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva` ADD CONSTRAINT `reserva_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reserva` ADD CONSTRAINT `reserva_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `cliente`(`id_cliente`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `waitlist_entry` ADD CONSTRAINT `waitlist_entry_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `waitlist_entry` ADD CONSTRAINT `waitlist_entry_id_cliente_fkey` FOREIGN KEY (`id_cliente`) REFERENCES `cliente`(`id_cliente`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table_assignment` ADD CONSTRAINT `table_assignment_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table_assignment` ADD CONSTRAINT `table_assignment_id_reserva_fkey` FOREIGN KEY (`id_reserva`) REFERENCES `reserva`(`id_reserva`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table_assignment` ADD CONSTRAINT `table_assignment_id_waitlist_fkey` FOREIGN KEY (`id_waitlist`) REFERENCES `waitlist_entry`(`id_waitlist`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table_assignment` ADD CONSTRAINT `table_assignment_mesa_id_fkey` FOREIGN KEY (`mesa_id`) REFERENCES `mesa`(`id_mesa`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `table_assignment` ADD CONSTRAINT `table_assignment_grupo_id_fkey` FOREIGN KEY (`grupo_id`) REFERENCES `mesa_grupo`(`id_grupo`) ON DELETE SET NULL ON UPDATE CASCADE;

