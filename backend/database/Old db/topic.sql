CREATE TABLE subtopics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    topic_id INT NOT NULL,
    subtopic_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (topic_id) REFERENCES topics(id)
);
------------------------

-- Migration: Add subtopic_id column to questions and add FK

ALTER TABLE `questions`
  ADD COLUMN `subtopic_id` INT(11) DEFAULT NULL AFTER `topic_id`;

ALTER TABLE `questions`
  ADD INDEX `idx_questions_subtopic_id` (`subtopic_id`);

ALTER TABLE `questions`
  ADD CONSTRAINT `fk_questions_subtopic`
    FOREIGN KEY (`subtopic_id`) REFERENCES `subtopics` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

---------------------------------------
ALTER TABLE `tests`
  ADD COLUMN `subtopic_id` INT NULL AFTER `topic_id`,
  ADD INDEX `idx_tests_subtopic_id` (`subtopic_id`);


  ALTER TABLE `tests`
  ADD CONSTRAINT `fk_tests_subtopic_id`
  FOREIGN KEY (`subtopic_id`) REFERENCES `subtopics`(`id`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

  ------------------------------------

ALTER TABLE tests
ADD COLUMN parent_test_id INT NULL AFTER id,
ADD CONSTRAINT fk_parent_test
FOREIGN KEY (parent_test_id) REFERENCES tests(id)
ON DELETE CASCADE;

ALTER TABLE tests
ADD COLUMN all_subjects TINYINT(1) NOT NULL DEFAULT 0
AFTER subject_id;
