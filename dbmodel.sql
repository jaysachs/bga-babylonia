
-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- babylonia implementation : © Jay Sachs <jay@covariant.org>
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

ALTER TABLE `player` ADD `ziggurat_cards` SET ('zcard1', 'zcard2', 'zcard3', 'zcard4', 'zcard5', 'zcard6', 'zcard7', 'zcard8', 'zcard9') DEFAULT NULL;

ALTER TABLE `player` ADD `won_city_count` INT UNSIGNED NOT NULL DEFAULT '0';

CREATE TABLE IF NOT EXISTS `handpools` (
  `player_id` int(10) unsigned NOT NULL,
  `piece` varchar(8) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8  AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `hands` (
  `player_id` int(10) unsigned NOT NULL,
  `pos` int(2) unsigned NOT NULL,
  `piece` varchar(8) DEFAULT NULL,
  PRIMARY KEY (`player_id`, `pos`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Needed to determine allowable plays (e.g. 3+ if all farmers, some ziggurat powers)
-- Also useful for incremental undo.
CREATE TABLE IF NOT EXISTS `moves_this_turn` (
  `player_id` int(10) unsigned NOT NULL,
  `seq_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `piece` varchar(8) DEFAULT NULL,
  -- position in hand
  `handpos` int(2) NOT NULL,
  -- where it was placed
  `board_row` int(10) unsigned NOT NULL,
  `board_col` int(10) unsigned NOT NULL,
  -- what farm was "captured" if any
  `captured` varchar(8) DEFAULT NULL,
  -- what was immediately scored (farm and/or ziggurat adjacency)
  `points` int(10) unsigned DEFAULT NULL,
  -- no need to record "inversion", as the hextype will tell us
  PRIMARY KEY (`seq_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;

CREATE TABLE IF NOT EXISTS `ziggurat_cards` (
  `player_id` int(10) unsigned NOT NULL,
  `ziggurat_card` varchar(5) NOT NULL,
  PRIMARY KEY (`player_id`, `ziggurat_card`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `board` (
  `board_row` smallint(5) unsigned NOT NULL,
  `board_col` smallint(5) unsigned NOT NULL,
   -- LAND or WATER
  `hextype` varchar(8) NOT NULL,
   -- one of: CITY_{P,S,M,MS,MP,SP,MSP}, FARM_{5,6,7,X}, ZIGGURAT,
   -- or a played piece: FARMER, MERCHANT, PRIEST, SERVANT
   -- note that "inverted" will be based on hextype and we'll sanitize played pieces
   --   to PLAIN before returning to client
  `piece` varchar(8) DEFAULT NULL,
  `scored` boolean DEFAULT FALSE,
  `player_id` int(10) unsigned DEFAULT NULL,
  PRIMARY KEY (`board_row`,`board_col`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
