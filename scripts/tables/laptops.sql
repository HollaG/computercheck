-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 18, 2021 at 04:37 PM
-- Server version: 10.4.20-MariaDB
-- PHP Version: 8.0.9



--
-- Database: `computercheck`
--

-- --------------------------------------------------------

--
-- Table structure for table `laptops__data`
--

CREATE TABLE IF NOT EXISTS `laptops__data`(
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
-- Table structure for table `laptops__model_data`
--

CREATE TABLE IF NOT EXISTS `laptops__model_data`(
  `row_ID` int(11) NOT NULL,
  `date_updated` datetime NOT NULL DEFAULT current_timestamp(),
  `model_ID` varchar(200) NOT NULL,
  `name` text NOT NULL,
  `brand` text NOT NULL,
  `avg_price` int(11) NOT NULL DEFAULT -1,
  `search_terms` text NOT NULL,
  `image_url` text NOT NULL,
  `processor_company` text NOT NULL,
  `processor_model` text NOT NULL,
  `ram` int(11) NOT NULL,
  `storage` text NOT NULL,
  `graphics_company` text NOT NULL,
  `graphics_card` text NOT NULL,
  `screen_size` decimal(10,1) NOT NULL,
  `screen_resolution_w` int(11) NOT NULL,
  `screen_resolution_h` int(11) NOT NULL,
  `screen_tech` text NOT NULL,
  `battery_size_wh` text NOT NULL,
  `os` text NOT NULL,
  `weight` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `laptops__model_keywords`
--

CREATE TABLE IF NOT EXISTS `laptops__model_keywords`(
  `model_ID` varchar(200) NOT NULL,
  `keyword` text NOT NULL,
  `row_ID` int(11) NOT NULL,
  `date_updated` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `laptops__temp_data`
--

CREATE TABLE IF NOT EXISTS `laptops__temp_data`(
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
-- Table structure for table `laptops__temp_model_data`
--

CREATE TABLE IF NOT EXISTS `laptops__temp_model_data`(
  `row_ID` int(11) NOT NULL,
  `date_updated` datetime NOT NULL DEFAULT current_timestamp(),
  `model_ID` varchar(200) NOT NULL,
  `name` text NOT NULL,
  `brand` text NOT NULL,
  `avg_price` int(11) NOT NULL DEFAULT -1,
  `search_terms` text NOT NULL,
  `image_url` text NOT NULL,
  `processor_company` text NOT NULL,
  `processor_model` text NOT NULL,
  `ram` int(11) NOT NULL,
  `storage` text NOT NULL,
  `graphics_company` text NOT NULL,
  `graphics_card` text NOT NULL,
  `screen_size` decimal(10,1) NOT NULL,
  `screen_resolution_w` int(11) NOT NULL,
  `screen_resolution_h` int(11) NOT NULL,
  `screen_tech` text NOT NULL,
  `battery_size_wh` text NOT NULL,
  `os` text NOT NULL,
  `weight` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `laptops__temp_model_keywords`
--

CREATE TABLE IF NOT EXISTS `laptops__temp_model_keywords`(
  `model_ID` varchar(200) NOT NULL,
  `keyword` text NOT NULL,
  `row_ID` int(11) NOT NULL,
  `date_updated` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `laptops__data`
--
ALTER TABLE `laptops__data`
  ADD PRIMARY KEY (`row_ID`);

--
-- Indexes for table `laptops__model_data`
--
ALTER TABLE `laptops__model_data`
  ADD PRIMARY KEY (`row_ID`);

--
-- Indexes for table `laptops__model_keywords`
--
ALTER TABLE `laptops__model_keywords`
  ADD PRIMARY KEY (`row_ID`);

--
-- Indexes for table `laptops__temp_model_data`
--
ALTER TABLE `laptops__temp_model_data`
  ADD PRIMARY KEY (`row_ID`);

--
-- Indexes for table `laptops__temp_model_keywords`
--
ALTER TABLE `laptops__temp_model_keywords`
  ADD PRIMARY KEY (`row_ID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `laptops__data`
--
ALTER TABLE `laptops__data`
  MODIFY `row_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `laptops__model_data`
--
ALTER TABLE `laptops__model_data`
  MODIFY `row_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `laptops__model_keywords`
--
ALTER TABLE `laptops__model_keywords`
  MODIFY `row_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `laptops__temp_model_data`
--
ALTER TABLE `laptops__temp_model_data`
  MODIFY `row_ID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `laptops__temp_model_keywords`
--
ALTER TABLE `laptops__temp_model_keywords`
  MODIFY `row_ID` int(11) NOT NULL AUTO_INCREMENT;

