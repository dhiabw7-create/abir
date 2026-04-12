-- PharmaConnect unified schema (roles: admin, pharmacist, doctor, supplier, pation)
-- Compatible with MySQL 8+

CREATE DATABASE IF NOT EXISTS pharma_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pharma_app;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS demandes;
DROP TABLE IF EXISTS supplier_pharmacie;
DROP TABLE IF EXISTS medicaments_stock;
DROP TABLE IF EXISTS ordonnances;
DROP TABLE IF EXISTS pations;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS pharmacie;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'pharmacist', 'doctor', 'supplier', 'pation') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE admin (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NULL,
  address VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE pharmacie (
  id_pharmacie INT AUTO_INCREMENT PRIMARY KEY,
  nom_pharmacie VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  telephone VARCHAR(30) NOT NULL,
  mot_de_passe VARCHAR(255) NOT NULL,
  president_pharmacie VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  cin VARCHAR(30) NOT NULL UNIQUE,
  specialty VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  telephone VARCHAR(30) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE pations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  cin VARCHAR(30) NOT NULL UNIQUE,
  telephone VARCHAR(30) NULL,
  date_naissance DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE ordonnances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  id_doctor INT NULL,
  pation_id INT NULL,
  cin VARCHAR(30) NOT NULL,
  nom VARCHAR(120) NOT NULL,
  prenom VARCHAR(120) NOT NULL,
  ordonnance TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'En attente',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ordonnances_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_ordonnances_pation FOREIGN KEY (pation_id) REFERENCES pations(id) ON DELETE SET NULL,
  INDEX idx_ordonnances_cin (cin),
  INDEX idx_ordonnances_pation_id (pation_id)
) ENGINE=InnoDB;

CREATE TABLE medicaments_stock (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_pharmacie INT NOT NULL,
  nom VARCHAR(140) NOT NULL,
  quantite INT NOT NULL DEFAULT 0,
  prix DECIMAL(10,2) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_stock_pharmacie FOREIGN KEY (id_pharmacie) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE,
  UNIQUE KEY uq_stock_pharmacie_nom (id_pharmacie, nom)
) ENGINE=InnoDB;

CREATE TABLE supplier_pharmacie (
  supplier_id INT NOT NULL,
  pharmacie_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (supplier_id, pharmacie_id),
  CONSTRAINT fk_sp_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_pharmacie FOREIGN KEY (pharmacie_id) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE demandes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pharmacie_id INT NOT NULL,
  supplier_id INT NOT NULL,
  nom_medicament VARCHAR(140) NOT NULL,
  quantite INT NOT NULL,
  status ENUM('en_attente', 'acceptee', 'recue', 'non_livree', 'refusee') NOT NULL DEFAULT 'en_attente',
  date_acceptation DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_demandes_pharmacie FOREIGN KEY (pharmacie_id) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE,
  CONSTRAINT fk_demandes_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  INDEX idx_demandes_status (status),
  INDEX idx_demandes_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom_medicament VARCHAR(140) NOT NULL,
  quantite INT NOT NULL,
  pharmacien_id INT NOT NULL,
  fournisseur_id INT NOT NULL,
  message TEXT NULL,
  status ENUM('en_attente', 'acceptee', 'refusee', 'recue') NOT NULL DEFAULT 'en_attente',
  demande_id INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_pharmacie FOREIGN KEY (pharmacien_id) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_supplier FOREIGN KEY (fournisseur_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_demande FOREIGN KEY (demande_id) REFERENCES demandes(id) ON DELETE SET NULL,
  INDEX idx_notifications_fournisseur (fournisseur_id),
  INDEX idx_notifications_status (status)
) ENGINE=InnoDB;

-- Optional seed admin (replace hashed password before production)
-- INSERT INTO users (email, password, role) VALUES ('admin@pharmaconnect.local', '$2a$10$replace_me_with_bcrypt_hash', 'admin');
-- INSERT INTO admin (full_name, email, mot_de_passe, phone, address)
-- VALUES ('System Admin', 'admin@pharmaconnect.local', '$2a$10$replace_me_with_bcrypt_hash', NULL, NULL);
