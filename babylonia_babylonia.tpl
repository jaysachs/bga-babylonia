{OVERALL_GAME_HEADER}

<!-- 
--------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- babylonia implementation : © Jay Sachs <jay@covariant.org>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-------

    babylonia_babylonia.tpl
    
    This is the HTML template of your game.
    
    Everything you are writing in this file will be displayed in the HTML page of your game user interface,
    in the "main game zone" of the screen.
    
    You can use in this template:
    _ variables, with the format {MY_VARIABLE_ELEMENT}.
    _ HTML block, with the BEGIN/END format
    
    See your "view" PHP file to check how to set variables and control blocks
    
    Please REMOVE this comment before publishing your game on BGA
-->


<script type="text/javascript">

// Javascript HTML templates

/*
// Example:
var jstpl_some_game_item='<div class="my_game_item" id="my_game_item_${MY_ITEM_ID}"></div>';

*/

  function selectHex(event) {
        event.preventDefault();
        event.stopPropagation();
        let e = event.target;
        while (e.parentElement != null && e.parentElement.id != "board") {
            e = e.parentElement;
        }
      if (e.parentElement != null) {
            let x = e.id.split("_");
            console.log("selected hex " + x[1] + ", " + x[2]);
            window.alert("Selected " + e.id);
      }
  }

    function selectPieceToPlay(event) {
        event.preventDefault();
        event.stopPropagation();
        let e = event.target;
        let hc = e.parentElement.parentElement;
        if (hc.id == "hand") {
            let c = e.parentElement.classList;
            if (!c.contains("selected")) {
                hc.querySelectorAll('.selected').forEach(div => div.classList.remove('selected'));
            }
            c.toggle("selected");
        }
    }

</script>  

    <div id="main"> 
      <div style="width: 1024px; display: flex; flex-direction:row; flex-wrap: nowrap; justify-content:center;">
        <div class="hand blue" id="hand" onClick="selectPieceToPlay(event)">
          <div>
            <div id="hand_1" class="farmer"></div>
          </div>
          <div>
            <div id="hand_2" class="priest"></div>
          </div>
          <div>
            <div id="hand_3" class="merchant"></div>
          </div>
          <div>
            <div id="hand_4" class="farmer"></div>
          </div>
          <div>
            <div id="hand_5" class="merchant"></div>
          </div>
          <div>
	    <div id="hand_6"></div>
	  </div>
          <div>
	    <div id="hand_7"></div>
	  </div>
        </div>
      </div>
      <!-- needed since the board is absolutely positions / sized. for now. -->
      <div class="board-spacer"></div>
      <div class="board" id="board" onClick="selectHex(event)">
      </div>
    </div>

{OVERALL_GAME_FOOTER}
