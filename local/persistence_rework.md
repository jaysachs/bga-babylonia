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
