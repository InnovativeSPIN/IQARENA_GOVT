-- ============================================================
-- Migration: 001_school_nmms_extension.sql
-- MySQL 8.0 compatible version
-- ============================================================

USE `tmhnuiqarena`;

-- 1. schools
CREATE TABLE IF NOT EXISTS `schools` (
  `id`            INT(11)      NOT NULL AUTO_INCREMENT,
  `school_name`   VARCHAR(255) NOT NULL,
  `school_code`   VARCHAR(50)  DEFAULT NULL,
  `district`      VARCHAR(100) DEFAULT NULL,
  `block`         VARCHAR(100) DEFAULT NULL,
  `address`       TEXT         DEFAULT NULL,
  `contact_phone` VARCHAR(15)  DEFAULT NULL,
  `status`        TINYINT(1)   DEFAULT 1,
  `created_at`    TIMESTAMP    NOT NULL DEFAULT current_timestamp(),
  `updated_at`    TIMESTAMP    NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_school_code` (`school_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. school_students
CREATE TABLE IF NOT EXISTS `school_students` (
  `id`           INT(11)      NOT NULL AUTO_INCREMENT,
  `emis_no`      VARCHAR(50)  NOT NULL,
  `student_name` VARCHAR(150) NOT NULL,
  `school_id`    INT(11)      NOT NULL,
  `standard`     VARCHAR(20)  NOT NULL,
  `section`      VARCHAR(10)  DEFAULT NULL,
  `gender`       ENUM('Male','Female','Other') DEFAULT NULL,
  `dob`          DATE         DEFAULT NULL,
  `phone`        VARCHAR(15)  DEFAULT NULL,
  `user_id`      INT(11)      DEFAULT NULL,
  `status`       TINYINT(1)   DEFAULT 1,
  `created_at`   TIMESTAMP    NOT NULL DEFAULT current_timestamp(),
  `updated_at`   TIMESTAMP    NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_emis` (`emis_no`),
  KEY `idx_ss_school`   (`school_id`),
  KEY `idx_ss_user`     (`user_id`),
  KEY `idx_ss_standard` (`standard`),
  CONSTRAINT `fk_ss_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ss_user`   FOREIGN KEY (`user_id`)   REFERENCES `users`   (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. school_test_assignments
CREATE TABLE IF NOT EXISTS `school_test_assignments` (
  `id`          INT(11)     NOT NULL AUTO_INCREMENT,
  `test_id`     INT(11)     NOT NULL,
  `school_id`   INT(11)     NOT NULL,
  `standard`    VARCHAR(20) DEFAULT NULL,
  `assigned_at` TIMESTAMP   NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_test_school_std` (`test_id`, `school_id`, `standard`),
  KEY `idx_sta_test`   (`test_id`),
  KEY `idx_sta_school` (`school_id`),
  CONSTRAINT `fk_sta_test`   FOREIGN KEY (`test_id`)   REFERENCES `tests`   (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sta_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Exam types
INSERT IGNORE INTO `exams` (`name`) VALUES ('NMMS');
INSERT IGNORE INTO `exams` (`name`) VALUES ('TRUST');

-- 5a. tests.school_id column
ALTER TABLE `tests` ADD COLUMN `school_id` INT(11) DEFAULT NULL AFTER `batch_id`;

-- 5b. tests.school_id index
ALTER TABLE `tests` ADD KEY `fk_tests_school` (`school_id`);

-- 5c. tests.school_id FK
ALTER TABLE `tests` ADD CONSTRAINT `fk_tests_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- 6a. student_test_attempts.school_student_id column
ALTER TABLE `student_test_attempts` ADD COLUMN `school_student_id` INT(11) DEFAULT NULL AFTER `student_id`;

-- 6b. student_test_attempts.school_student_id index
ALTER TABLE `student_test_attempts` ADD KEY `fk_sta_school_student` (`school_student_id`);

-- 6c. student_test_attempts.school_student_id FK
ALTER TABLE `student_test_attempts` ADD CONSTRAINT `fk_sta_school_student` FOREIGN KEY (`school_student_id`) REFERENCES `school_students` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

SELECT 'Migration 001 applied' AS migration_status;
