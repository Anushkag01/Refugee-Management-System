CREATE DATABASE refugee_management_system;
USE refugee_management_system;

-- -------------------------------------------
-- Table: Camp
-- Purpose: Stores information about refugee camps.
-- -------------------------------------------
CREATE TABLE Camp (
    camp_id INT AUTO_INCREMENT PRIMARY KEY,
    camp_name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    capacity INT NOT NULL CHECK (capacity > 0), -- Requirement: CHECK constraint
    current_occupancy INT DEFAULT 0 -- Requirement: DEFAULT constraint
);

-- -------------------------------------------
-- Table: Refugee
-- Purpose: Stores details of individual refugees.
-- -------------------------------------------
CREATE TABLE Refugee (
    refugee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    country_of_origin VARCHAR(100),
    status ENUM('Registered', 'Asylum Seeker', 'Approved', 'Departed')NOT NULL, 
    skills VARCHAR(255),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    camp_id INT,
    profile_document BLOB, 
    FOREIGN KEY (camp_id) REFERENCES Camp(camp_id) ON DELETE SET NULL 
);

-- -------------------------------------------
-- Table: Volunteer
-- Purpose: Stores information about volunteers.
-- -------------------------------------------
CREATE TABLE Volunteer (
    volunteer_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    domain TEXT, -- e.g., "Medical, Translation, Logistics"
    availability ENUM('Full-time', 'Part-time', 'On-call') DEFAULT 'On-call'
    
);

-- -------------------------------------------
-- Table: Volunteer_Camp_Assignment (Junction Table)
-- Purpose: Manages the many-to-many relationship between Volunteers and Camps.
-- -------------------------------------------
CREATE TABLE Volunteer_Camp_Assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_id INT,
    camp_id INT,
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (volunteer_id) REFERENCES Volunteer(volunteer_id) ON DELETE CASCADE, -- If a volunteer is deleted, their assignments are removed.
    FOREIGN KEY (camp_id) REFERENCES Camp(camp_id) ON DELETE CASCADE -- If a camp is deleted, its assignments are removed.
);
-- -------------------------------------------
-- Table: Donor
-- Purpose: Stores information about individuals or entities who donate.
-- -------------------------------------------
CREATE TABLE Donor (
    donor_id INT AUTO_INCREMENT PRIMARY KEY,
    donor_name VARCHAR(255) NOT NULL,
    donor_type ENUM('Individual', 'Corporation', 'NGO')
);

-- -------------------------------------------
-- Table: Organization
-- Purpose: Stores details of aid organizations.
-- -------------------------------------------
CREATE TABLE Organization (
    organization_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100), -- e.g., "NGO", "Governmental"
    address TEXT,
    email VARCHAR(255) UNIQUE,
    services_offered LONGTEXT
);

-- -------------------------------------------
-- Table: Organization_Phone
-- Purpose: Stores multiple phone numbers for each organization.
-- -------------------------------------------
CREATE TABLE Organization_Phone (
    organization_id INT,
    phone_number VARCHAR(20) NOT NULL,
    PRIMARY KEY (organization_id, phone_number), -- Composite key prevents duplicate numbers for the same org
    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id) ON DELETE CASCADE -- If the organization is deleted, its phone numbers are also deleted.
);

-- -------------------------------------------
-- Table: Donation
-- Purpose: Tracks donations made by donors to organizations.
-- -------------------------------------------
CREATE TABLE Donation (
    donation_id INT AUTO_INCREMENT PRIMARY KEY,
    donor_id INT,
    organization_id INT,
    amount DECIMAL(12, 2),
    donation_type VARCHAR(100), -- e.g., "Monetary", "In-Kind"
    donation_date DATE,
    FOREIGN KEY (donor_id) REFERENCES Donor(donor_id) ON DELETE SET NULL, -- Keep donation record even if donor is deleted
    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id) ON DELETE CASCADE
);

-- -------------------------------------------
-- Table: Aid
-- Purpose: Catalog of available aid types.
-- -------------------------------------------
CREATE TABLE Aid (
    aid_id INT AUTO_INCREMENT PRIMARY KEY,
    aid_type ENUM('Food', 'Medicine', 'Shelter', 'Clothing', 'Hygiene Kit') NOT NULL
);

-- -------------------------------------------
-- Table: Aid_Distribution (Junction Table)
-- Purpose: Tracks which refugee received what aid, when, and how much.
-- -------------------------------------------
CREATE TABLE Aid_Distribution (
    distribution_id INT AUTO_INCREMENT PRIMARY KEY,
    refugee_id INT,
    aid_id INT,
    quantity_distributed INT NOT NULL,
    FOREIGN KEY (refugee_id) REFERENCES Refugee(refugee_id) ON DELETE CASCADE,
    FOREIGN KEY (aid_id) REFERENCES Aid(aid_id) ON DELETE CASCADE
);

DELIMITER $$

CREATE PROCEDURE AddNewRefugee(
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_date_of_birth DATE,
    IN p_country_of_origin VARCHAR(100)
)
BEGIN
    DECLARE v_camp_id INT;
    
    -- Find the camp with the most available capacity (capacity - current_occupancy)
    SELECT camp_id INTO v_camp_id
    FROM Camp
    WHERE capacity > current_occupancy
    ORDER BY (capacity - current_occupancy) DESC
    LIMIT 1;
    
    -- Insert the new refugee with the assigned camp_id
    INSERT INTO Refugee (first_name, last_name, date_of_birth, country_of_origin, status, camp_id)
    VALUES (p_first_name, p_last_name, p_date_of_birth, p_country_of_origin, 'Registered', v_camp_id);

END$$

DELIMITER ;



DELIMITER $$

CREATE TRIGGER after_refugee_camp_change
AFTER INSERT ON Refugee
FOR EACH ROW
BEGIN
    -- Increase occupancy when a refugee is added to a camp
    IF NEW.camp_id IS NOT NULL THEN
        UPDATE Camp SET current_occupancy = current_occupancy + 1 WHERE camp_id = NEW.camp_id;
    END IF;
END$$

DELIMITER ;


DELIMITER $$

CREATE FUNCTION GetTotalAidDistributed(
    p_aid_type ENUM('Food', 'Medicine', 'Shelter', 'Clothing', 'Hygiene Kit')
)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE total_quantity INT;
    
    SELECT SUM(ad.quantity_distributed) INTO total_quantity
    FROM Aid_Distribution ad
    JOIN Aid a ON ad.aid_id = a.aid_id
    WHERE a.aid_type = p_aid_type;
    
    RETURN IFNULL(total_quantity, 0);
END$$

DELIMITER ;

-- Insert Camps
INSERT INTO Camp (camp_name, city, capacity) VALUES 
('Hope Valley', 'Bekaa', 500), 
('Safe Haven', 'Gaziantep', 800);

-- Insert Volunteers
INSERT INTO Volunteer (first_name, last_name,  availability) VALUES
('Aisha', 'Khan', 'Full-time'),
('Ben', 'Carter', 'Part-time');

-- Step 1: Give 'Aisha Khan' (volunteer_id=1) a medical domain.
UPDATE Volunteer
SET domain = 'Medical, Translation'
WHERE volunteer_id = 1;

-- Step 2: Assign Aisha to the 'Safe Haven' camp (camp_id=2).
INSERT INTO Volunteer_Camp_Assignment (volunteer_id, camp_id, start_date)
VALUES (1, 2, '2025-10-01');

-- Insert Refugees (this will trigger the occupancy update)
CALL AddNewRefugee('Farah', 'Hassan', '1995-03-12', 'Syria');
CALL AddNewRefugee('Omar', 'Al-Jamil', '1988-11-20', 'Syria');

-- Insert Donors and Donations
INSERT INTO Donor (donor_name, donor_type) VALUES ('Global Aid Foundation', 'NGO'), ('John Doe', 'Individual');
INSERT INTO Organization (name, type, email) VALUES ('Doctors Without Borders', 'NGO', 'contact@msf.org');
INSERT INTO Donation (donor_id, organization_id, amount, donation_type, donation_date) VALUES (1, 1, 50000.00, 'Monetary', '2025-09-15');

-- Insert Aid types and distributions
INSERT INTO Aid (aid_type) VALUES ('Food'), ('Medicine'), ('Shelter'), ('Clothing'), ('Hygiene Kit');
INSERT INTO Aid_Distribution (refugee_id, aid_id, quantity_distributed) VALUES (1, 1, 10), (1, 2, 2), (2, 1, 15);



SELECT
    v.first_name,
    v.last_name,
    v.domain
FROM Volunteer v
JOIN Volunteer_Camp_Assignment vca ON v.volunteer_id = vca.volunteer_id
JOIN Camp c ON vca.camp_id = c.camp_id
WHERE c.camp_name = 'Safe Haven' AND v.domain LIKE '%Medical%';


SELECT 
    d.donor_name,
    SUM(dn.amount) AS total_donated
FROM Donor d
JOIN Donation dn ON d.donor_id = dn.donor_id
WHERE dn.donation_type = 'Monetary'
GROUP BY d.donor_name
ORDER BY total_donated DESC
LIMIT 5;



SELECT 
    r.first_name, 
    r.last_name, 
    r.refugee_id
FROM Refugee r
WHERE r.refugee_id NOT IN (
    SELECT ad.refugee_id
    FROM Aid_Distribution ad
    JOIN Aid a ON ad.aid_id = a.aid_id
    WHERE a.aid_type = 'Medicine'
);



SELECT 
    camp_name,
    current_occupancy,
    capacity,
    (current_occupancy / capacity) * 100 AS occupancy_percentage
FROM Camp
WHERE capacity > 0;



WITH AidSummary AS (
    SELECT 
        a.aid_type,
        ad.quantity_distributed
    FROM Aid a
    JOIN Aid_Distribution ad ON a.aid_id = ad.aid_id
)
SELECT 
    aid_type,
    SUM(quantity_distributed) AS total_quantity
FROM AidSummary
GROUP BY aid_type
ORDER BY total_quantity DESC;

-- You can also test your function like this:
SELECT GetTotalAidDistributed('Food');

-- Create a user for general backend operations (e.g., a volunteer manager)
-- CREATE USER 'data_entry_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
-- GRANT SELECT, INSERT, UPDATE ON refugee_management_system.* TO 'data_entry_user'@'localhost';

-- Create a read-only user for data analysis and reporting
-- CREATE USER 'analyst_user'@'localhost' IDENTIFIED BY 'AnotherPassword456!';
-- GRANT SELECT ON refugee_management_system.* TO 'analyst_user'@'localhost';

-- Create an admin user with full privileges
-- CREATE USER 'admin_user'@'localhost' IDENTIFIED BY 'AdminPassword789!';
-- GRANT ALL PRIVILEGES ON refugee_management_system.* TO 'admin_user'@'localhost' WITH GRANT OPTION;

-- Apply the changes
-- FLUSH PRIVILEGES;

-- -------------------------------------------
-- Table: Users
-- Purpose: Central user authentication and role management
-- -------------------------------------------
CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Manager', 'Volunteer', 'Refugee', 'Donor', 'Org') NOT NULL,

    -- Foreign key references to respective profile tables
    volunteer_id INT NULL,
    refugee_id INT NULL,
    donor_id INT NULL,
    organization_id INT NULL,

    -- Optional metadata for audit/logging
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,

    FOREIGN KEY (volunteer_id) REFERENCES Volunteer(volunteer_id) ON DELETE CASCADE,
    FOREIGN KEY (refugee_id) REFERENCES Refugee(refugee_id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES Donor(donor_id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES Organization(organization_id) ON DELETE CASCADE
);