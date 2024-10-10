
-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- tutorialvagabondfirst implementation : © <Your name here> <Your email address here>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- dbmodel.sql

-- This is the file where you are describing the database schema of your game
-- Basically, you just have to export from PhpMyAdmin your table structure and copy/paste
-- this export here.
-- Note that the database itself and the standard tables ("global", "stats", "gamelog" and "player") are
-- already created and must not be created here

-- Note: The database schema is created from this file when the game starts. If you modify this file,
--       you have to restart a game to see your changes in database.

-- Example 1: create a standard "card" table to be used with the "Deck" tools (see example game "hearts"):

-- CREATE TABLE IF NOT EXISTS `card` (
--   `card_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
--   `card_type` varchar(16) NOT NULL,
--   `card_type_arg` int(11) NOT NULL,
--   `card_location` varchar(16) NOT NULL,
--   `card_location_arg` int(11) NOT NULL,
--   PRIMARY KEY (`card_id`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;


-- Example 2: add a custom field to the standard "player" table
-- ALTER TABLE `player` ADD `player_my_custom_field` INT UNSIGNED NOT NULL DEFAULT '0';


-- which bonus tiles players own.
-- could try to shove in `players` but need an array type
--   maybe using MySQL `SET` type?

ALTER TABLE `player` ADD `player_bonuses` SET ('tile1', 'tile2', 'tile3', 'tile4', 'tile5', 'tile6', 'tile7', 'tile8', 'tile9') DEFAULT NULL;

ALTER TABLE `player` ADD `won_cities` INT UNSIGNED NOT NULL DEFAULT '0';

CREATE TABLE IF NOT EXISTS `bonuses` (
  `player_id` int(10) unsigned NOT NULL,
  `bonus_type` varchar(5) NOT NULL,
  PRIMARY KEY (`player_id`, `bonus_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8l

CREATE TABLE IF NOT EXISTS `board` (
  `board_x` smallint(5) unsigned NOT NULL,
  `board_y` smallint(5) unsigned NOT NULL,
  `hextype` varchar(8) NOT NULL, -- PLAIN or WATER
  `piece` varchar(8) DEFAULT NULL, -- CITY_P, CITY_C, CITY_M, CITY_PN, CITY_CM, CITY_MP, CITY_PCM, FARM_5, FARM_6, FARM_7, FARM_C, ZIGGURAT, FARMER, MERCHANT, PRIEST, CIVIL
  `scored` boolean DEFAULT FALSE,
  `board_player` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`board_x`,`board_y`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
