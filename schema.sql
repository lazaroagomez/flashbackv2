-- FlashBack USB Inventory System - Database Schema
-- MySQL 8.4.x
-- Corrected version based on requirements

-- Drop existing tables and procedures if they exist (for fresh setup)
DROP PROCEDURE IF EXISTS get_next_usb_id;
DROP TRIGGER IF EXISTS prevent_event_log_delete;
DROP TRIGGER IF EXISTS prevent_event_log_update;
DROP TABLE IF EXISTS event_logs;
DROP TABLE IF EXISTS usb_drives;
DROP TABLE IF EXISTS technicians;
DROP TABLE IF EXISTS versions;
DROP TABLE IF EXISTS models;
DROP TABLE IF EXISTS usb_types;
DROP TABLE IF EXISTS platforms;
DROP TABLE IF EXISTS sequential_counters;

-- =====================================================
-- Platforms Table
-- =====================================================
CREATE TABLE platforms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- USB Types Table (belongs to Platform)
-- =====================================================
CREATE TABLE usb_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    requires_model BOOLEAN DEFAULT FALSE,
    supports_legacy BOOLEAN DEFAULT FALSE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (platform_id) REFERENCES platforms(id),
    UNIQUE KEY unique_platform_type (platform_id, name),
    INDEX idx_platform (platform_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- Models Table (optional, used when USB Type requires_model=true)
-- =====================================================
CREATE TABLE models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    model_number VARCHAR(100),
    notes TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_model (name, model_number),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- Versions Table (general OR model-specific)
-- model_id NULL = general version
-- model_id populated = model-specific version
-- =====================================================
CREATE TABLE versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usb_type_id INT NOT NULL,
    model_id INT NULL,
    version_code VARCHAR(100) NOT NULL,
    is_current BOOLEAN DEFAULT FALSE,
    is_legacy_valid BOOLEAN DEFAULT FALSE,
    official_link VARCHAR(500) NULL,
    internal_link VARCHAR(500) NULL,
    comments TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marked_current_at TIMESTAMP NULL,
    FOREIGN KEY (usb_type_id) REFERENCES usb_types(id),
    FOREIGN KEY (model_id) REFERENCES models(id),
    UNIQUE KEY unique_version (usb_type_id, model_id, version_code),
    INDEX idx_type_current (usb_type_id, is_current),
    INDEX idx_type_model (usb_type_id, model_id)
) ENGINE=InnoDB;

-- =====================================================
-- Technicians Table
-- =====================================================
CREATE TABLE technicians (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    notes TEXT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- Sequential Counters Table (for A001-Z999 format)
-- =====================================================
CREATE TABLE sequential_counters (
    id INT PRIMARY KEY DEFAULT 1,
    current_letter CHAR(1) NOT NULL DEFAULT 'A',
    current_number INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CHECK (id = 1),
    CHECK (current_letter BETWEEN 'A' AND 'Z'),
    CHECK (current_number BETWEEN 0 AND 999)
) ENGINE=InnoDB;

-- Initialize counter at A000 (first USB will be A001)
INSERT INTO sequential_counters (id, current_letter, current_number) VALUES (1, 'A', 0);

-- =====================================================
-- USB Drives Table (main inventory)
-- =====================================================
CREATE TABLE usb_drives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usb_id VARCHAR(4) UNIQUE NOT NULL,  -- A001, B999, etc.
    platform_id INT NOT NULL,
    usb_type_id INT NOT NULL,
    model_id INT NULL,  -- Required if usb_type.requires_model=true
    version_id INT NOT NULL,
    technician_id INT NULL,  -- Optional, but required for printing sticker
    status ENUM('assigned', 'pending_update', 'damaged', 'lost', 'retired') DEFAULT 'assigned',
    custom_text VARCHAR(12) NULL,  -- Max 12 characters
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (platform_id) REFERENCES platforms(id),
    FOREIGN KEY (usb_type_id) REFERENCES usb_types(id),
    FOREIGN KEY (model_id) REFERENCES models(id),
    FOREIGN KEY (version_id) REFERENCES versions(id),
    FOREIGN KEY (technician_id) REFERENCES technicians(id),
    INDEX idx_usb_id (usb_id),
    INDEX idx_status (status),
    INDEX idx_platform (platform_id),
    INDEX idx_type (usb_type_id),
    INDEX idx_version (version_id),
    INDEX idx_technician (technician_id),
    INDEX idx_type_version_status (usb_type_id, version_id, status)
) ENGINE=InnoDB;

-- =====================================================
-- Event Logs Table (immutable audit trail)
-- =====================================================
CREATE TABLE event_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    usb_id INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    event_type ENUM(
        'created',
        'assigned',
        'reassigned',
        'updated',
        'marked_pending',
        'repurpose',
        'damaged',
        'lost',
        'retired',
        'reactivated'
    ) NOT NULL,
    details TEXT NOT NULL,
    username VARCHAR(100) NOT NULL,
    FOREIGN KEY (usb_id) REFERENCES usb_drives(id),
    INDEX idx_usb (usb_id, timestamp),
    INDEX idx_timestamp (timestamp),
    INDEX idx_event_type (event_type)
) ENGINE=InnoDB;

-- =====================================================
-- Stored Procedure: Generate Next USB ID (A001-Z999)
-- =====================================================
DELIMITER //
CREATE PROCEDURE get_next_usb_id(OUT next_id VARCHAR(4))
BEGIN
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
END//
DELIMITER ;

-- =====================================================
-- Triggers: Enforce Event Log Immutability
-- =====================================================
DELIMITER //
CREATE TRIGGER prevent_event_log_update
BEFORE UPDATE ON event_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Event logs are immutable - updates are not allowed';
END//

CREATE TRIGGER prevent_event_log_delete
BEFORE DELETE ON event_logs
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Event logs are immutable - deletes are not allowed';
END//
DELIMITER ;

-- =====================================================
-- Helper Views
-- =====================================================

-- View: USB Drives with full details (for list/search)
CREATE VIEW v_usb_drives_full AS
SELECT 
    u.id,
    u.usb_id,
    u.status,
    u.custom_text,
    u.created_at,
    u.updated_at,
    p.id AS platform_id,
    p.name AS platform_name,
    t.id AS usb_type_id,
    t.name AS usb_type_name,
    t.requires_model,
    t.supports_legacy,
    m.id AS model_id,
    m.name AS model_name,
    m.model_number,
    v.id AS version_id,
    v.version_code,
    v.is_current AS version_is_current,
    v.is_legacy_valid,
    tech.id AS technician_id,
    tech.name AS technician_name,
    tech.status AS technician_status
FROM usb_drives u
JOIN platforms p ON u.platform_id = p.id
JOIN usb_types t ON u.usb_type_id = t.id
LEFT JOIN models m ON u.model_id = m.id
JOIN versions v ON u.version_id = v.id
LEFT JOIN technicians tech ON u.technician_id = tech.id;

-- View: Pending updates grouped by technician
CREATE VIEW v_pending_updates AS
SELECT 
    u.id,
    u.usb_id,
    u.custom_text,
    p.name AS platform_name,
    t.name AS usb_type_name,
    m.name AS model_name,
    v.version_code,
    tech.id AS technician_id,
    tech.name AS technician_name
FROM usb_drives u
JOIN platforms p ON u.platform_id = p.id
JOIN usb_types t ON u.usb_type_id = t.id
LEFT JOIN models m ON u.model_id = m.id
JOIN versions v ON u.version_id = v.id
LEFT JOIN technicians tech ON u.technician_id = tech.id
WHERE u.status = 'pending_update'
ORDER BY tech.name, u.usb_id;

-- View: Version summary per model (for Model Detail View)
CREATE VIEW v_model_version_summary AS
SELECT 
    m.id AS model_id,
    m.name AS model_name,
    t.id AS usb_type_id,
    t.name AS usb_type_name,
    v.version_code,
    v.is_current,
    v.is_legacy_valid,
    COUNT(u.id) AS usb_count
FROM models m
CROSS JOIN usb_types t
LEFT JOIN versions v ON v.model_id = m.id AND v.usb_type_id = t.id AND v.is_current = TRUE
LEFT JOIN usb_drives u ON u.model_id = m.id AND u.usb_type_id = t.id
WHERE t.requires_model = TRUE
GROUP BY m.id, m.name, t.id, t.name, v.version_code, v.is_current, v.is_legacy_valid;