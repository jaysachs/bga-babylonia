# Goals

1. To make reading data a single query (possibly 2 for players).
2. To facilitate having in-progress turn being private to the acting player

# Overview

* One large table, `pieces`
* This stores player pieces on board,hand and pools; ziggurat cards; city and farms; and empty board spaces. Columns will identify what the piece is, which player "owns" it, board location, hand location, pool location.
* Persistence engine will "inflate" the entire game state model from a single select on this table.

# Details

## Tables

```sql
CREATE TABLE IF NOT EXISTS `pieces` (

  -- piece_id
  --    nullable, since empty board spaces do not have a unique piece_id
  --    used to compactly represent an update in the `turns` table
  `piece_id` INT,

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
  `turn_id` INT NOT NULL,
  `piece_id` INT,
  `type` VARCHAR(8) NOT NULL,
  `location` VARCHAR(8) NOT NULL,
  `locaction_id` INT UNSIGNED
  `player_id` INT UNSIGNED,
  `scored` BOOLEAN,
  `points` INT UNSIGNED DEFAULT 0
)

```

## Use cases / examples

Let's explore how reading and updates happen. Generally, we want to "inflate" the whole
state of the game in one scan. For moves-before-turn-commit, changes are written to the `turns` table.

### Piece played from hand into empty spot

One row is written into `turns`:
  * `piece_id` is the ID of the piece
  * `type` is the type of the piece
  * `location` is "BOARD"
  * `location_id` is the encoded RowCol of the hex ("hex id")
  * `player_id` is the player's ID
  * `scored` is false/NULL
  * `points` is the number of zig adjacency points scored for the play

When reading, we notice the piece_id overlap between the base table and the turns table and just drop the first info.

### Farmer played onto field and captures it
This adds two rows:
1. The farmer piece row
  * `piece_id` is the ID of the farmer piece
  * `type` is "farmer"
  * `location` is "BOARD"
  * `location_id` is the encoded RowCol of the hex ("hex id")
  * `player_id` is the player's ID
  * `scored` is false/NULL
  * `points` is the number of points scored for the play
2. The field piece row
  * `piece_id` is the ID of the field piece
  * `type` is "field_5" (e.g.)
  * `location` is "DISCARD"
  * `location_id` is the next available ID
  * `player_id` is NULL
  * `scored` is true
  * `points` is NULL

### Merchant played that will score a city hex

This is the same as "1. piece played from hand", since scoring happens after turns are committed.

### Hand refilled

This updates just the `pieces` table.

For each tile "drawn":
```sql
  UPDATE pieces SET location = "HAND", location_id = <hand_pos> WHERE piece_id = <piece_id>
```
(ideally do this in a single update with a WHEN clause)

### City hex scored

This needs to either move the city piece to a player, or to the discard.

### Ziggurat scored

This needs to move a ziggurat card from the "available" to a player. It may also need to mark it "used". (Question: should we leverage the "scored" field for this? Change "scored" to "used"?)

### Ziggurat used

Needs to mark a ziggurat card used but not change location.

# Questions

1. There is an appeal to storing the entire map in the DB; it would allow for randomization and
  other scenarios. To do that, we'd need a type for "empty" and also a way to identify
  which hexes are in which landmass. So definitely at least one addition type (`EMPTY`),
  and either another field (`LANDMASS`), or make that three empty types (`EMPTY_N`, `EMPTY_C`, `EMPTY_S`). Or just two empty types (`EMPTY`, `EMPTY_8` -- to tie it to zcard 8).

2. Could/should we combine `turns` and `pieces` tables?
  * If we don't, we need to union when we read and read in the right order
  * If we do, we need a `turn_id` in the base table, and need to know what `turn_id`s are
    "committed". Furthermore, "undoing" a whole turn would then be slightly more complex than
    "remove all rows in `turns` table.

3. Do we need to record "points" for the "pieces" table? Or only for "turns"?

4. We could record points scored per player for city scoring, but ... why, exactly?

5. Why do we need to record the board and empty spaces? The board is fixed based on number of players. It would "allow" alternate boards, but ... why?

6. This model doesn't currently handle the "pool" of available ziggurat cards. Could add a
new location type (but "pool" is already taken. "available"? "untaken"? "unselected"? "display"?)
Maybe just use "cards", and then player_id indicates whether it's available or not. Though
that is redundant, could just assert that types "zc_*" ignore the location type.
That does bring up that maybe ... they don't belong here.