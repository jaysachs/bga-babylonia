* (NEVER DONE) Add more unit tests.
* Hovercards for cities (and fields) showing the points that would be scored for it
* ?? "uncommitted" turns only visible to active player
* ?? Animate piece moves before sending action (i.e. assume success action). This will give the UI a
  "peppier" feel.
  * Mostly straightforward right now to just implement this client-side for played pieces
  * Undo, though: we don't current know what was just played, or if a field was taken, points, etc.
    So, instead of "canUndo" we should send back a "undoData" submessage with all that stuff
    Then, can deal with the undo animation clientside while still sending the action call
* Hand positions should be 1-based
