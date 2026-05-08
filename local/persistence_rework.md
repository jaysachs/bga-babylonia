Goals
=====

1. To make reading data a single query (possibly 2 for players).
2. To facilitate having in-progress turn being private to the acting player

Overview
========

* One large table, `pieces`
* This stores player pieces on board,hand and pools; ziggurat cards; city and farms; and empty board spaces. Columns will identify what the piece is, which player "owns" it, board location, hand location, pool location.
* Persistence engine will "inflate" the entire game state model from a single select on this table.

Question: should in-progress moves go here or a different table?

* Propose a different table that is read in that same single select via a `JOIN`, and its values "overwrite/replace" what is in the main table.
* This `inprogress` table will contain current players moves in progress. It should be suitable for supporting undo.

Details
=======

The `pieces` table:

```sql
CREATE TABLE IF NOT EXISTS `pieces` (

  -- no global piece id needed. location + location_id is sufficient identification.

  -- location
  --   BOARD (player_id depends on type)
  --   HAND (requires player_id) (both pieces and zcards can be in "HAND")
  --   POOL (requires player_id)
  --   DISCARD (null player_id) - cities scored but uncaptured, scored fields
  `location` VARCHAR(8),

  -- location_id
  --   if BOARD, encoded row/col
  --   if HAND,  hand pos
  --   if POOL,  "position" in pool
  --   if DISCARD, unique seq_id
  `loc_id` INT UNSIGNED,

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
  `type` VARCHAR(10),

  `player_id` INT UNSIGNED,

  -- for ziggurats and cities
  `scored` BOOLEAN,

  -- landmass for board locations only
  --    north, center, south
  `landmass` VARCHAR(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8

-- hmm, this identical-ness suggests just having one table
-- but need to be able to undo point scores for fields and ziggurat adjacency
--   so either need "points" here, or have to reverse-apply a move
--   then again, replaying the whole game from the beginning would recompute
--   the points ...
CREATE TABLE IF NOT EXISTS `turns` (
  `turn_id` INTEGER NOT NULL,
  `piece_id` INTEGER NOT NULL,
  `type` VARCHAR(8) NOT NULL,
  `location` VARCHAR(8) NOT NULL,
  `loc_id` INT UNSIGNED
  `player_id` INT UNSIGNED,
  `scored` BOOLEAN,
  `points` INT UNSIGNED DEFAULT 0
)

```

Questions
=========

* There is an appeal to storing the entire map in the DB; it would allow for randomization and
  other scenarios. To do that, we'd need a type for "empty" and also a way to identify
  which hexes are in which landmass. So definitely at least one addition type (`EMPTY`),
  and either another field (`LANDMASS`), or make that three empty types (`EMPTY_N`, `EMPTY_C`, `EMPTY_S`). Or just two empty types (`EMPTY`, `EMPTY_8` -- to tie it to zcard 8).