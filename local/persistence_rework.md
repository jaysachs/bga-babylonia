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

  -- id
  `id` INTEGER NOT NULL,

  -- type: (player_id null unless indicated)
  --  PRIEST  (requires player_id)
  --  MERCHANT  (requires player_id)
  --  SERVANT   (requires player_id)
  --  FARMER    (requires player_id)
  --  SECRET (for pieces played upside down; implies WATER; requires player_id)
  --  CITY_M (all CITY_: player_id if captured),
  --  CITY_P,
  --  CITY_S,
  --  CITY_MP,
  --  CITY_MS,
  --  CITY_MSP,
  --  FIELD_5,
  --  FIELD_6,
  --  FIELD_7,
  --  FIELD_X
  --  ZIGGURAT (player_id of scoring player, or 0 if scored but no winner, null if unscored)
  --  ZCARD_1 (player_id of owning player; null if none)
  --  ZCARD_2
  --  ...
  --  ZCARD_9
  `type` VARCHAR(8),

  -- location
  --   BOARD (player_id depends on type)
  --   HAND (requires player_id) (both pieces and zcards can be in "HAND")
  --   POOL (requires player_id)
  --   DISCARD (null player_id)
  `location` VARCHAR(8),

  -- location_id
  --   if BOARD, encoded row/col
  --   if HAND,  hand pos
  --   if POOL,  "position" in pool
  --   if DISCARD, null
  `loc_id` INT UNSIGNED,

  `player_id` INT UNSIGNED

  -- only for ziggurats. needed?
  `scored` BOOLEAN,
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
