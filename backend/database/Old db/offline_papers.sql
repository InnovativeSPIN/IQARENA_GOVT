-- Migration: create offline_papers and offline_paper_questions tables

CREATE TABLE IF NOT EXISTS offline_papers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  batch_id INT DEFAULT NULL,
  parent_paper_id INT DEFAULT NULL,
  all_subjects TINYINT(1) DEFAULT 0,
  title VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  total_questions INT NOT NULL DEFAULT 0,
  total_marks INT NOT NULL DEFAULT 0,
  duration_minutes INT DEFAULT NULL,
  status ENUM('draft','final') DEFAULT 'draft',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  question_pdf_path VARCHAR(512) DEFAULT NULL,
  answer_pdf_path VARCHAR(512) DEFAULT NULL,
  question_docx_path VARCHAR(512) DEFAULT NULL,
  answer_docx_path VARCHAR(512) DEFAULT NULL,
  generated_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (batch_id) REFERENCES batches(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (parent_paper_id) REFERENCES offline_papers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS offline_paper_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paper_id INT NOT NULL,
  question_id INT NOT NULL,
  marks INT NOT NULL DEFAULT 4,
  seq INT NOT NULL,
  FOREIGN KEY (paper_id) REFERENCES offline_papers(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE offline_papers
ADD COLUMN subject_id INT NULL AFTER exam_id,
ADD COLUMN topic_id INT NULL AFTER subject_id,
ADD COLUMN subtopic_id INT NULL AFTER topic_id;

ALTER TABLE offline_papers
ADD INDEX idx_offline_subject (subject_id),
ADD INDEX idx_offline_topic (topic_id),
ADD INDEX idx_offline_subtopic (subtopic_id);

ALTER TABLE offline_papers
ADD CONSTRAINT fk_offline_subject
FOREIGN KEY (subject_id)
REFERENCES subjects(id)
ON DELETE SET NULL
ON UPDATE CASCADE,

ADD CONSTRAINT fk_offline_topic
FOREIGN KEY (topic_id)
REFERENCES topics(id)
ON DELETE SET NULL
ON UPDATE CASCADE,

ADD CONSTRAINT fk_offline_subtopic
FOREIGN KEY (subtopic_id)
REFERENCES subtopics(id)
ON DELETE SET NULL
ON UPDATE CASCADE;
