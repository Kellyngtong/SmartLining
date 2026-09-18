-- AlterTable: add capacidad_extra to mesa (sillas extra durante el servicio)
ALTER TABLE `mesa` ADD COLUMN `capacidad_extra` INT NOT NULL DEFAULT 0;

-- CreateTable: mesa_grupo (conjunto de mesas juntadas)
CREATE TABLE `mesa_grupo` (
    `id_grupo` INT NOT NULL AUTO_INCREMENT,
    `id_cola` INT NOT NULL,
    `numero` INT NOT NULL,
    `capacidad_total` INT NOT NULL,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id_grupo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable: mesa_grupo_mesa (tabla de unión N:M)
CREATE TABLE `mesa_grupo_mesa` (
    `id_grupo` INT NOT NULL,
    `id_mesa` INT NOT NULL,
    PRIMARY KEY (`id_grupo`, `id_mesa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey: mesa_grupo -> cola
ALTER TABLE `mesa_grupo` ADD CONSTRAINT `mesa_grupo_id_cola_fkey` FOREIGN KEY (`id_cola`) REFERENCES `cola`(`id_cola`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: mesa_grupo_mesa -> mesa_grupo
ALTER TABLE `mesa_grupo_mesa` ADD CONSTRAINT `mesa_grupo_mesa_id_grupo_fkey` FOREIGN KEY (`id_grupo`) REFERENCES `mesa_grupo`(`id_grupo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: mesa_grupo_mesa -> mesa
ALTER TABLE `mesa_grupo_mesa` ADD CONSTRAINT `mesa_grupo_mesa_id_mesa_fkey` FOREIGN KEY (`id_mesa`) REFERENCES `mesa`(`id_mesa`) ON DELETE CASCADE ON UPDATE CASCADE;
