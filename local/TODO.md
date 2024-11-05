4 Implement scoring hexes (via game option):
4.1  simple: there's only one hex to score
4.2  complex: score active player won ziggurats, then ask other players cities, then active player cities, then other player ziggurats
6. (IN PROGRESS) Add unit tests. Add a script to run them.
7. General improvement of visuals, including hex rendering and highlighting allowed moves.
  * This may involve a bit of restructuring (div-in-div?) of the board, since we use clip to make things hex sized, so just using border won't work. Ideally though we'd get the hex divs to be a single div (or at most a single div-in-div).
13. Consider hex-highlighting (and piece?) via filters or other CSS-wizardry (but careful of iOS performance issues).
19. Audit all notifications; are they all required? any missing? incomplete?
21. Animate hex networks during city scoring.
