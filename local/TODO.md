1. Show hand and pool size in player panel
  * https://en.doc.boardgamearena.com/Common_board_game_elements_image_resources has hand icon
  * https://en.doc.boardgamearena.com/Game_interface_logic:_yourgamename.js#Players_panels has info on adding to the player panel, and also about using counters, which provide some automation for updating client.
2. (DONE) Highlight playable hexes when hand piece selected. Don't permit unplayable hexes to be clicked on.
3. Implement logic for ziggurat card powers.
4. Implement post-piece-playing scoring choices
4.1 Implement choosing ziggurat cards.
4.2 Implement automating that when
4.2.1  there's only one city
4.2.2  no ziggurats and only one player will score the cities
4.2.2.1 no ziggurats, and the active player and one other player will score cities
4.2.3  make the partial automation a game option
5. Implement undo.
6. Add unit tests. Add a script to run them.
7. General improvement of visuals, including hex rendering and highlighting allowed moves.
  * This may involve a bit of restructuring (div-in-div?) of the board, since we use clip to make things hex sized, so just using border won't work. Ideally though we'd get the hex divs to be a single div (or at most a single div-in-div).
8. (DONE) Consider a real class for PlayerData -- or combine with PlayerInfo?
9. (DONE) Split out "PlayerHandAndPool" (or PlayerHand or PlayerPieces -- include ziggurats?) class, and change "PlayerInfo" to just be scalar data like score, captured_city_count, etc. (And maybe PlayerInfo should have the ziggurats?)
10. (DONE) Fix game end condition. It's not "hand can't refill" but rather "pool is empty or <=1 cities left on board".
11. Improved notification message rendering:
11.1 Get all player names rendered properly in the log
11.2 Instead of e.g. "city_ms", use the image for it. Similar for fields.
12. Player board images: put zig cards there, use "zig" image in the board. Use a city tile (with the symbols removed so just the blue rectangle) for captured cities. For hand, use the standard "hand" -- or maybe a blank player piece. For pool -- use a "pile" of pieces?
13. Consider hex-highlighting (and piece?) via filters or other CSS-wizardry (but careful of iOS performance issues).
14. Ziggurat cards should maybe have a description in addition to an id.
