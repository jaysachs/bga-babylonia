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

  const jstpl_log_piece = '<span class="log-element ${piece}"></span>';
  const jstpl_log_city = '<span class="log-element ${city}"></span>';
  const jstpl_log_zcard = '<span class="log-element ${zcard}"></span>';

  const jstpl_player_board_ext =
        '<div class="b_playerboard_ext">\
           <div class="b_handpoolcity">\
             <div class="b_hand">\
               <span class="b_hand_label empty_${player_number}"></span>\
               <span id="handcount_${player_id}" class="b_counter">5</span>\
             </div>\
             <div class="b_pool">\
               <span class="b_pool_label empty_${player_number}"></span>\
               <span class="b_pool_label empty_${player_number}"></span>\
               <span class="b_pool_label empty_${player_number}"></span>\
               <span id="poolcount_${player_id}" class="b_counter">19</span>\
             </div>\
             <div class="b_citycount">\
               <span class="b_citycount_label"></span>\
               <span id="citycount_${player_id}" class="b_counter">1</span>\
             </div>\
           </div>\
           <div id="b_ziggurats_${player_id}" class="b_ziggurats">\
             <span class="b_ziggurat_label"></span>\
           </div>\
         </div>';

  const jstpl_hex =
    '<div id="hex_${row}_${col}" style="top:${top}px; left:${left}px;">\
       <div><div></div></div>\
     </div>';

</script>

    <div id="main">
      <div id="hand_container">
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
