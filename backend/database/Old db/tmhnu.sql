-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 12, 2025 at 03:52 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `tmhnu`
--

-- --------------------------------------------------------

--
-- Table structure for table `batches`
--

CREATE TABLE `batches` (
  `id` int(11) NOT NULL,
  `batch_name` varchar(100) NOT NULL,
  `exam_id` int(11) NOT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `batches`
--

INSERT INTO `batches` (`id`, `batch_name`, `exam_id`, `status`, `created_at`) VALUES
(1, 'neet_2025', 1, 1, '2025-12-08 15:52:39'),
(2, 'jee_2025', 2, 1, '2025-12-08 15:52:39');

-- --------------------------------------------------------

--
-- Table structure for table `email_logs`
--

CREATE TABLE `email_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `subject` varchar(200) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exams`
--

CREATE TABLE `exams` (
  `id` int(11) NOT NULL,
  `name` enum('NEET','JEE') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `exams`
--

INSERT INTO `exams` (`id`, `name`) VALUES
(1, 'NEET'),
(2, 'JEE');

-- --------------------------------------------------------

--
-- Table structure for table `questions`
--

CREATE TABLE `questions` (
  `id` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `option_a` text NOT NULL,
  `option_b` text NOT NULL,
  `option_c` text NOT NULL,
  `option_d` text NOT NULL,
  `answer` enum('A','B','C','D') NOT NULL,
  `explanation` text DEFAULT NULL,
  `marks` int(11) DEFAULT 4,
  `topic_id` int(11) NOT NULL,
  `subtopic_id` int(11) DEFAULT NULL,
  `exam_type` enum('NEET','JEE') NOT NULL,
  `use_img` int(11) DEFAULT NULL,
  `created_by_admin` tinyint(1) DEFAULT 0,
  `created_by_user_id` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `questions`
--

(-- note: subtopic_id added; set NULL for existing rows)
INSERT INTO `questions` (`id`, `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `answer`, `explanation`, `marks`, `topic_id`, `subtopic_id`, `exam_type`, `use_img`, `created_by_admin`, `created_by_user_id`, `created_at`, `updated_at`) VALUES
(7, 'njjkn', '', '', '', '', 'A', 'jnjn', 4, 1, 'NEET', 5, 1, NULL, '2025-12-11 13:14:09', '2025-12-11 13:14:09'),
(8, 'eee', 'ws', 'sss', 'sss', 'sss', 'D', 'sss', 4, 1, NULL, 'NEET', 6, 1, NULL, '2025-12-11 13:53:39', '2025-12-11 14:27:26');

-- --------------------------------------------------------

--
-- Table structure for table `question_images`
--

CREATE TABLE `question_images` (
  `id` int(11) NOT NULL,
  `question_img` varchar(255) DEFAULT NULL,
  `option_a` varchar(255) DEFAULT NULL,
  `option_b` varchar(255) DEFAULT NULL,
  `option_c` varchar(255) DEFAULT NULL,
  `option_d` varchar(255) DEFAULT NULL,
  `explanation` text DEFAULT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `question_images`
--

INSERT INTO `question_images` (`id`, `question_img`, `option_a`, `option_b`, `option_c`, `option_d`, `explanation`, `created_at`, `updated_at`) VALUES
(1, '/uploads/image-1765455963897-498468888.PNG', '/uploads/image-1765455967542-357414143.JPG', '/uploads/image-1765455976748-753462647.JPG', '/uploads/image-1765455971157-408683336.PNG', '/uploads/image-1765455979153-115643350.PNG', 'its one', '2025-12-11 17:59:35', '2025-12-11 17:59:35'),
(2, '/uploads/image-1765455963897-498468888.PNG', '/uploads/image-1765455967542-357414143.JPG', '/uploads/image-1765455976748-753462647.JPG', '/uploads/image-1765455971157-408683336.PNG', '/uploads/image-1765455979153-115643350.PNG', 'its one', '2025-12-11 17:59:38', '2025-12-11 17:59:38'),
(3, '/uploads/image-1765456190034-203818205.JPG', '/uploads/image-1765456192334-880537525.PNG', '/uploads/image-1765456197241-190148007.PNG', '/uploads/image-1765456194772-776782164.PNG', '/uploads/image-1765456200080-670118376.PNG', 'jnjn', '2025-12-11 18:00:20', '2025-12-11 18:00:20'),
(4, '/uploads/image-1765456190034-203818205.JPG', '/uploads/image-1765456192334-880537525.PNG', '/uploads/image-1765456197241-190148007.PNG', '/uploads/image-1765456194772-776782164.PNG', '/uploads/image-1765456200080-670118376.PNG', 'jnjn', '2025-12-11 18:00:40', '2025-12-11 18:00:40'),
(5, 'image-1765461197742-971999284.jpg', 'image-1765461199831-962647295.jpg', 'image-1765461199831-962647295.jpg', 'image-1765461199831-962647295.jpg', 'image-1765461199831-962647295.jpg', 'image-1765461199831-962647295.jpg', '2025-12-11 18:44:09', '2025-12-11 22:10:16'),
(6, 'image-1765461197742-971999284.jpg', 'image-1765461199831-962647295.jpg', 'image-1765461201692-274509106.jpg', 'image-1765461203410-170645548.jpg', 'image-1765464933784-345296192.jpg', 'image-1765464920975-195647508.jfif', '2025-12-11 19:23:39', '2025-12-11 20:25:35');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` enum('ADMIN','FACULTY','STUDENT') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`) VALUES
(1, 'ADMIN'),
(2, 'FACULTY'),
(3, 'STUDENT');

-- --------------------------------------------------------

--
-- Table structure for table `sms_logs`
--

CREATE TABLE `sms_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `exam_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `user_id`, `batch_id`, `exam_id`) VALUES
(2, 1, 1, 1),
(3, 5, 2, 2);

-- --------------------------------------------------------

--
-- Table structure for table `student_answers`
--

CREATE TABLE `student_answers` (
  `id` int(11) NOT NULL,
  `attempt_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `selected_option` enum('A','B','C','D') DEFAULT NULL,
  `is_marked_for_review` tinyint(1) DEFAULT 0,
  `is_correct` tinyint(1) DEFAULT NULL,
  `time_taken` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `student_answers`
--

INSERT INTO `student_answers` (`id`, `attempt_id`, `question_id`, `selected_option`, `is_marked_for_review`, `is_correct`, `time_taken`, `created_at`, `updated_at`) VALUES
(3, 6, 8, 'D', 0, 1, 0, '2025-12-12 03:38:38', '2025-12-12 03:38:38'),
(4, 6, 7, 'B', 0, 0, 0, '2025-12-12 03:38:38', '2025-12-12 03:38:38');

-- --------------------------------------------------------

--
-- Table structure for table `student_test_attempts`
--

CREATE TABLE `student_test_attempts` (
  `id` int(11) NOT NULL,
  `test_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `status` enum('not_started','in_progress','completed') DEFAULT 'not_started',
  `score` decimal(5,2) DEFAULT 0.00,
  `time_taken` int(11) DEFAULT 0,
  `started_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `student_test_attempts`
--

INSERT INTO `student_test_attempts` (`id`, `test_id`, `student_id`, `status`, `score`, `time_taken`, `started_at`, `completed_at`, `created_at`, `updated_at`) VALUES
(6, 7, 1, 'completed', 3.00, 629, '2025-12-12 03:28:09', '2025-12-12 03:38:38', '2025-12-12 03:28:09', '2025-12-12 03:38:38');

-- --------------------------------------------------------

--
-- Table structure for table `subjects`
--

CREATE TABLE `subjects` (
  `id` int(11) NOT NULL,
  `exam_id` int(11) NOT NULL,
  `name` text NOT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `subjects`
--

INSERT INTO `subjects` (`id`, `exam_id`, `name`, `status`, `created_at`) VALUES
(1, 2, 'Physics', 1, '2025-12-09 18:27:16'),
(2, 1, 'biology', 1, '2025-12-10 02:23:46'),
(3, 1, 'Zoology', 1, '2025-12-10 05:47:35'),
(5, 1, 'Maths', 1, '2025-12-10 05:47:35');

-- --------------------------------------------------------

--
-- Table structure for table `subject_allocation`
--

CREATE TABLE `subject_allocation` (
  `id` int(11) NOT NULL,
  `faculty_user_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `subject_allocation`
--

INSERT INTO `subject_allocation` (`id`, `faculty_user_id`, `subject_id`, `created_at`) VALUES
(7, 6, 1, '2025-12-09 18:39:28'),
(17, 6, 2, '2025-12-10 03:50:27'),
(18, 9, 2, '2025-12-10 03:50:27'),
(19, 6, 3, '2025-12-10 05:53:44'),
(20, 6, 5, '2025-12-10 14:13:13');

-- --------------------------------------------------------

--
-- Table structure for table `tests`
--

CREATE TABLE `tests` (
  `id` int(11) NOT NULL,
  `exam_id` int(11) NOT NULL,
  `subject_id` int(11) DEFAULT NULL,
  `all_subjects` tinyint(1) NOT NULL DEFAULT 0,
  `topic_id` int(11) DEFAULT NULL,
  `batch_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `duration_minutes` int(11) NOT NULL,
  `total_marks` int(11) NOT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `status` enum('draft','published','unpublished') DEFAULT 'draft',
  `created_by` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tests`
--

INSERT INTO `tests` (`id`, `exam_id`, `subject_id`, `topic_id`, `batch_id`, `title`, `duration_minutes`, `total_marks`, `start_time`, `end_time`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
(3, 1, 2, 1, 1, 'its test', 60, 4, '2025-12-11 18:57:00', '2025-12-12 18:57:00', 'draft', 1, '2025-12-11 17:41:39', '2025-12-11 19:03:48'),
(4, 1, 2, 1, 1, 'its test from normal', 60, 12, NULL, NULL, 'draft', 1, '2025-12-11 19:14:58', '2025-12-11 19:24:55'),
(7, 1, 2, 1, 1, 'its previous tests ', 60, 8, NULL, NULL, 'published', 1, '2025-12-11 19:19:34', '2025-12-12 03:39:25');

-- --------------------------------------------------------

--
-- Table structure for table `test_questions`
--

CREATE TABLE `test_questions` (
  `id` int(11) NOT NULL,
  `test_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `test_questions`
--

INSERT INTO `test_questions` (`id`, `test_id`, `question_id`) VALUES
(3, 3, 8),
(5, 4, 8),
(6, 4, 7),
(10, 7, 8),
(11, 7, 7);


--
-- Table structure for table `topics`
--

CREATE TABLE `topics` (
  `id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `topic_name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `topics`
--

INSERT INTO `topics` (`id`, `subject_id`, `topic_name`, `description`, `created_at`) VALUES
(1, 2, 'Cells', 'its cells', '2025-12-10 04:32:23'),
(2, 1, 'speed', 'its one', '2025-12-10 04:32:55');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `userid` text NOT NULL,
  `role_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `userid`, `role_id`, `name`, `phone`, `email`, `password`, `status`, `created_at`, `updated_at`) VALUES
(1, '111', 2, 'naveen bharathiu', '6369800627', 'naveenbharathi5050@gmail.com', '$2a$10$BugvLW6imJViRlL4Su.HFeeuJoge.CUqXO12.mNaTyPPEZlN.ilfq', 1, '2025-12-08 15:46:53', '2025-12-12 07:43:42'),
(4, '222', 3, 'naveen bharathiu', '63698006278', 'naveen@gmail.com', '$2a$10$BugvLW6imJViRlL4Su.HFeeuJoge.CUqXO12.mNaTyPPEZlN.ilfq', 1, '2025-12-08 15:46:53', '2025-12-09 11:02:09'),
(5, '777', 3, 'naveen', '63698006279', 'naveen2@gmail.com', '$2a$10$9CVWsPpyS7ARORU5rHdQu.wMErVanTRm7Sf1LAUIJzEaWHR7Szy.O', 1, '2025-12-08 15:46:53', '2025-12-09 17:34:39'),
(6, '333', 2, 'mark', '989898989', 'nave@gmail.com', '$2a$10$WGoEFatcMK4Sdd/xuu6ngeTDhvm86exE4ZpEP1h/K30mUyRWvHGwG', 1, '2025-12-09 14:55:04', '2025-12-09 17:34:59'),
(9, '66', 2, 'its new', '29898', 'new@ff', '$2a$10$FF50XIaExi2u9EXzaxEmxOEriuaEBJppO7/.hHzusp2GQNRdaDjDG', 0, '2025-12-10 03:21:42', '2025-12-10 03:21:42');

-- --------------------------------------------------------

--
-- Table structure for table `whatsapp_logs`
--

CREATE TABLE `whatsapp_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sent_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `batches`
--
ALTER TABLE `batches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_batch_exam_id` (`exam_id`);

--
-- Indexes for table `email_logs`
--
ALTER TABLE `email_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `exams`
--
ALTER TABLE `exams`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `questions`
--
ALTER TABLE `questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `topic_id` (`topic_id`),
  ADD KEY `created_by_user_id` (`created_by_user_id`),
  ADD KEY `fk_use_img` (`use_img`);

--
-- Indexes for table `question_images`
--
ALTER TABLE `question_images`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `sms_logs`
--
ALTER TABLE `sms_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `batch_id` (`batch_id`),
  ADD KEY `fk_students_exam` (`exam_id`);

--
-- Indexes for table `student_answers`
--
ALTER TABLE `student_answers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_attempt_question` (`attempt_id`,`question_id`),
  ADD KEY `idx_attempt_id` (`attempt_id`),
  ADD KEY `idx_question_id` (`question_id`);

--
-- Indexes for table `student_test_attempts`
--
ALTER TABLE `student_test_attempts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_student_test` (`test_id`,`student_id`),
  ADD KEY `student_id` (`student_id`);

--
-- Indexes for table `subjects`
--
ALTER TABLE `subjects`
  ADD PRIMARY KEY (`id`),
  ADD KEY `exam_id` (`exam_id`);

--
-- Indexes for table `subject_allocation`
--
ALTER TABLE `subject_allocation`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `faculty_user_id` (`faculty_user_id`,`subject_id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `tests`
--
ALTER TABLE `tests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `exam_id` (`exam_id`),
  ADD KEY `subject_id` (`subject_id`),
  ADD KEY `batch_id` (`batch_id`),
  ADD KEY `idx_tests_created_by` (`created_by`),
  ADD KEY `fk_tests_topic` (`topic_id`);

--
-- Indexes for table `test_questions`
--
ALTER TABLE `test_questions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `test_id` (`test_id`),
  ADD KEY `question_id` (`question_id`);


--
-- Indexes for table `topics`
--
ALTER TABLE `topics`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subject_id` (`subject_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `role_id` (`role_id`);

--
-- Indexes for table `whatsapp_logs`
--
ALTER TABLE `whatsapp_logs`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `batches`
--
ALTER TABLE `batches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `email_logs`
--
ALTER TABLE `email_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `exams`
--
ALTER TABLE `exams`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `questions`
--
ALTER TABLE `questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `question_images`
--
ALTER TABLE `question_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `sms_logs`
--
ALTER TABLE `sms_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `student_answers`
--
ALTER TABLE `student_answers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `student_test_attempts`
--
ALTER TABLE `student_test_attempts`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `subjects`
--
ALTER TABLE `subjects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `subject_allocation`
--
ALTER TABLE `subject_allocation`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `tests`
--
ALTER TABLE `tests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `test_questions`
--
ALTER TABLE `test_questions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;


--
-- AUTO_INCREMENT for table `topics`
--
ALTER TABLE `topics`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `whatsapp_logs`
--
ALTER TABLE `whatsapp_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `batches`
--
ALTER TABLE `batches`
  ADD CONSTRAINT `fk_batch_exam_id` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON UPDATE CASCADE;

--
-- Constraints for table `questions`
--
ALTER TABLE `questions`
  ADD CONSTRAINT `fk_use_img` FOREIGN KEY (`use_img`) REFERENCES `question_images` (`id`),
  ADD CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`),
  ADD CONSTRAINT `questions_ibfk_3` FOREIGN KEY (`subtopic_id`) REFERENCES `subtopics` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `questions_ibfk_2` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `fk_students_exam` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`),
  ADD CONSTRAINT `students_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `students_ibfk_2` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`);

--
-- Constraints for table `student_answers`
--
ALTER TABLE `student_answers`
  ADD CONSTRAINT `student_answers_ibfk_1` FOREIGN KEY (`attempt_id`) REFERENCES `student_test_attempts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `student_test_attempts`
--
ALTER TABLE `student_test_attempts`
  ADD CONSTRAINT `student_test_attempts_ibfk_1` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `student_test_attempts_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subjects`
--
ALTER TABLE `subjects`
  ADD CONSTRAINT `subjects_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`);

--
-- Constraints for table `subject_allocation`
--
ALTER TABLE `subject_allocation`
  ADD CONSTRAINT `subject_allocation_ibfk_1` FOREIGN KEY (`faculty_user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `subject_allocation_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`);

--
-- Constraints for table `tests`
--
ALTER TABLE `tests`
  ADD CONSTRAINT `fk_tests_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tests_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `tests_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tests_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tests_ibfk_3` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `test_questions`
--
ALTER TABLE `test_questions`
  ADD CONSTRAINT `test_questions_ibfk_1` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`),
  ADD CONSTRAINT `test_questions_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`);


--
-- Constraints for table `topics`
--
ALTER TABLE `topics`
  ADD CONSTRAINT `topics_ibfk_1` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
