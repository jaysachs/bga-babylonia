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
</script>

    <div id="main">
      <div style="width: 1024px; display: flex; flex-direction:row; flex-wrap: nowrap; justify-content:center;">
        <div class="hand" id="hand">
	</div>
      </div>
      <!-- needed since the board is absolutely positions / sized. for now. -->
      <div class="board-spacer"></div>
      <div class="board" id="board"></div>
      <div id="available_ziggurats">
	<div id="zig1"></div>
	<div id="zig2"></div>
	<div id="zig3"></div>
	<div id="zig4"></div>
	<div id="zig5"></div>
	<div id="zig6"></div>
	<div id="zig7"></div>
      </div>
    </div>

{OVERALL_GAME_FOOTER}
