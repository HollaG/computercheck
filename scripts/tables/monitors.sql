-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 18, 2021 at 04:37 PM
-- Server version: 10.4.20-MariaDB
-- PHP Version: 8.0.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `computercheck`
--

-- --------------------------------------------------------

--
-- Table structure for table `monitors__data`
--

CREATE TABLE IF NOT EXISTS  `monitors__data` (
  `row_ID` int(11) NOT NULL,
  `model_ID` varchar(200) NOT NULL,
  `name` text NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `brand` text NOT NULL,
  `location` text NOT NULL,
  `link` text NOT NULL,
  `date_updated` datetime NOT NULL DEFAULT current_timestamp(),
  `image_url` text NOT NULL,
  `customizable` tinyint(1) NOT NULL,
  `active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `monitors__model_data`
--

CREATE TABLE IF NOT EXISTS  `monitors__model_data` (
  `row_ID` int(11) NOT NULL,
  `date_updated` datetime NOT NULL DEFAULT current_timestamp(),
  `model_ID` varchar(200) NOT NULL,
  `name` text NOT NULL,
  `brand` text NOT NULL,
  `avg_price` int(11) NOT NULL DEFAULT -1,
  `search_terms` text NOT NULL,
  `image_url` text NOT NULL,
  `refresh_rate` int(11) NOT NULL,
  `brightness` int(11) NOT NULL,
  `contrast_ratio` int(11) NOT NULL,
  `response_time` decimal(10,1) NOT NULL,
  `bit_depth` int(11) NOT NULL,
  `screen_size` decimal(10,1) NOT NULL,
  `screen_resolution_w` int(11) NOT NULL,
  `screen_resolution_h` int(11) NOT NULL,
  `screen_tech` text NOT NULL,
  `aspect_ratio` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `monitors__model_keywords`
--

CREATE TABLE IF NOT EXISTS  `monitors__model_keywords` (
  `model_ID` varchar(200) NOT NULL,
  `keyword` text NOT NULL,
  `row_ID` int(11) NOT NULL,
  `date_updated` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `monitors__temp_data`
--

CREATE TABLE IF NOT EXISTS  `monitors__temp_data` (
  `model_ID` varchar(200) NOT NULL,
  `name` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `brand` text NOT NULL,
  `location` text NOT NULL,
  `link` text NOT NULL,
  `date_updated` datetime NOT NULL DEFAULT current_timestamp(),
  `image_url` text NOT NULL,
  `active` tinyint(1) NOT NULL,
  `customizable` tinyint(1) NOT NULL,
  `row_ID` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `monitors__temp_model_data`
--

CREATE TABLE IF NOT EXISTS  `monitors__temp_model_data` (
  `row_ID` int(11) NOT NULL,
  `date_updated` datetime NOT NULL DEFAULT current_timestamp(),
  `model_ID` varchar(200) NOT NULL,
  `name` text NOT NULL,
  `brand` text NOT NULL,
  `avg_price` int(11) NOT NULL DEFAULT -1,
  `search_terms` text NOT NULL,
  `image_url` text NOT NULL,
  `refresh_rate` int(11) NOT NULL,
  `brightness` int(11) NOT NULL,
  `contrast_ratio` int(11) NOT NULL,
  `response_time` decimal(10,1) NOT NULL,
  `bit_depth` int(11) NOT NULL,
  `screen_size` decimal(10,1) NOT NULL,
  `screen_resolution_w` int(11) NOT NULL,
  `screen_resolution_h` int(11) NOT NULL,
  `screen_tech` text NOT NULL,
  `aspect_ratio` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `monitors__temp_model_keywords`
--

CREATE TABLE IF NOT EXISTS  `monitors__temp_model_keywords` (
  `model_ID` varchar(200) NOT NULL,
  `keyword` text NOT NULL,
  `row_ID` int(11) NOT NULL,
  `date_updated` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `monitors__data`
--
ALTER TABLE `monitors__data`
  ADD PRIMARY KEY (`row_ID`);

--
-- Indexes for table `monitors__model_data`
--
ALTER TABLE `monitors__model_data`
  ADD PRIMARY KEY (`row_ID`);

--
-- Indexes for table `monitors__model_keywords`
--
ALTER TABLE `monitors__model_keywords`
  ADD PRIMARY KEY (`row_ID`);

--
-- Indexes for table `monitors__temp_model_data`
--
ALTER TABLE `monitors__temp_model_data`
  ADD PRIMARY KEY (`row_ID`);

--
-- Indexes for table `monitors__temp_model_keywords`
--
ALTER TABLE `monitors__temp_model_keywords`
  ADD PRIMARY KEY (`row_ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `monitors__data`
--
ALTER TABLE `monitors__data`
  MODIFY `row_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `monitors__model_data`
--
ALTER TABLE `monitors__model_data`
  MODIFY `row_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `monitors__model_keywords`
--
ALTER TABLE `monitors__model_keywords`
  MODIFY `row_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `monitors__temp_model_data`
--
ALTER TABLE `monitors__temp_model_data`
  MODIFY `row_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `monitors__temp_model_keywords`
--
ALTER TABLE `monitors__temp_model_keywords`
  MODIFY `row_ID` int(11) NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
