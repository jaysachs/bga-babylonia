# Goals

1. To make reading data a single query (possibly 2 for players).
2. To facilitate having in-progress turn being private to the acting player

# Overview

* One large table, `pieces`
* This stores player pieces on board,hand and pools; ziggurat cards; city and farms; and empty
  board spaces. Columns will identify what the piece is, which player "owns" it, board location, hand location, pool location.
* Persistence engine will "inflate" the entire game state model from a single select on this table.

# Details

## Tables

```sql
CREATE TABLE IF NOT EXISTS `pieces` (

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

  -- indicates "scored" for ziggurats, cities and fields
  -- indicates "used" for single use ziggurate cards
  `used` BOOLEAN,

  -- landmass for board locations only
  --    north, center, south, river
  `terrain` VARCHAR(6),

  PRIMARY KEY(`location`, `location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8

CREATE TABLE IF NOT EXISTS `moves` (
  `turn_id` INT NOT NULL,
  `src_type` VARCHAR(8) NOT NULL,
  `src_location` VARCHAR(8) NOT NULL,
  `src_locaction_id` INT UNSIGNED
  -- all null / 0 if unchanged
  `dest_location` VARCHAR(8),
  `dest_location_id` INT UNSIGNED,
  `player_id` INT UNSIGNED,
  `used` BOOLEAN,
  `points` INT UNSIGNED DEFAULT 0
)

```

## Use cases / examples

Let's explore how reading and updates happen. Generally, we want to "inflate" the whole state of the game in one scan. For moves-before-turn-commit, changes are written to the `moves` table.

### Piece played from hand into empty spot

One row is written into `turns`:

  * `src_type` is the type of the piece
  * `src_location` is "HAND"
  * `src_location_id` is the hand position
  * `dest_location` is "BOARD"
  * `dest_location_id` is the encoded RowCol of the hex ("hex id")
  * `dest_type` is NULL
  * `player_id` is the player's ID
  * `scored` is false/NULL
  * `points` is the number of zig adjacency points scored for the play

To commit/apply this move:
```sql
  UPDATE pieces
  SET (location = "$dest_location", location_id = $dest_location_id)
  WHERE location = "$src_location" AND location_id = $src_location AND player_id = $player_id;
```

### Piece played from hand into empty river spot

Similar to above. One row is written into `moves`:

  * `src_type` is the type of the piece
  * `src_location` is "HAND"
  * `src_location_id` is the hand position
  * `dest_location` is "BOARD"
  * `dest_location_id` is the encoded RowCol of the hex ("hex id")
  * `dest_type` is "hidden"
  * `player_id` is the player's ID
  * `scored` is false/NULL
  * `points` is the number of zig adjacency points scored for the play

To commit/apply this move:
```sql
  UPDATE pieces
  SET (location = "$dest_location", location_id = $dest_location_id, type = "$dest_type")
  WHERE location = "$src_location" AND location_id = $src_location AND player_id = $player_id;
```
Note this is the same as above, with the addition of setting the type. This can be distinguished just by the non-NULL-ness of the the `dest_type` column

### Farmer played onto field and captures it

This adds one row:

  * `src_type` is "farmer"
  * `src_location` is "HAND"
  * `src_location_id` is the hand position
  * `dest_location` is "BOARD"
  * `dest_location_id` is the encoded RowCol of the hex ("hex id")
  * `dest_type` is NULL
  * `player_id` is the player's ID
  * `scored` is false/NULL
  * `points` is the number of points scored for the play

To commit/apply this move:
```sql
  -- first remove the field
  UPDATE pieces
  SET (location = "DISCARD", location_id = $someval)
  WHERE location = "$dest_location" AND location_id = $dest_location_id;

  -- now move the piece
  UPDATE pieces
  SET (location = "BOARD", location_id = $dest_location_id)
  WHERE location = "HAND" AND location_id = $handpos AND player_id = $player_id;
```

* Question: how to distinguish this move from a regular move?
  * Answer: if dest hex has a field, do this.
  * Other answer: always do this. we'll have a lot of empty in the discard, but so what?
  * Other answer: do it if the dest piece is not empty

### Merchant played that will score a city hex

This is the same as "1. piece played from hand", since scoring happens after turns are committed.

### Hand refilled

This updates just the `pieces` table.

For each tile "drawn":
```sql
  UPDATE pieces
  SET location = "HAND", location_id = $hand_pos
  WHERE location = "POOL" AND location_id = $pool_pos AND player_id = $player_id
```
(ideally do this in a single update with a WHEN clause)

### City hex scored

This needs to either move the city piece to a player, or to the discard.
```sql
  UPDATE pieces
  SET location = "DISCARD", location_id = $somepos --, player_id = $player_id
  WHERE location = "BOARD" and location_id = $rowcol
```

### Ziggurat scored

This needs to move a ziggurat card from the "available" to a player. It may also need to mark the card "used".

```sql
UPDATE pieces
SET location = $dest_location, location_id = $dest_location_id
   -- , used = TRUE
WHERE location = "$src_location" AND location_id = $src_location_id
```

### Ziggurat used

```sql
UPDATE pieces
SET used = TRUE
WHERE location = "$src_location" AND location_id = $src_location_id
```

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

5. Why do we need to record the board and empty spaces? The board is fixed based on number of
   players. It would "allow" alternate boards, but ... why?

6. This model doesn't currently handle the "pool" of available ziggurat cards. Could add a
   new location type (but "pool" is already taken. "available"? "untaken"? "unselected"? "display"?) Maybe just use "cards", and then player_id indicates whether it's available or not. Though that is redundant, could just assert that types "zc_*" ignore the location type. That does bring up that maybe ... they don't belong here.
   Also then, maybe a "captured" location for captured cities per player?

7. Maybe `ziggurat` as well should be a terrain type instead of a piece type?
   that complicates the CSS and rendering. but also is maybe kinda true? they are immutable, not removable, not playable and thus technically don't count in any meaningful way as land or river.