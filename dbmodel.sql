
-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- babylonia implementation : © Jay Sachs <vagabond@covariant.org>
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

CREATE TABLE IF NOT EXISTS `pieces` (

  -- location
  --   BOARD (player_id depends on type)
  --   HAND (requires player_id)
  --   POOL (requires player_id)
  --   DISCARD (null player_id) - cities scored but uncaptured, scored fields
  --   TAKEN (requires player_id) - captured cities and taken zcards
  `location` VARCHAR(8),

  -- location_id
  --   if BOARD, encoded row/col
  --   if HAND,  hand pos
  --   if POOL,  "position" in pool
  --   if DISCARD, unique seq_id
  `location_id` INT UNSIGNED,

  -- type: (player_id null unless indicated)
  --  empty
  --  priest  (requires player_id)
  --  merchant  (requires player_id)
  --  servant   (requires player_id)
  --  farmer    (requires player_id)
  --  hidden (for pieces played upside down; implies water; requires player_id)
  --  city_m (all city_: player_id if captured),
  --  city_p,
  --  city_s,
  --  city_mp,
  --  city_ms,
  --  city_msp,
  --  field_5,
  --  field_6,
  --  field_7,
  --  field_x
  --  ziggurat
  --  zc_10pts
  --  zc_xturn
  --  zc_hand7
  --  zc_3nobles
  --  zc_3farmers
  --  zc_fields
  --  zc_citypts
  --  zc_land
  --  zc_river
  `type` VARCHAR(20),

  `player_id` INT UNSIGNED,

  -- indicates "scored" for ziggurats, cities and fields
  -- indicates "used" for single use ziggurate cards
  `used` BOOLEAN,

  -- landmass for board locations only
  --    north, center, south, river
  `terrain` VARCHAR(6),

  PRIMARY KEY(`location`, `location_id`, `player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Needed to determine allowable plays (e.g. 3+ if all farmers, some ziggurat powers)
-- Also useful for incremental undo.
CREATE TABLE IF NOT EXISTS `turn_progress` (
  `player_id` int unsigned NOT NULL,
  `seq_id` int unsigned NOT NULL AUTO_INCREMENT,
  `original_piece` varchar(8) NOT NULL,
  `piece` varchar(8) NOT NULL,
  -- position in hand
  `handpos` int NOT NULL,
  -- where it was placed
  `board_loc` int(10) unsigned NOT NULL,
  -- what field was "captured" if any
  `captured_piece` varchar(8) DEFAULT NULL,
  -- what was immediately scored (field and/or ziggurat adjacency)
  `field_points` int unsigned DEFAULT NULL,
  `ziggurat_points` int unsigned DEFAULT NULL,
  -- no need to record "inversion", as the hextype will tell us
  PRIMARY KEY (`seq_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 AUTO_INCREMENT=1 ;
