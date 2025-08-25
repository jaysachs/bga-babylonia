1. (NEVER DONE) Add more unit tests.
2. Implement ZIGGURAT_CARD_USED statistics.
3. ~~DONE When choosing city/zigs to score manually, highlight the chosen one. Do this via notify from appropriate arg/state functions.~~
4. ~~DONE Add a confirmation (timed) to ziggurat card selection.~~
5. Add a (optional?) timed confirmation for "end turn"
6. Consider re-working representation and have explicit DIVs for all pieces (ziggurats, cities, player pieces). This could facilitate animations.
7. ~~DONE Make ziggurat card choices from the status bar (optionally also let choosing from the display). Then can have the confirm countdown.~~
8. ~~DONE When scoring ziggurats, briefly highlight ("blink") the adjacent pieces, clearly identifying the winner.~~
9. ~~DONE During city scoring, highlight the adjacent pieces & winner before capturing the piece.~~
10.~~NOT MY BUG Consider timed confirm for manual selection of scored hexes.~~
11. Optimize the representation / payload for allowed moves. In particular, consider not sending RowCol as objects but instead their string rep (e.g. "3_8"). The FE only needs the separate row col when constructing the grid, and when sending actions back (though could also use the string format there too).
12. ~~DONE Thorough manual testing of manual scoring hex selection.~~
13. For manual scoring hex selection, automate if just one possibility.
14. ~~NOT MY BUG Figure out bug with intermittend animation waiting on nonvisibloe separate tab.~~
15. Tooltips for cities (and fields) showing the points that would be scored for it.
16. ~~ONLY IF REQUESTED User preferences for autoconfirm?~~
17. ~~NOT MY BUG Game option to permit undo? Only undo on turn-based? Change undo to full-turn undo and implement turns client side? (Or even still use server-side and merge pending actions for the active player?)~~
18. When choosing zcards, change status to something like "Select card .... [confirm] [cancel]". (Maybe re-use log formatting for zcards).
