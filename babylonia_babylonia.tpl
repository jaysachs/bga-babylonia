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


This is your game interface. You can edit this HTML in your ".tpl" file.


<script type="text/javascript">

// Javascript HTML templates

/*
// Example:
var jstpl_some_game_item='<div class="my_game_item" id="my_game_item_${MY_ITEM_ID}"></div>';

*/

</script>  


      <div style="width: 1024px; display: flex; flex-direction:row; flex-wrap: nowrap; justify-content:center;">
	<div class="hand wood" id="hand" onClick="selectPieceToPlay(event)">
	  <div>
	    <div class="farmer"></div>
	  </div>
	  <div class="selected">
	    <div class="priest"></div>
	  </div>
	  <div class="unplayable">
	    <div class="merchant"></div>
	  </div>
	  <div>
	    <div class="farmer"></div>
	  </div>
	  <div>
	    <div class="merchant"></div>
	  </div>
	  <div></div>
	  <div></div>
	</div>
      </div>
      <div class="container" id="container" onClick="selectHex(event)">
	<script>
	  let c = document.getElementById("container");
	  for (let j = 0; j < 16; j++) {
	      let odd = j % 2 == 0;
	      let rows = odd ? 12 : 11;
	      for (let i = 0; i < rows; i++) {
		  let top = i * 63 + (odd ? 6 : 37);
		  let left = 38 + (j * 55);
		  c.insertAdjacentHTML(
		      `beforeend`,
		      `<div id="hex_${i}_${j}" style="top:${top}px; left:${left}px;"><div></div></div>`
		  );
	      }
	  }
	</script>
      </div>

{OVERALL_GAME_FOOTER}
