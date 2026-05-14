* (NEVER DONE) Add more unit tests.
* Tooltips / animations for cities (and fields) showing the points that would be scored for it (on
  hover?)
* Rework persistence model
* "uncommitted" turns only visible to active player
  * stats only updated when turn committed
* Truly responsive layout like T&E -- keep "ideal" size so board "always" fits in window
  * probably need onChangeSize support
* Optimize DB calls away. In particular, don't transition from PlayPieces to PlayPieces; that
  state change triggers a call to getArgs(), which is a full DB retrieval. Instead, after playing a piece / undoing a move, send updates to "available moves" in a private notif, and update the structure client-side. (The update doesn't even need to be a delta; it could be a full replacement.) The key thing is, we already have the state so don't need to retrieve it again.
* Optimize the "available moves" by having an "anypiece" category, and then just extra for the
  specific pieces, if any.