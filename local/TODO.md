4 Implement scoring hexes (via game option):
4.1  simple: there's only one hex to score
4.2  complex: score active player won ziggurats, then ask other players cities, then active player cities, then other player ziggurats
5. Implement undo.
6. (IN PROGRESS) Add unit tests. Add a script to run them.
7. General improvement of visuals, including hex rendering and highlighting allowed moves.
  * This may involve a bit of restructuring (div-in-div?) of the board, since we use clip to make things hex sized, so just using border won't work. Ideally though we'd get the hex divs to be a single div (or at most a single div-in-div).
13. Consider hex-highlighting (and piece?) via filters or other CSS-wizardry (but careful of iOS performance issues).
14. (DONE) Ziggurat cards should maybe have a description in addition to an id. hovercard.
15. ?? Use image action buttons handle playing pieces.
16. Use client state to handle playing pieces.
19. Audit all notifications; are they all required? any missing? incomplete?
20. Decide between using image action buttons or board locations for indicating choices. Having it be board for piece playing but image action buttons for zig cards is weird.
21. Animate hex networks during city scoring.
