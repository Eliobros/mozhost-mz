/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.3-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: socializenow-do-user-24724798-0.h.db.ondigitalocean.com    Database: mozhost
-- ------------------------------------------------------
-- Server version	8.0.35

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `active_sessions`
--

DROP TABLE IF EXISTS `active_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `active_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sessions` (`user_id`,`expires_at`),
  CONSTRAINT `active_sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `active_sessions`
--

LOCK TABLES `active_sessions` WRITE;
/*!40000 ALTER TABLE `active_sessions` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `active_sessions` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `container_logs`
--

DROP TABLE IF EXISTS `container_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `container_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `container_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `log_type` enum('stdout','stderr','system') COLLATE utf8mb4_unicode_ci DEFAULT 'stdout',
  `message` text COLLATE utf8mb4_unicode_ci,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_container_logs` (`container_id`,`timestamp`),
  CONSTRAINT `container_logs_ibfk_1` FOREIGN KEY (`container_id`) REFERENCES `containers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `container_logs`
--

LOCK TABLES `container_logs` WRITE;
/*!40000 ALTER TABLE `container_logs` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `container_logs` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `containers`
--

DROP TABLE IF EXISTS `containers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `containers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('nodejs','python') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('stopped','running','error','building') COLLATE utf8mb4_unicode_ci DEFAULT 'stopped',
  `docker_container_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `port` int DEFAULT NULL,
  `domain` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cpu_limit` decimal(3,2) DEFAULT '0.50',
  `memory_limit_mb` int DEFAULT '512',
  `storage_used_mb` int DEFAULT '0',
  `auto_restart` tinyint(1) DEFAULT '1',
  `environment` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_containers` (`user_id`),
  KEY `idx_container_status` (`status`),
  CONSTRAINT `containers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `containers`
--

LOCK TABLES `containers` WRITE;
/*!40000 ALTER TABLE `containers` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `containers` VALUES
('54197c76-89d8-43ae-a407-1c1dc3f5a0bb',1,'meu-primeiro-bot','nodejs','stopped','5638524c2b665c628ced3209424ee9fd5edf7a1373b3940992a45f8b5bca03c6',4000,NULL,0.50,512,0,1,NULL,'2025-09-05 07:37:32','2025-09-08 23:48:45'),
('dc603f65-21f2-49a9-b5a0-b893a42f564a',1,'tina-bot','nodejs','running','350aa634a5f4356c33a994a3e32461abeeddc2e9c73d9ad32208bd78ebce1932',4001,'admin-tina-bot.mozhost.topaziocoin.online',0.50,512,0,1,NULL,'2025-09-09 20:59:58','2025-09-09 21:30:45');
/*!40000 ALTER TABLE `containers` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `usage_stats`
--

DROP TABLE IF EXISTS `usage_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `usage_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `container_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cpu_usage` decimal(5,2) DEFAULT NULL,
  `memory_usage_mb` int DEFAULT NULL,
  `network_in_mb` decimal(10,2) DEFAULT NULL,
  `network_out_mb` decimal(10,2) DEFAULT NULL,
  `recorded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `container_id` (`container_id`),
  KEY `idx_usage_time` (`recorded_at`),
  KEY `idx_usage_user` (`user_id`,`recorded_at`),
  CONSTRAINT `usage_stats_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `usage_stats_ibfk_2` FOREIGN KEY (`container_id`) REFERENCES `containers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usage_stats`
--

LOCK TABLES `usage_stats` WRITE;
/*!40000 ALTER TABLE `usage_stats` DISABLE KEYS */;
set autocommit=0;
/*!40000 ALTER TABLE `usage_stats` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan` enum('free','basic','pro') COLLATE utf8mb4_unicode_ci DEFAULT 'free',
  `max_containers` int DEFAULT '2',
  `max_ram_mb` int DEFAULT '512',
  `max_storage_mb` int DEFAULT '1024',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
set autocommit=0;
INSERT INTO `users` VALUES
(1,'admin','mozhost@topaziocoin.online','$2a$12$vtaAA.aTKIRS2BfruloZNOns/QwpbjEyvKpg8weyeMULUlbHnuXfC','free',2,512,1024,1,'2025-09-04 21:21:19','2025-09-10 11:57:58');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
commit;

--
-- Dumping routines for database 'mozhost'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2025-09-10 20:18:27
