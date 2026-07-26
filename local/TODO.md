* (NEVER DONE) Add more unit tests.
* ?? "uncommitted" turns only visible to active player
* ?? Animate piece moves before sending action (i.e. assume success action). This will give the UI a
  "peppier" feel.
  * Mostly straightforward right now to just implement this client-side for played pieces
  * Undo, though: we don't current know what was just played, or if a field was taken, points, etc.
    So, instead of "canUndo" we should send back a "undoData" submessage with all that stuff
    Then, can deal with the undo animation clientside while still sending the action call
* Hand positions should be 1-based

* Use box-shadow for highlighting. Tricky to get right, because
  of div aspect ratio -- need to keep as a circle.
* Look at other ways to indicate possible destinations
* Highlight zcards when selectable
* zcard rendering in general

Use CSS for highlighting pieces:
div {
    width: 50px;
    height: 50px;
    background-color: #e65525;
    border-radius:50%;
    box-shadow: 0 0 0 3px #e78267;
}

and also try for hexes too.


* UX:
  * highlight around pieces in hand is too small. Make pieces standard size? Or put circle on top in z-order?
  * black pieces played in some parts of river are hard to tell they are not river, even though white "foam" is interrupted -- that was too subtle.
  * Where do ziggurat cards go? Nice if on board to reduce "clutter"
  * Better ziggurat card selection experience ... "pop-up"? shrink/scroll?
    Definitely improve selection highlighting, and confirmation.
  * City colors: not enough contrast between city and board. Also, dark band
    possibly too close to river color.
  * What if river color didn't take up whole tile but was a clear band of
    (darker) blue?

* User preferences for:
  * timed auto-confirms
  * Location of pieces: top/bottom left/right

* Bug: canceling zcard selection does not work!
