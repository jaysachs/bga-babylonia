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

  const jstpl_log_piece = '<span class="log-element bbl_${piece}"></span>';
  const jstpl_log_city = '<span class="log-element bbl_${city}"></span>';
  const jstpl_log_zcard = '<span class="log-element bbl_${zcard}"></span>';

  const jstpl_player_board_ext =
        '<div class="bbl_playerboard_ext">\
           <div class="bbl_handpoolcity">\
             <div class="bbl_hand">\
               <span class="bbl_hand_label bbl_hidden_${player_number}"></span>\
               <span id="bbl_handcount_${player_id}" class="bbl_counter">5</span>\
             </div>\
             <div class="bbl_pool">\
               <span class="bbl_pool_label hidden_${player_number}"></span>\
               <span class="bbl_pool_label hidden_${player_number}"></span>\
               <span class="bbl_pool_label hidden_${player_number}"></span>\
               <span id="bbl_poolcount_${player_id}" class="bbl_counter">19</span>\
             </div>\
             <div class="bbl_citycount">\
               <span class="bbl_citycount_label"></span>\
               <span id="bbl_citycount_${player_id}" class="bbl_counter">1</span>\
             </div>\
           </div>\
           <div id="bbl_zcards_${player_id}" class="bbl_zcards">\
             <span class="bbl_zcard_label"></span>\
           </div>\
         </div>';

  const jstpl_hex =
    '<div id="bbl_hex_${row}_${col}" style="top:${top}px; left:${left}px;"></div>';

</script>

    <div id="bbl_main">
      <span id="bbl_vars"></span>
      <div id="bbl_hand_container">
        <div id="bbl_hand">
	</div>
      </div>
      <!-- needed since the board is absolutely positions / sized. for now. -->
      <div id="bbl_board"></div>
      <div id="bbl_available_zcards">
      </div>
    </div>

{OVERALL_GAME_FOOTER}
