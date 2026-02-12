-- CreateTable usuario
CREATE TABLE `usuario` (
    `id_usuario` INT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol` ENUM('ADMINISTRADOR', 'EMPLEADO') NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuario_email_key`(`email`),
    PRIMARY KEY (`id_usuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable cliente
CREATE TABLE `cliente` (
    `id_cliente` INT NOT NULL AUTO_INCREMENT,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `origen` VARCHAR(50) NOT NULL DEFAULT 'QR',

    PRIMARY KEY (`id_cliente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable cola
CREATE TABLE `cola` (
    `id_cola` INT NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `descripcion` TEXT,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `fecha_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id_cola`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable horario_cola
CREATE TABLE `horario_cola` (
    `id_horario` INT NOT NULL AUTO_INCREMENT,
    `id_cola` INT NOT NULL,
    `dia_semana` ENUM('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO') NOT NULL,
    `hora_inicio` TIME NOT NULL,
    `hora_fin` TIME NOT NULL,

    PRIMARY KEY (`id_horario`),
    FOREIGN KEY (`id_cola`) REFERENCES `cola` (`id_cola`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable turno
CREATE TABLE `turno` (
    `id_turno` INT NOT NULL AUTO_INCREMENT,
    `id_cola` INT NOT NULL,
    `id_cliente` INT NOT NULL,
    `numero_turno` INT NOT NULL,
    `estado` ENUM('EN_ESPERA', 'EN_ATENCION', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'EN_ESPERA',
    `fecha_hora_creacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fecha_hora_llamada` DATETIME(3),
    `fecha_hora_inicio_atencion` DATETIME(3),
    `fecha_hora_fin_atencion` DATETIME(3),

    PRIMARY KEY (`id_turno`),
    FOREIGN KEY (`id_cola`) REFERENCES `cola` (`id_cola`) ON DELETE RESTRICT,
    FOREIGN KEY (`id_cliente`) REFERENCES `cliente` (`id_cliente`) ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable atencion
CREATE TABLE `atencion` (
    `id_atencion` INT NOT NULL AUTO_INCREMENT,
    `id_turno` INT NOT NULL,
    `id_empleado` INT NOT NULL,
    `duracion_atencion` INT,
    `resultado` ENUM('ATENDIDO', 'CANCELADO') NOT NULL,

    UNIQUE INDEX `atencion_id_turno_key`(`id_turno`),
    PRIMARY KEY (`id_atencion`),
    FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`) ON DELETE RESTRICT,
    FOREIGN KEY (`id_empleado`) REFERENCES `usuario` (`id_usuario`) ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable valoracion
CREATE TABLE `valoracion` (
    `id_valoracion` INT NOT NULL AUTO_INCREMENT,
    `id_turno` INT NOT NULL,
    `puntuacion` INT NOT NULL,
    `comentario` TEXT,
    `fecha_valoracion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `valoracion_id_turno_key`(`id_turno`),
    PRIMARY KEY (`id_valoracion`),
    FOREIGN KEY (`id_turno`) REFERENCES `turno` (`id_turno`) ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable evento
CREATE TABLE `evento` (
    `id_evento` INT NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('PROMOCION', 'FESTIVO', 'EVENTO') NOT NULL,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` TEXT,
    `fecha_inicio` DATE NOT NULL,
    `fecha_fin` DATE NOT NULL,

    PRIMARY KEY (`id_evento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable cola_evento
CREATE TABLE `cola_evento` (
    `id_cola` INT NOT NULL,
    `id_evento` INT NOT NULL,

    PRIMARY KEY (`id_cola`, `id_evento`),
    FOREIGN KEY (`id_cola`) REFERENCES `cola` (`id_cola`) ON DELETE CASCADE,
    FOREIGN KEY (`id_evento`) REFERENCES `evento` (`id_evento`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
