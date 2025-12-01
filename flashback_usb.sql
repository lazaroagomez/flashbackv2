-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 28, 2025 at 01:31 PM
-- Server version: 8.4.3
-- PHP Version: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `flashback_usb`
--

DELIMITER $$
--
-- Procedures
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `get_next_usb_id` (OUT `next_id` VARCHAR(4))   BEGIN
    DECLARE curr_letter CHAR(1);
    DECLARE curr_number INT;
    DECLARE new_letter CHAR(1);
    DECLARE new_number INT;

    -- Lock row and get current values
    SELECT current_letter, current_number INTO curr_letter, curr_number
    FROM sequential_counters
    WHERE id = 1
    FOR UPDATE;

    -- Calculate next ID
    SET new_number = curr_number + 1;
    SET new_letter = curr_letter;

    -- If exceeds 999, move to next letter
    IF new_number > 999 THEN
        SET new_number = 1;
        SET new_letter = CHAR(ASCII(curr_letter) + 1);

        -- Check if we exceeded Z
        IF new_letter > 'Z' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Maximum USB ID limit reached (Z999)';
        END IF;
    END IF;

    -- Update counter
    UPDATE sequential_counters
    SET current_letter = new_letter, current_number = new_number
    WHERE id = 1;

    -- Format as A001, A002, ... A999, B001, etc.
    SET next_id = CONCAT(new_letter, LPAD(new_number, 3, '0'));
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `event_logs`
--

CREATE TABLE `event_logs` (
  `id` bigint NOT NULL,
  `usb_id` int NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `event_type` enum('created','assigned','reassigned','updated','marked_pending','repurpose','damaged','lost','retired','reactivated','formatted','flash','on_hold') NOT NULL,
  `details` text NOT NULL,
  `username` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `event_logs`
--

INSERT INTO `event_logs` (`id`, `usb_id`, `timestamp`, `event_type`, `details`, `username`) VALUES
(1, 1, '2025-11-27 21:02:50', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'Albert'),
(2, 1, '2025-11-27 21:03:14', 'assigned', 'Assigned to technician: test_tech', 'Albert'),
(3, 2, '2025-11-27 21:47:17', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'test'),
(4, 2, '2025-11-27 21:47:17', 'assigned', 'Assigned to technician: test_tech', 'test'),
(5, 3, '2025-11-27 21:47:17', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'test'),
(6, 3, '2025-11-27 21:47:17', 'assigned', 'Assigned to technician: test_tech', 'test'),
(7, 4, '2025-11-27 21:47:17', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'test'),
(8, 4, '2025-11-27 21:47:17', 'assigned', 'Assigned to technician: test_tech', 'test'),
(9, 5, '2025-11-27 21:47:17', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'test'),
(10, 5, '2025-11-27 21:47:17', 'assigned', 'Assigned to technician: test_tech', 'test'),
(11, 6, '2025-11-27 21:47:17', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'test'),
(12, 6, '2025-11-27 21:47:17', 'assigned', 'Assigned to technician: test_tech', 'test'),
(13, 7, '2025-11-27 21:47:17', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'test'),
(14, 7, '2025-11-27 21:47:17', 'assigned', 'Assigned to technician: test_tech', 'test'),
(15, 8, '2025-11-27 21:47:17', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'test'),
(16, 8, '2025-11-27 21:47:17', 'assigned', 'Assigned to technician: test_tech', 'test'),
(17, 9, '2025-11-27 21:47:17', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'test'),
(18, 9, '2025-11-27 21:47:17', 'assigned', 'Assigned to technician: test_tech', 'test'),
(19, 10, '2025-11-27 21:47:17', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'test'),
(20, 10, '2025-11-27 21:47:17', 'assigned', 'Assigned to technician: test_tech', 'test'),
(21, 11, '2025-11-27 21:47:17', 'created', 'USB drive created: Type=CPTI, Model=test_model, Version=v128', 'test'),
(22, 11, '2025-11-27 21:47:17', 'assigned', 'Assigned to technician: test_tech', 'test'),
(23, 1, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(24, 2, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(25, 3, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(26, 4, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(27, 5, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(28, 6, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(29, 7, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(30, 8, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(31, 9, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(32, 10, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(33, 11, '2025-11-27 21:49:40', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'System'),
(34, 12, '2025-11-27 21:59:22', 'created', 'USB drive created: Type=WTP, Version=112725', 'test'),
(35, 12, '2025-11-27 21:59:22', 'assigned', 'Assigned to technician: test_tech', 'test'),
(36, 1, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(37, 1, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(38, 2, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(39, 2, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(40, 3, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(41, 3, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(42, 4, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(43, 4, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(44, 5, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(45, 5, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(46, 6, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(47, 6, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(48, 7, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(49, 7, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(50, 8, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(51, 8, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(52, 9, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(53, 9, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(54, 10, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(55, 10, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(56, 11, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(57, 11, '2025-11-27 22:02:52', 'updated', 'Version updated from v128 to v128', 'Albert'),
(58, 1, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(59, 2, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(60, 3, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(61, 4, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(62, 5, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(63, 6, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(64, 7, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(65, 8, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(66, 9, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(67, 10, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(68, 11, '2025-11-27 22:29:42', 'marked_pending', 'Marked for update: current version v128 is outdated (new current: v129)', 'Albert'),
(69, 13, '2025-11-27 22:32:17', 'created', 'USB drive created: Type=WTP, Version=112725', 'Albert'),
(70, 13, '2025-11-27 22:32:17', 'assigned', 'Assigned to technician: Abdul Sey', 'Albert'),
(71, 12, '2025-11-27 22:35:11', 'marked_pending', 'Marked for update: current version 112725 is outdated (new current: 112726)', 'System'),
(72, 13, '2025-11-27 22:35:11', 'marked_pending', 'Marked for update: current version 112725 is outdated (new current: 112726)', 'System'),
(73, 1, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(74, 2, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(75, 3, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(76, 4, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(77, 5, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(78, 6, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(79, 7, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(80, 8, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(81, 9, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(82, 10, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(83, 11, '2025-11-27 22:57:05', 'updated', 'Version updated from v128 to v129', 'Albert'),
(84, 12, '2025-11-27 22:57:05', 'updated', 'Version updated from 112725 to 112726', 'Albert'),
(85, 13, '2025-11-27 23:05:29', 'updated', 'Version updated from 112725 to 112726', 'Albert'),
(86, 1, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(87, 2, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(88, 3, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(89, 4, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(90, 5, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(91, 6, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(92, 7, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(93, 8, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(94, 9, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(95, 10, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(96, 11, '2025-11-27 23:10:46', 'reassigned', '[Bulk Edit] Reassigned from test_tech to Alexis Delacruz', 'Albert'),
(97, 12, '2025-11-27 23:19:39', 'updated', '[Bulk Edit] Unassigned from technician: test_tech', 'Albert'),
(98, 12, '2025-11-27 23:19:47', 'assigned', 'Assigned to technician: Abdul Sey', 'Albert'),
(99, 1, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(100, 2, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(101, 3, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(102, 4, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(103, 5, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(104, 6, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(105, 7, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(106, 8, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(107, 9, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(108, 10, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(109, 11, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(110, 12, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(111, 13, '2025-11-27 23:24:12', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(112, 14, '2025-11-28 04:37:44', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(113, 14, '2025-11-28 04:37:44', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(114, 15, '2025-11-28 04:38:08', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(115, 15, '2025-11-28 04:38:08', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(116, 16, '2025-11-28 04:38:08', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(117, 16, '2025-11-28 04:38:08', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(118, 17, '2025-11-28 04:38:08', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(119, 17, '2025-11-28 04:38:08', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(120, 18, '2025-11-28 04:38:08', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(121, 18, '2025-11-28 04:38:08', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(122, 19, '2025-11-28 04:38:08', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(123, 19, '2025-11-28 04:38:08', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(124, 20, '2025-11-28 04:38:08', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(125, 20, '2025-11-28 04:38:08', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(126, 21, '2025-11-28 04:38:08', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(127, 21, '2025-11-28 04:38:08', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(128, 22, '2025-11-28 04:38:08', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(129, 22, '2025-11-28 04:38:08', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(130, 23, '2025-11-28 04:38:08', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(131, 23, '2025-11-28 04:38:08', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(132, 24, '2025-11-28 04:38:08', 'created', 'USB drive created: Type=CPTI, Model=CX1505CKA, Version=test version', 'Albert'),
(133, 24, '2025-11-28 04:38:08', 'assigned', 'Assigned to technician: Alexis Delacruz', 'Albert'),
(134, 14, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(135, 15, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(136, 16, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(137, 17, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(138, 18, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(139, 19, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(140, 20, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(141, 21, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(142, 22, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(143, 23, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert'),
(144, 24, '2025-11-28 04:45:04', 'updated', '[Bulk Edit] Status changed from assigned to retired', 'Albert');

--
-- Triggers `event_logs`
--
DELIMITER $$
CREATE TRIGGER `prevent_event_log_delete` BEFORE DELETE ON `event_logs` FOR EACH ROW BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Event logs are immutable - deletes are not allowed';
END
$$
DELIMITER ;
DELIMITER $$
CREATE TRIGGER `prevent_event_log_update` BEFORE UPDATE ON `event_logs` FOR EACH ROW BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Event logs are immutable - updates are not allowed';
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `models`
--

CREATE TABLE `models` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `model_number` varchar(100) DEFAULT NULL,
  `notes` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `models`
--

INSERT INTO `models` (`id`, `name`, `model_number`, `notes`, `status`, `created_at`) VALUES
(1, 'test_model', 'test_model', 'test_model', 'inactive', '2025-11-27 21:02:13'),
(2, 'B1400CBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(3, 'B1400CEAE', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(4, 'B1402CBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(5, 'B1402CGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(6, 'B1402CVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(7, 'B1403CTA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(8, 'B1500CEAE', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(9, 'B1502CBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(10, 'B1502CVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(11, 'B1503CVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(12, 'B2402FBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(13, 'B2502CBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(14, 'B2502CVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(15, 'B2502FBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(16, 'B2502FVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(17, 'B3000DQ1A', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(18, 'B3302CEA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(19, 'B3302FEA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(20, 'B3402FBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(21, 'B3402FEA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(22, 'B3402FVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(23, 'B3404CMA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(24, 'B3604CMA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(25, 'B5402CBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(26, 'B5402CEA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(27, 'B5402CVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(28, 'B5402FEA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(29, 'B5402FVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(30, 'B5404CMA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(31, 'B5604CMA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(32, 'B5605CCA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(33, 'B6602FC2', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(34, 'B9400CBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(35, 'B9400CEA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(36, 'B9403CVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(37, 'B9450FA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(38, 'BM1403CDA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(39, 'BR1100FKA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(40, 'BR1102FGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(41, 'BR1104CGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(42, 'BR1104FGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(43, 'BR1204FGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(44, 'BR1402CGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(45, 'BR1402FGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(46, 'C202XA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(47, 'C204MA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(48, 'C213NA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(49, 'C214MA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(50, 'C423NA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(51, 'C424MA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(52, 'C425TA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(53, 'C433TA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(54, 'C434TA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(55, 'C436FA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(56, 'C523NA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(57, 'CM1400FXA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(58, 'CM1402CM2A', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(59, 'CM1402FM2A', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(60, 'CM3000DVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(61, 'CM3001DM2A', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(62, 'CM3200FM1A', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(63, 'CM3401FFA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(64, 'CM5500FDA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(65, 'CR1100CKA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(66, 'CR1100FKA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(67, 'CR1102CGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(68, 'CR1102FGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(69, 'CR1104CGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(70, 'CR1104CTA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(71, 'CR1104CTA_ID', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(72, 'CR1104FGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(73, 'CR1104FTA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(74, 'CR1204CTA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(75, 'CR1204FGA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(76, 'CR1204FTA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(77, 'CX1101CMA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(78, 'CX1400CKA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(79, 'CX1400FKA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(80, 'CX1405CKA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(81, 'CX1405CTA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(82, 'CX1500CKA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(83, 'CX1500CNA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(84, 'CX1505CKA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(85, 'CX1700CKA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(86, 'CX3400FMA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(87, 'CX3401FBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(88, 'CX3402CBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(89, 'CX3402CVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(90, 'CX5400FMA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(91, 'CX5403CMA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(92, 'CX5500FEA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(93, 'CX5601FBA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(94, 'CZ1000DVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(95, 'CZ1104CM2A', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(96, 'CZ1104FM2A', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(97, 'GA402XZ', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(98, 'L5404CHA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(99, 'P1412CEA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(100, 'P1503CVA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(101, 'P2451FA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(102, 'P5405CSA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(103, 'UX3402VA', NULL, NULL, 'active', '2025-11-27 22:54:33'),
(104, 'A3402WBA', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(105, 'A3402WBA_VN', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(106, 'A3402WVA', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(107, 'A5702WVA', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(108, 'AC65-03', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(109, 'AI2201', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(110, 'AI2202', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(111, 'AI2205', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(112, 'AI2302', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(113, 'AI2401', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(114, 'AI2501', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(115, 'ALL DESKTOP CONSUMER', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(116, 'AY2401', NULL, NULL, 'active', '2025-11-28 00:38:39'),
(117, 'B760M MAX GAMING WIFI', NULL, NULL, 'active', '2025-11-28 00:38:46'),
(118, 'BATTERY.BATT-LI PACK', NULL, NULL, 'active', '2025-11-28 00:38:46'),
(119, 'BD4', NULL, NULL, 'active', '2025-11-28 00:38:46'),
(120, 'BE24E', NULL, NULL, 'active', '2025-11-28 00:38:46'),
(121, 'C302CA', NULL, NULL, 'active', '2025-11-28 00:38:48'),
(122, 'CABLE.LCD/LVDS/EDP CABLE', NULL, NULL, 'active', '2025-11-28 00:38:49'),
(123, 'CABLE.POWER CORD', NULL, NULL, 'active', '2025-11-28 00:38:49'),
(124, 'CN65H2', NULL, NULL, 'active', '2025-11-28 00:38:50'),
(125, 'CN65H3', NULL, NULL, 'active', '2025-11-28 00:38:50'),
(126, 'CN67', NULL, NULL, 'active', '2025-11-28 00:38:50'),
(127, 'CN67-S1', NULL, NULL, 'active', '2025-11-28 00:38:50'),
(128, 'D500MD', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(129, 'D500SA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(130, 'D500SC', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(131, 'D500SE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(132, 'D700SC', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(133, 'D700SD', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(134, 'D701SER', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(135, 'DC300', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(136, 'DC500', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(137, 'DIP-74', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(138, 'DISPLAY.HINGE UP/TOUCH PANEL ASSY', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(139, 'E1404FA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(140, 'E1404GA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(141, 'E1504FA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(142, 'E1504GA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(143, 'E1600WKA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(144, 'E201NA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(145, 'E210KA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(146, 'E402BA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(147, 'E402SA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(148, 'E403SA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(149, 'E406MA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(150, 'E410KA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(151, 'E410MA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(152, 'E510KA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(153, 'E510MA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(154, 'E5402WHA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(155, 'EG500-E11', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(156, 'ESC N8-E11', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(157, 'ESC4000-E10', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(158, 'ESC4000-E11', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(159, 'ESC4000A-E11', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(160, 'ESC4000A-E12', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(161, 'ESC8000-E11', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(162, 'ESC8000A-E11', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(163, 'ESC8000A-E12', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(164, 'ESC8000A-E13', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(165, 'FA401KM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(166, 'FA401UU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(167, 'FA401UV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(168, 'FA401WV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(169, 'FA506IE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(170, 'FA506NC', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(171, 'FA506NCR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(172, 'FA506NF', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(173, 'FA506NFR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(174, 'FA507NU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(175, 'FA507NUR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(176, 'FA507NV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(177, 'FA507RE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(178, 'FA507RM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(179, 'FA507XI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(180, 'FA507XV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(181, 'FA607NU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(182, 'FA607PI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(183, 'FA607PV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(184, 'FA608UP', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(185, 'FA608WI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(186, 'FA608WV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(187, 'FA617NS', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(188, 'FA617NSR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(189, 'FA617NT', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(190, 'FA617XT', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(191, 'FA706IH', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(192, 'FA706IU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(193, 'FA706NF', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(194, 'FA706NFR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(195, 'FA707NU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(196, 'FA707NV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(197, 'FA707RM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(198, 'FA707XI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(199, 'FA707XU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(200, 'FA707XV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(201, 'FA808UM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(202, 'FA808UP', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(203, 'FX505DT', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(204, 'FX506HC', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(205, 'FX506HE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(206, 'FX506HF', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(207, 'FX506LH', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(208, 'FX506LI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(209, 'FX507VI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(210, 'FX507VU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(211, 'FX507VV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(212, 'FX507ZC4', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(213, 'FX507ZE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(214, 'FX507ZI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(215, 'FX516PR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(216, 'FX517ZC', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(217, 'FX517ZE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(218, 'FX517ZM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(219, 'FX517ZR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(220, 'FX607JV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(221, 'FX607VU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(222, 'FX608JHR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(223, 'FX608JMR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(224, 'FX608LP', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(225, 'FX706HF', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(226, 'FX706HM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(227, 'FX707VI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(228, 'FX707VV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(229, 'FX707ZC4', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(230, 'FX707ZE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(231, 'G10CE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(232, 'G10DK', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(233, 'G13CH', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(234, 'G13CHR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(235, 'G15CE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(236, 'G15CF', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(237, 'G15CK', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(238, 'G15CX', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(239, 'G15DK', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(240, 'G15DS', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(241, 'G16CH', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(242, 'G16CHR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(243, 'G21CX', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(244, 'G22CH', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(245, 'G35CA', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(246, 'G512LW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(247, 'G513IE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(248, 'G513QM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(249, 'G513QR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(250, 'G513QY', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(251, 'G513RC', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(252, 'G513RM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(253, 'G513RW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(254, 'G531GW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(255, 'G532LWS', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(256, 'G533QS', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(257, 'G533ZW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(258, 'G533ZX', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(259, 'G614FH', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(260, 'G614FM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(261, 'G614FR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(262, 'G614JI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(263, 'G614JIR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(264, 'G614JU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(265, 'G614JV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(266, 'G614JVR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(267, 'G614PP', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(268, 'G614PR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(269, 'G615JHR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(270, 'G615JMR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(271, 'G615JPR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(272, 'G615LP', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(273, 'G615LR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(274, 'G615LW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(275, 'G634JY', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(276, 'G634JYR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(277, 'G634JZ', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(278, 'G634JZR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(279, 'G635LW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(280, 'G635LX', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(281, 'G700TF', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(282, 'G700TF_US', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(283, 'G712LU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(284, 'G712LW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(285, 'G713PI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(286, 'G713PU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(287, 'G713PV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(288, 'G713QE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(289, 'G713QM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(290, 'G713QR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(291, 'G713QY', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(292, 'G713RC', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(293, 'G713RW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(294, 'G731GU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(295, 'G733CX', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(296, 'G733PY', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(297, 'G733PZ', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(298, 'G733QS', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(299, 'G733ZW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(300, 'G733ZX', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(301, 'G750JM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(302, 'G751JM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(303, 'G814FM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(304, 'G814FP', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(305, 'G814JI', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(306, 'G814JIR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(307, 'G814JV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(308, 'G814JVR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(309, 'G814JZ', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(310, 'G814PH', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(311, 'G814PM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(312, 'G814PP', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(313, 'G815LM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(314, 'G815LP', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(315, 'G815LR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(316, 'G815LW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(317, 'G834JY', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(318, 'G834JYR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(319, 'G834JZ', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(320, 'G834JZR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(321, 'G835LR', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(322, 'G835LW', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(323, 'G835LX', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(324, 'GA15DH', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(325, 'GA35DX', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(326, 'GA401QE', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(327, 'GA401QM', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(328, 'GA402NU', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(329, 'GA402RJ', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(330, 'GA402RK', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(331, 'GA402XV', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(332, 'GA402XY', NULL, NULL, 'active', '2025-11-28 00:38:55'),
(333, 'GA403UI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(334, 'GA403UM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(335, 'GA403UP', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(336, 'GA403UV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(337, 'GA403WR', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(338, 'GA502IV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(339, 'GA503QR', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(340, 'GA503QS', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(341, 'GA503RM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(342, 'GA503RS', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(343, 'GA503RW', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(344, 'GA605WI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(345, 'GA605WV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(346, 'GC33Y', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(347, 'GD300X', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(348, 'GL502VS', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(349, 'GL504GM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(350, 'GL504GS', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(351, 'GL552VW', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(352, 'GL702VI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(353, 'GL703GS', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(354, 'GL704GM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(355, 'GL752VW', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(356, 'GM700TZ', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(357, 'GT1030/CG110P', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(358, 'GT301', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(359, 'GU502GU', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(360, 'GU502GV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(361, 'GU502GW', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(362, 'GU502LW', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(363, 'GU603HE', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(364, 'GU603HM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(365, 'GU603VI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(366, 'GU603VV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(367, 'GU603ZM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(368, 'GU603ZU', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(369, 'GU603ZW', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(370, 'GU603ZX', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(371, 'GU604VI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(372, 'GU604VY', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(373, 'GU604VZ', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(374, 'GU605CM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(375, 'GU605CR', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(376, 'GU605CW', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(377, 'GU605CX', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(378, 'GU605MI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(379, 'GU605MV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(380, 'GU605MY', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(381, 'GU605MZ', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(382, 'GUSTO', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(383, 'GV301QE', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(384, 'GV301QH', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(385, 'GV301RE', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(386, 'GV302XA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(387, 'GV302XI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(388, 'GV302XU', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(389, 'GV302XV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(390, 'GV601VI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(391, 'GV601VV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(392, 'GX502GW', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(393, 'GX550LWS', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(394, 'GX551QM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(395, 'GX650PY', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(396, 'GX650PZ', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(397, 'GX701GVR', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(398, 'GX701GWR', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(399, 'GX701GXR', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(400, 'GX703HM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(401, 'GZ301VI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(402, 'GZ301VU', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(403, 'GZ301VV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(404, 'GZ302EA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(405, 'H310I-IM-A R3.0', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(406, 'H5600QM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(407, 'H5600QR', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(408, 'H610M-IM-A', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(409, 'H7600ZM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(410, 'H7600ZW', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(411, 'H7600ZX', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(412, 'H7604JI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(413, 'H7604JV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(414, 'H7606WI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(415, 'H7606WP', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(416, 'H7606WV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(417, 'HN7306WU', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(418, 'HN7306WV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(419, 'HT5306QA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(420, 'HYPER M.2 X16 GEN5 CARD', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(421, 'I/O MODULE.AIO KB/KB + MOUSE SET', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(422, 'I/O MODULE.GAMING NB SOFT KEYBOARD', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(423, 'I/O MODULE.NB SOFT KEYBOARD', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(424, 'K14PA-U12', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(425, 'K14PG-D24', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(426, 'K14PG-U12', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(427, 'K14PP-D24', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(428, 'K3405VF', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(429, 'K3502ZA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(430, 'K3605VC', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(431, 'K3605VU', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(432, 'K3605VV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(433, 'K3605ZF', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(434, 'K3704VA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(435, 'K501UW', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(436, 'K5504VA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(437, 'K5504VN', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(438, 'K6501ZM', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(439, 'K6502VJ', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(440, 'K6602VU', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(441, 'K6602VV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(442, 'K6602ZE', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(443, 'K6604JI', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(444, 'K6604JV', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(445, 'KMPG-D32', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(446, 'KMPP-D32', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(447, 'KRPG-U8', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(448, 'M1405YA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(449, 'M1407KA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(450, 'M1502QA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(451, 'M1502YA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(452, 'M1503QA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(453, 'M1505YA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(454, 'M1603QA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(455, 'M1605XA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(456, 'M1605YA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(457, 'M1607KA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(458, 'M1807HA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(459, 'M3400WYA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(460, 'M3401QC', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(461, 'M3402WFA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(462, 'M3502QA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(463, 'M3502RA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(464, 'M3702WFA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(465, 'M3704YA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(466, 'M5401WUA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(467, 'M5401WYA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(468, 'M5406WA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(469, 'M5506WA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(470, 'M5606KA', NULL, NULL, 'active', '2025-11-28 00:38:56'),
(471, 'M5606UA', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(472, 'M5606WA', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(473, 'M6400RC', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(474, 'M6500RC', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(475, 'M6500XV', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(476, 'M6501RR', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(477, 'M702', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(478, 'M7600QE', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(479, 'M7600RE', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(480, 'MB166', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(481, 'MB16A', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(482, 'N100I-EM-A', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(483, 'N501VW', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(484, 'N6506MJ', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(485, 'N6506MV', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(486, 'N97S-IM-AA', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(487, 'NR2201ZA', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(488, 'NR2201ZC', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(489, 'NR2201ZE', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(490, 'NR2202RM', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(491, 'NR2202RW', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(492, 'NR2202RX', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(493, 'NR2203RM', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(494, 'NR2203RW', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(495, 'NR2301L', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(496, 'NUC11AT', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(497, 'NUC12WSH-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(498, 'NUC12WSK-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(499, 'NUC13ANB-M', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(500, 'NUC13ANH-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(501, 'NUC13ANK', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(502, 'NUC13ANK-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(503, 'NUC13BRF', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(504, 'NUC13BRK', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(505, 'NUC13L3H-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(506, 'NUC13L3K-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(507, 'NUC13L5K-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(508, 'NUC14LNK', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(509, 'NUC14MNK-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(510, 'NUC14RVH', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(511, 'NUC14RVH-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(512, 'NUC14RVK-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(513, 'NUC14RVS', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(514, 'NUC14RVS-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(515, 'NUC14SRK', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(516, 'NUC14SRK-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(517, 'NUC15CRH-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(518, 'NUC15CRK', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(519, 'NUC15CRK-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(520, 'NUC15CRS', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(521, 'NUC15CRS-B', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(522, 'NUC15JNK', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(523, 'P12R-E', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(524, 'P12R-E/10G-2T', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(525, 'P12R-M/SYS', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(526, 'P1403CVA', NULL, NULL, 'active', '2025-11-28 00:38:57'),
(527, 'P440VA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(528, 'P470VA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(529, 'PA329 (QSD)', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(530, 'PA329CV', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(531, 'PB63-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(532, 'PD500TC', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(533, 'PD500TE', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(534, 'PE1100N', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(535, 'PE3000G', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(536, 'PL63-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(537, 'PL64', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(538, 'PL64-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(539, 'PN41-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(540, 'PN42', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(541, 'PN42-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(542, 'PN52-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(543, 'PN53', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(544, 'PN53-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(545, 'PN54-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(546, 'PN63-S1', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(547, 'PN63-S1-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(548, 'PN64', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(549, 'PN64-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(550, 'PN65', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(551, 'PN65-B', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(552, 'POWER MODULE.ADAPTER', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(553, 'PRIME B650-PLUS WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(554, 'PRIME B760M-A AX', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(555, 'PRIME H610I-PLUS D4', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(556, 'PRIME H610M-A D4', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(557, 'PRIME H810M-A', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(558, 'PRIME LC 360 ARGB', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(559, 'PRIME LC 360 LCD', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(560, 'PRIME Z890-P WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(561, 'PRO B660M-C D4', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(562, 'PRO B760M-CT', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(563, 'PRO WS TRX50-SAGE WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(564, 'PRO WS W680-ACE', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(565, 'PRO WS W680M-ACE SE', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(566, 'PRO WS W790-ACE', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(567, 'PRO WS W790E-SAGE SE', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(568, 'PRO WS WRX80E-SAGE SE WIFI II', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(569, 'PRO WS WRX90E-SAGE SE', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(570, 'PROART LC 420', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(571, 'PROART Z890-CREATOR WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(572, 'PSU/1000W+', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(573, 'PSU/800-1000W', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(574, 'PSU/ASUS GOLD', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(575, 'PSU/ROG SFX-L', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(576, 'PSU/ROG STRIX PLATINUM', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(577, 'PSU/ROG STRIX V2', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(578, 'PSU/ROG THOR PLATINUM V2', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(579, 'PSU/ROG THOR TITANIUM', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(580, 'PSU/ROG THOR V3', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(581, 'PSU/ROG-STRIX', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(582, 'PSU/TUF GOLD', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(583, 'Q470EA-IM-A', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(584, 'Q670EA-IM-A', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(585, 'Q670EI-IM-A', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(586, 'Q670EM-IM-A', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(587, 'RC72LA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(588, 'RG16LX4-C2PD-RD-PL1', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(589, 'RG16RX4-C2PD-RD-PL1', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(590, 'ROG CROSSHAIR VIII DARK HERO', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(591, 'ROG CROSSHAIR VIII HERO(WI-FI)', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(592, 'ROG CROSSHAIR X670E HERO', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(593, 'ROG MAXIMUS Z790 DARK HERO', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(594, 'ROG MAXIMUS Z790 HERO', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(595, 'ROG RYUJIN II 360', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(596, 'ROG RYUJIN III 240', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(597, 'ROG RYUJIN III 360 EXTREME', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(598, 'ROG RYUJIN III 360', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(599, 'ROG RYUO III 240 ARGB', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(600, 'ROG RYUO III 360 ARGB', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(601, 'ROG STRIX B850-I GAMING WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(602, 'ROG STRIX B860-I GAMING WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(603, 'ROG STRIX LC 240', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(604, 'ROG STRIX LC II 240', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(605, 'ROG STRIX LC II 280 ARGB', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(606, 'ROG STRIX LC II 360', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(607, 'ROG STRIX LC III 360 LCD', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(608, 'ROG STRIX LC III 360', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(609, 'ROG STRIX X870-A GAMING WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(610, 'ROG STRIX Z790-A GAMING WIFI II', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(611, 'ROG STRIX Z790-A GAMING WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(612, 'ROG STRIX Z790-F GAMING WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(613, 'ROG STRIX Z790-I GAMING WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(614, 'ROG STRIX Z890-I GAMING WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(615, 'RS300-E11', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(616, 'RS300-E12', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(617, 'RS500A-E12', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(618, 'RS501A-E12', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(619, 'RS520A-E11', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(620, 'RS520A-E12', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(621, 'RS700-E10', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(622, 'RS700-E12', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(623, 'RS700-E9', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(624, 'RS700A-E11', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(625, 'RS700A-E12', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(626, 'RS720-E11', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(627, 'RS720A-E11', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(628, 'RS720A-E12', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(629, 'RS721Q-E11', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(630, 'RT-BE88U', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(631, 'RTX2070S/CG180P2', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(632, 'RTX3080/CG132BS3', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(633, 'RTX3090/CG132BS', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(634, 'RTX4060/CG1737P', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(635, 'RTX4070/CG1413PBI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(636, 'RTX4090/CG1393PBI2', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(637, 'RTX4090/CG139BS', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(638, 'RTX4090/CG139PB', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(639, 'RTX5060/CG15225BP2', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(640, 'RTX5080/CG14745BP', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(641, 'RTX5080/CG14745BS', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(642, 'RTX5080/CG14745PBI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(643, 'RTX5090/CG14530BS', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(644, 'RX6700XT/D512BS', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(645, 'RX8800XT/G295BP', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(646, 'RX9060XT/G262BP', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(647, 'S14NA-U12', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(648, 'S300MA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(649, 'S500MC', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(650, 'S501MD', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(651, 'S501MER', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(652, 'S5402ZA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(653, 'S5406MA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(654, 'S5406SA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(655, 'S5506MA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(656, 'S5507QA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(657, 'S5602ZA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(658, 'S5606CA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(659, 'S5606MA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(660, 'SYS MODULE.FUNCTIONAL STYLUS PEN', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(661, 'SYS MODULE.SPEAKER(SINGLE)', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(662, 'SYS MODULE.VGA/GRAPHIC CARD', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(663, 'T100HA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(664, 'T100TA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(665, 'T3300KA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(666, 'T500MV', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(667, 'TF300T', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(668, 'THUNDERBOLTEX 4', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(669, 'THUNDERBOLTEX 5', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(670, 'TN3402QA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(671, 'TN3604YA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(672, 'TP1400KA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(673, 'TP3402ZA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(674, 'TP3407SA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(675, 'TP3604VA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(676, 'TP3607SA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(677, 'TP401MA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(678, 'TP401NA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(679, 'TP412FA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(680, 'TP420UA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(681, 'TP470EA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(682, 'TP500LA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(683, 'TPM-SPI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(684, 'TUF GAMING B550-PLUS WIFI II', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(685, 'TUF GAMING B650-PLUS WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(686, 'TUF GAMING X870E-PLUS WIFI7', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(687, 'TUF GAMING Z590-PLUS', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(688, 'TUF GAMING Z790-PLUS WIFI', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(689, 'UM3402YA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(690, 'UM3406HA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(691, 'UM3406KA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(692, 'UM3504DA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(693, 'UM5302TA', NULL, NULL, 'active', '2025-11-28 00:38:58'),
(694, 'UM5606KA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(695, 'UM5606WA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(696, 'UM6702RA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(697, 'UM6702RC', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(698, 'UN5401QA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(699, 'UN5401RA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(700, 'UNIBODY-Q670E', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(701, 'UP3404VA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(702, 'UP5302ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(703, 'UP6502ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(704, 'UP6502ZD', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(705, 'UX325EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(706, 'UX325UA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(707, 'UX331UA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(708, 'UX333FA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(709, 'UX334FL', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(710, 'UX3402ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(711, 'UX3404VA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(712, 'UX3404VC', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(713, 'UX3405CA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(714, 'UX3405MA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(715, 'UX3407QA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(716, 'UX360CA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(717, 'UX363EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(718, 'UX370UA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(719, 'UX393EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(720, 'UX425EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(721, 'UX425QA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(722, 'UX425UG', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(723, 'UX430UQ', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(724, 'UX431DA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(725, 'UX431FA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(726, 'UX433FA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(727, 'UX434DA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(728, 'UX434FL', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(729, 'UX434IQ', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(730, 'UX481FA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(731, 'UX481FL', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(732, 'UX482EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(733, 'UX482EG', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(734, 'UX5304MA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(735, 'UX5304VA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(736, 'UX533FD', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(737, 'UX534FT', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(738, 'UX535LI', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(739, 'UX535QE', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(740, 'UX5400EG', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(741, 'UX5400ZF', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(742, 'UX5401ZAS', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(743, 'UX5406SA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(744, 'UX550VE', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(745, 'UX5606SA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(746, 'UX561UA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(747, 'UX562FA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(748, 'UX562FD', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(749, 'UX562UG', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(750, 'UX563FD', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(751, 'UX564EH', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(752, 'UX564EI', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(753, 'UX581GV', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(754, 'UX581LV', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(755, 'UX582HM', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(756, 'UX582HS', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(757, 'UX582LR', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(758, 'UX582ZM', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(759, 'UX582ZW', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(760, 'UX6404VI', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(761, 'UX6404VV', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(762, 'UX7602ZM', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(763, 'UX8402VU', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(764, 'UX8402VV', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(765, 'UX8402ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(766, 'UX8402ZE', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(767, 'UX8406CA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(768, 'UX8406MA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(769, 'UX9702AA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(770, 'V241DA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(771, 'V241EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(772, 'V272UA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(773, 'V3607VJ', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(774, 'V3607VM', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(775, 'V3607VU', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(776, 'V500MV', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(777, 'VG248', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(778, 'VG258', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(779, 'VG27AQ', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(780, 'VG27AQ3A', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(781, 'VG27VQ3B', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(782, 'VG27VQM1B', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(783, 'VG3281B', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(784, 'W5600Q2A', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(785, 'W590G6T', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(786, 'W700G3T', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(787, 'W7600H5A', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(788, 'W7600Z3A', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(789, 'W7604J3D', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(790, 'WS X299 SAGE', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(791, 'WS X299 SAGE/10G', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(792, 'X1404VA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(793, 'X1404VAP', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(794, 'X1404ZA', NULL, NULL, 'active', '2025-11-28 00:38:59');
INSERT INTO `models` (`id`, `name`, `model_number`, `notes`, `status`, `created_at`) VALUES
(795, 'X1407QA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(796, 'X1502VA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(797, 'X1502ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(798, 'X1504VA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(799, 'X1504VAP', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(800, 'X1504ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(801, 'X1505VA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(802, 'X1603ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(803, 'X1605VA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(804, 'X1605VAP', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(805, 'X1605ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(806, 'X1607QA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(807, 'X1703ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(808, 'X1704VA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(809, 'X1704VAP', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(810, 'X1704ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(811, 'X3400PA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(812, 'X411UN', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(813, 'X412DA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(814, 'X415EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(815, 'X415UA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(816, 'X421EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(817, 'X435EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(818, 'X510UA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(819, 'X512DA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(820, 'X512FA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(821, 'X512JA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(822, 'X513EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(823, 'X513EQ', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(824, 'X515DA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(825, 'X515EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(826, 'X521EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(827, 'X521FA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(828, 'X521IA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(829, 'X532FL', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(830, 'X540BA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(831, 'X540SA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(832, 'X550ZA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(833, 'X551CA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(834, 'X551MA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(835, 'X553MA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(836, 'X553SA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(837, 'X555LA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(838, 'X555QA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(839, 'X571LI', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(840, 'X712DA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(841, 'X712EA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(842, 'X712JA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(843, 'X712UA', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(844, 'X7600PC', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(845, 'XT9', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(846, 'Z12PG-D16', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(847, 'Z13PE-D16', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(848, 'Z890 FPS-II CARD', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(849, 'ZS590KS', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(850, 'ZS630KL', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(851, 'ZS660KL', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(852, 'ZS661KS', NULL, NULL, 'active', '2025-11-28 00:38:59'),
(853, 'ZS676KS', NULL, NULL, 'active', '2025-11-28 00:38:59');

-- --------------------------------------------------------

--
-- Table structure for table `platforms`
--

CREATE TABLE `platforms` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `platforms`
--

INSERT INTO `platforms` (`id`, `name`, `status`, `created_at`) VALUES
(1, 'ChromeOS', 'active', '2025-11-27 20:53:36'),
(2, 'Windows', 'active', '2025-11-27 20:53:47'),
(3, 'Linux', 'active', '2025-11-27 23:18:50');

-- --------------------------------------------------------

--
-- Table structure for table `sequential_counters`
--

CREATE TABLE `sequential_counters` (
  `id` int NOT NULL DEFAULT '1',
  `current_letter` char(1) NOT NULL DEFAULT 'A',
  `current_number` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `sequential_counters`
--

INSERT INTO `sequential_counters` (`id`, `current_letter`, `current_number`, `updated_at`) VALUES
(1, 'A', 24, '2025-11-28 04:38:08');

-- --------------------------------------------------------

--
-- Table structure for table `technicians`
--

CREATE TABLE `technicians` (
  `id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `notes` text,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `technicians`
--

INSERT INTO `technicians` (`id`, `name`, `notes`, `status`, `created_at`) VALUES
(1, 'test_tech', '', 'inactive', '2025-11-27 21:03:05'),
(2, 'Abdul Sey', NULL, 'active', '2025-11-27 22:20:40'),
(3, 'Adisleydis_Rodriguez', NULL, 'active', '2025-11-27 22:20:40'),
(4, 'Adonis de la Torre', NULL, 'active', '2025-11-27 22:20:40'),
(5, 'Aimee Feria', NULL, 'active', '2025-11-27 22:20:40'),
(6, 'Aimee_Reyna', NULL, 'active', '2025-11-27 22:20:40'),
(7, 'Alan Cheng', NULL, 'active', '2025-11-27 22:20:40'),
(8, 'Alexis Delacruz', NULL, 'active', '2025-11-27 22:20:40'),
(9, 'Ana Labanino', NULL, 'active', '2025-11-27 22:20:40'),
(10, 'Andres Hernandez', NULL, 'active', '2025-11-27 22:20:40'),
(11, 'Anthony_Spencer', NULL, 'active', '2025-11-27 22:20:40'),
(12, 'Ariel2_Delgado', NULL, 'active', '2025-11-27 22:20:40'),
(13, 'Aura_Duran', NULL, 'active', '2025-11-27 22:20:40'),
(14, 'Bonnie Ly', NULL, 'active', '2025-11-27 22:20:40'),
(15, 'Brandon Troutman', NULL, 'active', '2025-11-27 22:20:40'),
(16, 'Brandon Williams', NULL, 'active', '2025-11-27 22:20:40'),
(17, 'Brenda Chao', NULL, 'active', '2025-11-27 22:20:40'),
(18, 'Brent_Voignier', NULL, 'active', '2025-11-27 22:20:40'),
(19, 'Carina Navarro', NULL, 'active', '2025-11-27 22:20:40'),
(20, 'Carlos Tapia', NULL, 'active', '2025-11-27 22:20:40'),
(21, 'Castro Rivas Reynaldo', NULL, 'active', '2025-11-27 22:20:40'),
(22, 'Chad Smart', NULL, 'active', '2025-11-27 22:20:40'),
(23, 'CHARGE_CMS', NULL, 'active', '2025-11-27 22:20:40'),
(24, 'CHARGE_CUSTOMER', NULL, 'active', '2025-11-27 22:20:40'),
(25, 'CHARGE_PAYPAL', NULL, 'active', '2025-11-27 22:20:40'),
(26, 'Chase Robinson', NULL, 'active', '2025-11-27 22:20:40'),
(27, 'Cheryl Kost', NULL, 'active', '2025-11-27 22:20:40'),
(28, 'Cheyenne_Jones', NULL, 'active', '2025-11-27 22:20:40'),
(29, 'Chuong Nguyen', NULL, 'active', '2025-11-27 22:20:40'),
(30, 'Cinthia_Rodriguez', NULL, 'active', '2025-11-27 22:20:40'),
(31, 'Claudia Zorilla', NULL, 'active', '2025-11-27 22:20:40'),
(32, 'Daniela2_Garcia', NULL, 'active', '2025-11-27 22:20:40'),
(33, 'Danielle Elliot', NULL, 'active', '2025-11-27 22:20:40'),
(34, 'David Fields', NULL, 'active', '2025-11-27 22:20:40'),
(35, 'David Kim', NULL, 'active', '2025-11-27 22:20:40'),
(36, 'Dorothy Wellinghurst', NULL, 'active', '2025-11-27 22:20:40'),
(37, 'Elianis_Almaguer', NULL, 'active', '2025-11-27 22:20:40'),
(38, 'Eloy Vilacha', NULL, 'active', '2025-11-27 22:20:40'),
(39, 'Ezequiel Bermudez', NULL, 'active', '2025-11-27 22:20:40'),
(40, 'Geilin Penate', NULL, 'active', '2025-11-27 22:20:40'),
(41, 'Ging Zhang', NULL, 'active', '2025-11-27 22:20:40'),
(42, 'Giselis_Rodriguez', NULL, 'active', '2025-11-27 22:20:40'),
(43, 'Guillermo_Alonso', NULL, 'active', '2025-11-27 22:20:40'),
(44, 'Gustavo_Silva', NULL, 'active', '2025-11-27 22:20:40'),
(45, 'Hamidullah Rubin', NULL, 'active', '2025-11-27 22:20:40'),
(46, 'Heidy_Rangel', NULL, 'active', '2025-11-27 22:20:40'),
(47, 'Hillegas Brian A.', NULL, 'active', '2025-11-27 22:20:40'),
(48, 'Husni Beltran', NULL, 'active', '2025-11-27 22:20:40'),
(49, 'Ilsimary Hernandez', NULL, 'active', '2025-11-27 22:20:40'),
(50, 'Jacob Williams', NULL, 'active', '2025-11-27 22:20:40'),
(51, 'Jiaqi Chen', NULL, 'active', '2025-11-27 22:20:40'),
(52, 'John_Bindner', NULL, 'active', '2025-11-27 22:20:40'),
(53, 'Johnathon Geary', NULL, 'active', '2025-11-27 22:20:40'),
(54, 'Jose Ramirez', NULL, 'active', '2025-11-27 22:20:40'),
(55, 'Juan Carlos-Diaz', NULL, 'active', '2025-11-27 22:20:40'),
(56, 'Katie Bindner', NULL, 'active', '2025-11-27 22:20:40'),
(57, 'Kevin_Blakely', NULL, 'active', '2025-11-27 22:20:40'),
(58, 'Kieran Oconnell', NULL, 'active', '2025-11-27 22:20:40'),
(59, 'KYRED04', NULL, 'active', '2025-11-27 22:20:40'),
(60, 'KYRED13', NULL, 'active', '2025-11-27 22:20:40'),
(61, 'LAY KATHY', NULL, 'active', '2025-11-27 22:20:40'),
(62, 'Lian Rual Dik', NULL, 'active', '2025-11-27 22:20:40'),
(63, 'Lilian Madariaga', NULL, 'active', '2025-11-27 22:20:40'),
(64, 'Lina Yang', NULL, 'active', '2025-11-27 22:20:40'),
(65, 'Lisandra Montero', NULL, 'active', '2025-11-27 22:20:40'),
(66, 'Lisbet Gonzalez', NULL, 'active', '2025-11-27 22:20:40'),
(67, 'Liset Rabaza', NULL, 'active', '2025-11-27 22:20:40'),
(68, 'Lisy Cocera', NULL, 'active', '2025-11-27 22:20:40'),
(69, 'Lizardo_Lazaro', NULL, 'active', '2025-11-27 22:20:40'),
(70, 'Lupe Castro', NULL, 'active', '2025-11-27 22:20:40'),
(71, 'Madelin_Delgado', NULL, 'active', '2025-11-27 22:20:40'),
(72, 'Makayla_Castilla', NULL, 'active', '2025-11-27 22:20:41'),
(73, 'Maria Guerra', NULL, 'active', '2025-11-27 22:20:41'),
(74, 'Mark Chang', NULL, 'active', '2025-11-27 22:20:41'),
(75, 'Milagros Sanchez', NULL, 'active', '2025-11-27 22:20:41'),
(76, 'Min_Soe', NULL, 'active', '2025-11-27 22:20:41'),
(77, 'Nien-Ting_Wu', NULL, 'active', '2025-11-27 22:20:41'),
(78, 'Olaisis Hernandez', NULL, 'active', '2025-11-27 22:20:41'),
(79, 'Osvaldo_Barzaga', NULL, 'active', '2025-11-27 22:20:41'),
(80, 'Patricia_Basham', NULL, 'active', '2025-11-27 22:20:41'),
(81, 'Quan Do', NULL, 'active', '2025-11-27 22:20:41'),
(82, 'Reinier_Acosta', NULL, 'active', '2025-11-27 22:20:41'),
(83, 'Ricardo_Guillen', NULL, 'active', '2025-11-27 22:20:41'),
(84, 'Richard_Fuentes', NULL, 'active', '2025-11-27 22:20:41'),
(85, 'Robert Metzger', NULL, 'active', '2025-11-27 22:20:41'),
(86, 'Roger_Puig', NULL, 'active', '2025-11-27 22:20:41'),
(87, 'Ryan_Whitehead', NULL, 'active', '2025-11-27 22:20:41'),
(88, 'Sadieska Leyva', NULL, 'active', '2025-11-27 22:20:41'),
(89, 'Sean Miles', NULL, 'active', '2025-11-27 22:20:41'),
(90, 'SHARON WILLIS', NULL, 'active', '2025-11-27 22:20:41'),
(91, 'Shayne_Mueller', NULL, 'active', '2025-11-27 22:20:41'),
(92, 'Simon Mehary', NULL, 'active', '2025-11-27 22:20:41'),
(93, 'Tommy Chiang', NULL, 'active', '2025-11-27 22:20:41'),
(94, 'UCS KBO JOB', NULL, 'active', '2025-11-27 22:20:41'),
(95, 'UCS-REPAIR-JOB', NULL, 'active', '2025-11-27 22:20:41'),
(96, 'Vianne Rivero', NULL, 'active', '2025-11-27 22:20:41'),
(97, 'Yadith5_castillo', NULL, 'active', '2025-11-27 22:20:41'),
(98, 'Yanet Garcia', NULL, 'active', '2025-11-27 22:20:41'),
(99, 'Yanet Rodriguez', NULL, 'active', '2025-11-27 22:20:41'),
(100, 'Yilena Teruel', NULL, 'active', '2025-11-27 22:20:41'),
(101, 'Ying Wang', NULL, 'active', '2025-11-27 22:20:41'),
(102, 'Yisel Cume', NULL, 'active', '2025-11-27 22:20:41'),
(103, 'Yudislay Jimenez', NULL, 'active', '2025-11-27 22:20:41'),
(104, 'Yuliana Garcia', NULL, 'active', '2025-11-27 22:20:41'),
(105, 'Yuliet Aguila', NULL, 'active', '2025-11-27 22:20:41');

-- --------------------------------------------------------

--
-- Table structure for table `usb_drives`
--

CREATE TABLE `usb_drives` (
  `id` int NOT NULL,
  `usb_id` varchar(4) NOT NULL,
  `platform_id` int NOT NULL,
  `usb_type_id` int NOT NULL,
  `model_id` int DEFAULT NULL,
  `version_id` int NOT NULL,
  `technician_id` int DEFAULT NULL,
  `status` enum('assigned','pending_update','damaged','lost','retired','on_hold') DEFAULT 'assigned',
  `custom_text` varchar(12) DEFAULT NULL,
  `hardware_model` varchar(100) DEFAULT NULL,
  `hardware_serial` varchar(100) DEFAULT NULL,
  `capacity_gb` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `usb_drives`
--

INSERT INTO `usb_drives` (`id`, `usb_id`, `platform_id`, `usb_type_id`, `model_id`, `version_id`, `technician_id`, `status`, `custom_text`, `created_at`, `updated_at`) VALUES
(1, 'A001', 1, 3, 1, 2, 8, 'retired', 'test_custom', '2025-11-27 21:02:50', '2025-11-27 23:24:12'),
(2, 'A002', 1, 3, 1, 2, 8, 'retired', 'text', '2025-11-27 21:47:17', '2025-11-27 23:24:12'),
(3, 'A003', 1, 3, 1, 2, 8, 'retired', 'text', '2025-11-27 21:47:17', '2025-11-27 23:24:12'),
(4, 'A004', 1, 3, 1, 2, 8, 'retired', 'text', '2025-11-27 21:47:17', '2025-11-27 23:24:12'),
(5, 'A005', 1, 3, 1, 2, 8, 'retired', 'text', '2025-11-27 21:47:17', '2025-11-27 23:24:12'),
(6, 'A006', 1, 3, 1, 2, 8, 'retired', 'text', '2025-11-27 21:47:17', '2025-11-27 23:24:12'),
(7, 'A007', 1, 3, 1, 2, 8, 'retired', 'text', '2025-11-27 21:47:17', '2025-11-27 23:24:12'),
(8, 'A008', 1, 3, 1, 2, 8, 'retired', 'text', '2025-11-27 21:47:17', '2025-11-27 23:24:12'),
(9, 'A009', 1, 3, 1, 2, 8, 'retired', 'text', '2025-11-27 21:47:17', '2025-11-27 23:24:12'),
(10, 'A010', 1, 3, 1, 2, 8, 'retired', 'text', '2025-11-27 21:47:17', '2025-11-27 23:24:12'),
(11, 'A011', 1, 3, 1, 2, 8, 'retired', 'text', '2025-11-27 21:47:17', '2025-11-27 23:24:12'),
(12, 'A012', 2, 4, NULL, 4, 2, 'retired', 'test', '2025-11-27 21:59:22', '2025-11-27 23:24:39'),
(13, 'A013', 2, 4, NULL, 4, 2, 'retired', 'test', '2025-11-27 22:32:17', '2025-11-27 23:25:08'),
(14, 'A014', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:37:44', '2025-11-28 04:45:04'),
(15, 'A015', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:38:08', '2025-11-28 04:45:04'),
(16, 'A016', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:38:08', '2025-11-28 04:45:04'),
(17, 'A017', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:38:08', '2025-11-28 04:45:04'),
(18, 'A018', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:38:08', '2025-11-28 04:45:04'),
(19, 'A019', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:38:08', '2025-11-28 04:45:04'),
(20, 'A020', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:38:08', '2025-11-28 04:45:04'),
(21, 'A021', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:38:08', '2025-11-28 04:45:04'),
(22, 'A022', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:38:08', '2025-11-28 04:45:04'),
(23, 'A023', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:38:08', '2025-11-28 04:45:04'),
(24, 'A024', 1, 3, 84, 5, 8, 'retired', NULL, '2025-11-28 04:38:08', '2025-11-28 04:45:04');

-- --------------------------------------------------------

--
-- Table structure for table `usb_types`
--

CREATE TABLE `usb_types` (
  `id` int NOT NULL,
  `platform_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `requires_model` tinyint(1) DEFAULT '0',
  `supports_legacy` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `usb_types`
--

INSERT INTO `usb_types` (`id`, `platform_id`, `name`, `requires_model`, `supports_legacy`, `status`, `created_at`) VALUES
(1, 1, 'RECOVERY', 1, 1, 'active', '2025-11-27 20:54:07'),
(2, 1, 'RMA_SHIM', 1, 0, 'active', '2025-11-27 20:54:19'),
(3, 1, 'CPTI', 1, 0, 'active', '2025-11-27 20:54:27'),
(4, 2, 'WTP', 0, 0, 'active', '2025-11-27 20:54:43'),
(5, 3, 'EDT', 0, 0, 'active', '2025-11-27 23:19:09');

-- --------------------------------------------------------

--
-- Table structure for table `versions`
--

CREATE TABLE `versions` (
  `id` int NOT NULL,
  `usb_type_id` int NOT NULL,
  `model_id` int DEFAULT NULL,
  `version_code` varchar(100) NOT NULL,
  `is_current` tinyint(1) DEFAULT '0',
  `is_legacy_valid` tinyint(1) DEFAULT '0',
  `official_link` varchar(500) DEFAULT NULL,
  `internal_link` varchar(500) DEFAULT NULL,
  `comments` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `marked_current_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `versions`
--

INSERT INTO `versions` (`id`, `usb_type_id`, `model_id`, `version_code`, `is_current`, `is_legacy_valid`, `official_link`, `internal_link`, `comments`, `created_at`, `marked_current_at`) VALUES
(1, 3, 1, 'v128', 0, 0, '', '', '', '2025-11-27 21:02:36', '2025-11-27 22:29:32'),
(2, 3, 1, 'v129', 1, 0, NULL, NULL, NULL, '2025-11-27 21:49:40', '2025-11-27 22:29:42'),
(3, 4, NULL, '112725', 0, 0, NULL, NULL, NULL, '2025-11-27 21:59:08', '2025-11-27 21:59:09'),
(4, 4, NULL, '112726', 1, 0, NULL, NULL, NULL, '2025-11-27 22:35:11', '2025-11-27 22:35:11'),
(5, 3, 84, 'test version', 1, 0, NULL, NULL, NULL, '2025-11-28 04:37:10', '2025-11-28 04:37:10');

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_model_version_summary`
-- (See below for the actual view)
--
CREATE TABLE `v_model_version_summary` (
`is_current` tinyint(1)
,`is_legacy_valid` tinyint(1)
,`model_id` int
,`model_name` varchar(100)
,`usb_count` bigint
,`usb_type_id` int
,`usb_type_name` varchar(100)
,`version_code` varchar(100)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_pending_updates`
-- (See below for the actual view)
--
CREATE TABLE `v_pending_updates` (
`custom_text` varchar(12)
,`id` int
,`model_name` varchar(100)
,`platform_name` varchar(100)
,`technician_id` int
,`technician_name` varchar(100)
,`usb_id` varchar(4)
,`usb_type_name` varchar(100)
,`version_code` varchar(100)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `v_usb_drives_full`
-- (See below for the actual view)
--
CREATE TABLE `v_usb_drives_full` (
`created_at` timestamp
,`custom_text` varchar(12)
,`id` int
,`is_legacy_valid` tinyint(1)
,`model_id` int
,`model_name` varchar(100)
,`model_number` varchar(100)
,`platform_id` int
,`platform_name` varchar(100)
,`requires_model` tinyint(1)
,`status` enum('assigned','pending_update','damaged','lost','retired')
,`supports_legacy` tinyint(1)
,`technician_id` int
,`technician_name` varchar(100)
,`technician_status` enum('active','inactive')
,`updated_at` timestamp
,`usb_id` varchar(4)
,`usb_type_id` int
,`usb_type_name` varchar(100)
,`version_code` varchar(100)
,`version_id` int
,`version_is_current` tinyint(1)
);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `event_logs`
--
ALTER TABLE `event_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_usb` (`usb_id`,`timestamp`),
  ADD KEY `idx_timestamp` (`timestamp`),
  ADD KEY `idx_event_type` (`event_type`);

--
-- Indexes for table `models`
--
ALTER TABLE `models`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_model` (`name`,`model_number`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `platforms`
--
ALTER TABLE `platforms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `sequential_counters`
--
ALTER TABLE `sequential_counters`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `technicians`
--
ALTER TABLE `technicians`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `usb_drives`
--
ALTER TABLE `usb_drives`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usb_id` (`usb_id`),
  ADD KEY `model_id` (`model_id`),
  ADD KEY `idx_usb_id` (`usb_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_platform` (`platform_id`),
  ADD KEY `idx_type` (`usb_type_id`),
  ADD KEY `idx_version` (`version_id`),
  ADD KEY `idx_technician` (`technician_id`),
  ADD KEY `idx_type_version_status` (`usb_type_id`,`version_id`,`status`);

--
-- Indexes for table `usb_types`
--
ALTER TABLE `usb_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_platform_type` (`platform_id`,`name`),
  ADD KEY `idx_platform` (`platform_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `versions`
--
ALTER TABLE `versions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_version` (`usb_type_id`,`model_id`,`version_code`),
  ADD KEY `model_id` (`model_id`),
  ADD KEY `idx_type_current` (`usb_type_id`,`is_current`),
  ADD KEY `idx_type_model` (`usb_type_id`,`model_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `event_logs`
--
ALTER TABLE `event_logs`
  MODIFY `id` bigint NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=145;

--
-- AUTO_INCREMENT for table `models`
--
ALTER TABLE `models`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=854;

--
-- AUTO_INCREMENT for table `platforms`
--
ALTER TABLE `platforms`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `technicians`
--
ALTER TABLE `technicians`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT for table `usb_drives`
--
ALTER TABLE `usb_drives`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `usb_types`
--
ALTER TABLE `usb_types`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `versions`
--
ALTER TABLE `versions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

-- --------------------------------------------------------

--
-- Structure for view `v_model_version_summary`
--
DROP TABLE IF EXISTS `v_model_version_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_model_version_summary`  AS SELECT `m`.`id` AS `model_id`, `m`.`name` AS `model_name`, `t`.`id` AS `usb_type_id`, `t`.`name` AS `usb_type_name`, `v`.`version_code` AS `version_code`, `v`.`is_current` AS `is_current`, `v`.`is_legacy_valid` AS `is_legacy_valid`, count(`u`.`id`) AS `usb_count` FROM (((`models` `m` join `usb_types` `t`) left join `versions` `v` on(((`v`.`model_id` = `m`.`id`) and (`v`.`usb_type_id` = `t`.`id`) and (`v`.`is_current` = true)))) left join `usb_drives` `u` on(((`u`.`model_id` = `m`.`id`) and (`u`.`usb_type_id` = `t`.`id`)))) WHERE (`t`.`requires_model` = true) GROUP BY `m`.`id`, `m`.`name`, `t`.`id`, `t`.`name`, `v`.`version_code`, `v`.`is_current`, `v`.`is_legacy_valid` ;

-- --------------------------------------------------------

--
-- Structure for view `v_pending_updates`
--
DROP TABLE IF EXISTS `v_pending_updates`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_pending_updates`  AS SELECT `u`.`id` AS `id`, `u`.`usb_id` AS `usb_id`, `u`.`custom_text` AS `custom_text`, `p`.`name` AS `platform_name`, `t`.`name` AS `usb_type_name`, `m`.`name` AS `model_name`, `v`.`version_code` AS `version_code`, `tech`.`id` AS `technician_id`, `tech`.`name` AS `technician_name` FROM (((((`usb_drives` `u` join `platforms` `p` on((`u`.`platform_id` = `p`.`id`))) join `usb_types` `t` on((`u`.`usb_type_id` = `t`.`id`))) left join `models` `m` on((`u`.`model_id` = `m`.`id`))) join `versions` `v` on((`u`.`version_id` = `v`.`id`))) left join `technicians` `tech` on((`u`.`technician_id` = `tech`.`id`))) WHERE (`u`.`status` = 'pending_update') ORDER BY `tech`.`name` ASC, `u`.`usb_id` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `v_usb_drives_full`
--
DROP TABLE IF EXISTS `v_usb_drives_full`;

CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `v_usb_drives_full`  AS SELECT `u`.`id` AS `id`, `u`.`usb_id` AS `usb_id`, `u`.`status` AS `status`, `u`.`custom_text` AS `custom_text`, `u`.`created_at` AS `created_at`, `u`.`updated_at` AS `updated_at`, `p`.`id` AS `platform_id`, `p`.`name` AS `platform_name`, `t`.`id` AS `usb_type_id`, `t`.`name` AS `usb_type_name`, `t`.`requires_model` AS `requires_model`, `t`.`supports_legacy` AS `supports_legacy`, `m`.`id` AS `model_id`, `m`.`name` AS `model_name`, `m`.`model_number` AS `model_number`, `v`.`id` AS `version_id`, `v`.`version_code` AS `version_code`, `v`.`is_current` AS `version_is_current`, `v`.`is_legacy_valid` AS `is_legacy_valid`, `tech`.`id` AS `technician_id`, `tech`.`name` AS `technician_name`, `tech`.`status` AS `technician_status` FROM (((((`usb_drives` `u` join `platforms` `p` on((`u`.`platform_id` = `p`.`id`))) join `usb_types` `t` on((`u`.`usb_type_id` = `t`.`id`))) left join `models` `m` on((`u`.`model_id` = `m`.`id`))) join `versions` `v` on((`u`.`version_id` = `v`.`id`))) left join `technicians` `tech` on((`u`.`technician_id` = `tech`.`id`))) ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `event_logs`
--
ALTER TABLE `event_logs`
  ADD CONSTRAINT `event_logs_ibfk_1` FOREIGN KEY (`usb_id`) REFERENCES `usb_drives` (`id`);

--
-- Constraints for table `usb_drives`
--
ALTER TABLE `usb_drives`
  ADD CONSTRAINT `usb_drives_ibfk_1` FOREIGN KEY (`platform_id`) REFERENCES `platforms` (`id`),
  ADD CONSTRAINT `usb_drives_ibfk_2` FOREIGN KEY (`usb_type_id`) REFERENCES `usb_types` (`id`),
  ADD CONSTRAINT `usb_drives_ibfk_3` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`),
  ADD CONSTRAINT `usb_drives_ibfk_4` FOREIGN KEY (`version_id`) REFERENCES `versions` (`id`),
  ADD CONSTRAINT `usb_drives_ibfk_5` FOREIGN KEY (`technician_id`) REFERENCES `technicians` (`id`);

--
-- Constraints for table `usb_types`
--
ALTER TABLE `usb_types`
  ADD CONSTRAINT `usb_types_ibfk_1` FOREIGN KEY (`platform_id`) REFERENCES `platforms` (`id`);

--
-- Constraints for table `versions`
--
ALTER TABLE `versions`
  ADD CONSTRAINT `versions_ibfk_1` FOREIGN KEY (`usb_type_id`) REFERENCES `usb_types` (`id`),
  ADD CONSTRAINT `versions_ibfk_2` FOREIGN KEY (`model_id`) REFERENCES `models` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
