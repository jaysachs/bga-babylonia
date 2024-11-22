/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <vagabond@covariant.org>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * babylonia.js
 *
 * babylonia user interface script
 *
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

const IDS = {
    AVAILABLE_ZCARDS: 'bbl_available_zcards',
    BOARD: 'bbl_board',
    HAND: 'bbl_hand'
};

const CSS = {
    SELECTING: 'bbl_selecting',
    SELECTED: 'bbl_selected',
    PLAYABLE: 'bbl_playable',
    UNPLAYABLE: 'bbl_unplayable',
    EMPTY: 'bbl_empty'
};



const jstpl_log_piece = '<span class="log-element bbl_${piece}"></span>';
const jstpl_log_city = '<span class="log-element bbl_${city}"></span>';
const jstpl_log_zcard = '<span class="log-element bbl_${zcard}"></span>';

const jstpl_player_board_ext =
      '<div>\
         <span class="bbl_pb_hand_label_${player_number}"></span>\
         <span id="bbl_handcount_${player_id}">5</span>\
       </div>\
       <div>\
         <span class="bbl_pb_pool_label_${player_number}"></span>\
         <span id="bbl_poolcount_${player_id}">19</span>\
       </div>\
       <div>\
         <span class="bbl_pb_citycount_label"></span>\
         <span id="bbl_citycount_${player_id}">1</span>\
       </div>\
       <div id="bbl_zcards_${player_id}" class="bbl_pb_zcards">\
         <span class="bbl_pb_zcard_label"></span>\
       </div>';

const jstpl_hex =
      '<div id="bbl_hex_${row}_${col}" style="top:${top}px; left:${left}px;"></div>';

document.getElementById('game_play_area').insertAdjacentHTML('beforeend', `
       <div id="bbl_main">
         <div id="bbl_hand_container">
           <div id="${IDS.HAND}"></div>
         </div>
         <div id="bbl_board_container">
           <span id="bbl_vars"></span>
           <div id="${IDS.BOARD}"></div>
         </div>
         <div id="${IDS.AVAILABLE_ZCARDS}"></div>
      </div>
`);


var thegame = null;
define([
    'dojo','dojo/_base/declare', 'dojo/_base/fx',
    g_gamethemeurl + "modules/js/hexloc.js",
    'ebg/core/gamegui',
    'ebg/counter',
],
function (dojo, declare, fx, hexloc) {
    return declare('bgagame.babylonia', ebg.core.gamegui, {
        constructor: function(){
            console.log('babylonia constructor');

            // Here, you can init the global variables of your user interface
            // Example:
            // this.myGlobalValue = 0;

            dojo.connect( $(IDS.HAND), 'onclick', this, 'onPieceSelection' );
            dojo.connect( $(IDS.BOARD), 'onclick', this, 'onHexSelection' );
            dojo.connect( $(IDS.AVAILABLE_ZCARDS), 'onclick', this, 'onZcardSelected');
        },

        selectedHandPos: null,
        pieceClasses: [ 'priest', 'servant', 'farmer', 'merchant' ],
        stateName: '',
        stateArgs: [],
        lastId: 0,
        zcards: [],
        hand: [],
        playerNumber: -1,
        hand_counters: [],
        pool_counters: [],
        city_counters: [],

        /*
            setup:

            This method must set up the game user interface according
            to current game situation specified in parameters.

            The method is called each time the game interface is
            displayed to a player, ie:
            _ when the game starts
            _ when a player refreshes the game page (F5)

            'gamedatas' argument contains all datas retrieved by your
            'getAllDatas' PHP method.
        */
        setup: function( gamedatas ) {
            console.log( 'Starting game setup' );
            thegame = this;
            this.playerNumber = gamedatas.players[this.player_id].player_number;

            console.log('Setting up player boards');
            for( var player_id in gamedatas.players ) {
                this.setupPlayerBoard( gamedatas.players[player_id] );
            }

            this.setupBoard(gamedatas.board, gamedatas.players);

            console.log("Setting up player hand");
            this.hand = gamedatas.hand;
            this.renderHand();

            this.setupAvailableZcards(gamedatas.ziggurat_cards);

            console.log( 'setting up notifications' );
            this.bgaSetupPromiseNotifications();

            console.log( 'Game setup done.' );
        },

        setupPlayerBoard: function( player ) {
            let player_id = player.player_id;
            console.log('Setting up board for player ' + player_id);
            let player_board_div = this.getPlayerPanelElement(player_id);
            dojo.place( this.format_block('jstpl_player_board_ext',
                                          {
                                              'player_id': player_id,
                                              'player_number': player.player_number
                                          } ),
                        player_board_div );
            // create counters per player
            this.hand_counters[player_id]=new ebg.counter();
            this.hand_counters[player_id].create(this.handcount_id(player_id));
            this.pool_counters[player_id]=new ebg.counter();
            this.pool_counters[player_id].create(this.poolcount_id(player_id));
            this.city_counters[player_id]=new ebg.counter();
            this.city_counters[player_id].create(this.citycount_id(player_id));
            this.updateHandCount(player, false);
            this.updatePoolCount(player, false);
            this.updateCapturedCityCount(player, false);
        },

        setupBoard: function( boardData, playersData ) {
            console.log('Setting the the game board');
            let boardDiv = $(IDS.BOARD);
            // console.log( gamedatas.board );

            for( let h = 0; h < boardData.length; ++h) {
                let hex = boardData[h];
                let tl = hexloc.hexLocation(hex);

                dojo.place( this.format_block('jstpl_hex',
                                              {
                                                  'row': hex.row,
                                                  'col': hex.col,
                                                  // or ... row / 2 * 63 + 6;
                                                  'top': tl.top,
                                                  'left': tl.left,
                                              } ),
                            boardDiv );

                let p = hex.piece;
                if (p != null) {
                    let n = (hex.board_player == 0)
                        ? null
                        : playersData[hex.board_player].player_number;
                    this.renderPlayedPiece(hex.row, hex.col, p, n);
                }
            }
        },

        handcount_id: function(player_id) {
            return 'bbl_handcount_' + player_id;
        },
        poolcount_id: function(player_id) {
            return 'bbl_poolcount_' + player_id;
        },
        citycount_id: function(player_id) {
            return 'bbl_citycount_' + player_id;
        },

        onHexSelection: function (event) {
            // console.log('onHexSelection:' + event.target.id);
            event.preventDefault();
            event.stopPropagation();
            if(! this.isCurrentPlayerActive() ) {
                 return false;
            }
            switch (this.stateName) {
                case 'client_pickHexToPlay':
                    this.playSelectedPiece(event);
                    break;
                case 'selectHexToScore':
                    this.selectHexToScore(event);
                    break;
            }
        },

        // Returns the hex (row,col) clicked on, or null if not a playable hex
        selectedHex: function(target) {
            let e = target;
            while (e.parentElement != null && e.parentElement.id != IDS.BOARD) {
                e = e.parentElement;
            }
            if (e.parentElement == null) {
                console.warn('no hex');
                return null;
            }
            // now check if it's allowed
            let ae = e;
            if (!ae.classList.contains(CSS.PLAYABLE)) {
                // console.log('not playable');
                return null;
            }
            let id = e.id.split('_');
            return {
                row: id[2],
                col: id[3],
            };
        },

        selectHexToScore: function(event) {
            let hex = this.selectedHex(event.target);
            if (hex == null) {
                return;
            }
            // console.log('selected hex ' + hex.row + ',' + hex.col);
            let rc = {
                row: hex.row,
                col: hex.col
            };
            this.bgaPerformAction('actSelectHexToScore', rc ).then(() =>  {
                this.unmarkHexPlayable(rc);
            });
        },

        playSelectedPiece: function(event) {
            if (this.selectedHandPos == null) {
                console.error('no piece selected!');
            }

            let hex = this.selectedHex(event.target);
            if (hex == null) {
                return;
            }
            // console.log('selected hex ' + hex.row + ',' + hex.col);

            this.bgaPerformAction('actPlayPiece', {
                handpos: this.selectedHandPos,
                row: hex.row,
                col: hex.col
            }).then(() =>  {
                this.unmarkHexPlayable({
                    row: hex.row,
                    col: hex.col
                });
            });
            this.unselectAllHandPieces();
        },

        markAllHexesUnplayable: function() {
            $(IDS.BOARD).querySelectorAll('.' + CSS.PLAYABLE)
                .forEach(div => div.classList.remove(CSS.PLAYABLE));
        },

        pieceForHandDivClassList: function(cl) {
            // console.log('pieceFor: ' + cl);
            for (var i = 0; i < this.pieceClasses.length; ++i) {
                if (cl.contains(this.handPieceClass(this.pieceClasses[i]))) {
                    return this.pieceClasses[i];
                }
            }
            return null;
        },

        allowedMovesFor: function(pos) {
            const piece = this.hand[pos];
            if (piece == null) {
                return [];
            }
            let m = this.stateArgs.allowedMoves[piece];
            if (m == null) {
                m = [];
            }
            return m;
        },

        markHexPlayable: function (rc) {
            this.hexDiv(rc.row, rc.col)
                .classList.add(CSS.PLAYABLE);
        },

        unmarkHexPlayable: function (rc2) {
            this.hexDiv(rc2.row, rc2.col)
                .classList.remove(CSS.PLAYABLE);
        },

        markScoreableHexesPlayable: function(hexes) {
            hexes.forEach(rc => this.markHexPlayable(rc));
        },

        markHexesPlayableForPiece: function(pos) {
            this.allowedMovesFor(pos).forEach(rc => this.markHexPlayable(rc));
        },

        unmarkHexesPlayableForPiece: function(pos) {
            this.allowedMovesFor(pos).forEach(rc => this.unmarkHexPlayable(rc));
        },

        onZcardSelected: function (event) {
            console.log(event);
            event.preventDefault();
            event.stopPropagation();
            if (! this.isCurrentPlayerActive()) {
                 return false;
            }
            if (this.stateName != 'selectZigguratCard') {
                return false;
            }
            let zdiv = event.target;
            const re = /bbl_zig_(\d)/;
            const matchInfo = re.exec(zdiv.id);
            if (matchInfo == null) {
                console.error("couldn't determine zcard from ", zdiv.id);
                return false;
            }
            const z = matchInfo[1];
            this.bgaPerformAction('actSelectZigguratCard',
                                  { card_type: this.zcards[z].type });
            let div = $( IDS.AVAILABLE_ZCARDS );
            div.classList.remove(CSS.SELECTING);
            return false;
        },

        onPieceSelection: function(event) {
            console.log('onPieceSelection');
            event.preventDefault();
            event.stopPropagation();
            if(! this.isCurrentPlayerActive() ) {
                 return false;
            }
            if (this.stateName != 'client_selectPieceOrEndTurn'
                && this.stateName != 'client_pickHexToPlay'
                && this.stateName != 'client_mustSelectPiece') {
                return false;
            }
            let selectedDiv = event.target;
            if (selectedDiv.parentElement.id != IDS.HAND) {
                return false;
            }
            const handpos = selectedDiv.id.split('_')[2];
            if (this.allowedMovesFor(handpos).length == 0) {
                return false;
            }
            var playable = false;
            let c = selectedDiv.classList;
            if (!c.contains(CSS.SELECTED)) {
                this.unselectAllHandPieces();
                this.markHexesPlayableForPiece(handpos);
                playable = true;
            } else {
                this.unmarkHexesPlayableForPiece(handpos);
            }
            c.toggle(CSS.SELECTED);
            if (playable) {
                this.selectedHandPos = handpos;
                if (this.stateName != 'client_pickHexToPlay') {
                    this.setClientState('client_pickHexToPlay', {
                        descriptionmyturn : _('${you} must select a hex to play to'),
                    });
                    this.addActionButton(
                        'cancel-btn',
                        'Cancel',
                        () => {
                            this.unselectAllHandPieces();
                            this.setStatusBarForPlayState();
                        });
                }
            } else {
                this.setStatusBarForPlayState();
            }
            return false;
        },

        unselectAllHandPieces: function() {
            for (let p = 0; p < this.hand.length; ++p) {
                cl = $( `bbl_hand_${p}` ).classList;
                if (cl.contains(CSS.SELECTED)) {
                    this.unmarkHexesPlayableForPiece(p);
                }
                cl.remove(CSS.SELECTED);
                cl.remove(CSS.PLAYABLE);
                cl.remove(CSS.UNPLAYABLE);
            }
            this.selectedHandPos = null;
        },

        setPlayablePieces: function() {
            for (let p = 0; p < this.hand.length; ++p) {
                cl = $( `bbl_hand_${p}` ).classList;
                if (this.allowedMovesFor(p).length > 0) {
                    cl.add(CSS.PLAYABLE);
                    cl.remove(CSS.UNPLAYABLE);
                } else {
                    cl.remove(CSS.PLAYABLE);
                    cl.add(CSS.UNPLAYABLE);
                }
            }
        },

        setStatusBarForPlayState: function() {
            if( !this.isCurrentPlayerActive() ) {
                return;
            }
            this.selectedHandPos = null;
            if (this.stateArgs.canEndTurn) {
                if (this.stateArgs.allowedMoves.length == 0) {
                    this.setClientState('client_noPlaysLeft', {
                        descriptionmyturn : _('${you} must end your turn'),
                    });
                } else {
                    this.setClientState('client_selectPieceOrEndTurn', {
                        descriptionmyturn : _('${you} may select a piece to play or end your turn'),
                    });
                    this.setPlayablePieces();
                }
                this.addActionButton(
                    'end-btn',
                    'End turn',
                    () => {
                        this.unselectAllHandPieces();
                        this.bgaPerformAction('actDonePlayPieces');
                    });
            } else {
                this.setClientState('client_mustSelectPiece', {
                    descriptionmyturn : _('${you} must select a piece to play'),
                });
                this.setPlayablePieces();
            }
            if (this.stateArgs.canUndo) {
                this.addActionButton(
                    'undo-btn',
                    'Undo',
                    () => this.bgaPerformAction('actUndoPlay')
                );
            }
        },

        ///////////////////////////////////////////////////
        //// Game & client states

        // onEnteringState: this method is called each time we are
        //                  entering into a new game state.  You can
        //                  use this method to perform some user
        //                  interface changes at this moment.
        //
        onEnteringState: function( stateName, stateInfo ) {
            console.log( 'Entering state: '+stateName,
                         this.isCurrentPlayerActive(),
                         stateInfo );
            // All other important things are done in onUpdateActionButtons.
            // let args = stateInfo.args;
            switch( stateName ) {
                case 'endOfTurnScoring':
                    // this.markAllHexesUnplayable();
                    break;

                case 'selectHexToScore':
                    // this.markAllHexesUnplayable();
                    break;

                case 'dummmy':
                    break;
            }
        },

        // onLeavingState: this method is called each time we are
        //                 leaving a game state.  You can use this
        //                 method to perform some user interface
        //                 changes at this moment.
        //
        onLeavingState: function( stateName ) {
            console.log( 'Leaving state: '+stateName );
            this.stateName = '';
            switch( stateName ) {
                    /* Example:

                       case 'myGameState':

                       // Hide the HTML block we are displaying only
                       // during this game state
                       dojo.style( 'my_html_block_id', 'display', 'none' );

                       break;
                    */

                case 'dummmy':
                    break;
            }
        },

        addImageActionButton: function(id, div, handler, bcolor, tooltip) {
	    if (typeof bcolor == 'undefined') {
		bcolor = 'gray';
	    }
	    // this will actually make a transparent button id color = gray
	    this.addActionButton(id, div, handler, null, false, bcolor);
	    // remove border, for images it better without
	    dojo.style(id, 'border', 'none');
	    // but add shadow style (box-shadow, see css)
	    dojo.addClass(id, 'shadow bgaimagebutton');
	    // you can also add additional styles, such as background
	    if (tooltip) {
		dojo.attr(id, 'title', tooltip);
	    }
	    return $(id);
        },

        // onUpdateActionButtons: in this method you can manage
        //                        'action buttons' that are displayed
        //                        in the action status bar (ie: the
        //                        HTML links in the status bar).
        //
        onUpdateActionButtons: function( stateName, args ) {
            console.log( 'onUpdateActionButtons: '+stateName,
                         this.isCurrentPlayerActive(),
                         args );
            this.stateName = stateName;
            this.stateArgs = args;
            if( this.isCurrentPlayerActive() ) {
                switch( stateName ) {
                    case 'chooseExtraTurn':
                        this.addActionButton(
                            'extra-turn-btn',
                            'Take your one-time extra turn',
                            () => this.bgaPerformAction('actChooseExtraTurn', {
                                take_extra_turn: true
                            }));
                        this.addActionButton(
                            'noextra-turn-btn',
                            'Just finish your turn',
                            () => this.bgaPerformAction('actChooseExtraTurn', {
                                take_extra_turn: false
                            }));
                        break;

                    case 'endOfTurnScoring':
                        this.markAllHexesUnplayable();
                        break;

                    case 'selectHexToScore':
                        this.markScoreableHexesPlayable(args.hexes);
                        break;

                    case 'selectZigguratCard':
                        let div = $( IDS.AVAILABLE_ZCARDS );
                        div.scrollIntoView( false );
                        div.classList.add(CSS.SELECTING);
                        this.updateStatusBar(_('You must select a ziggurat card'));
                        break;

                    case 'playPieces':
                        this.setStatusBarForPlayState();
                        this.markAllHexesUnplayable();
                        break;
                }
            }
        },

        ///////////////////////////////////////////////////
        //// Utility methods

        updateStatusBar: function(message) {
            $('gameaction_status').innerHTML = _(message);
            $('pagemaintitletext').innerHTML = _(message);
        },

        hexDivId: function(row, col) {
            return `bbl_hex_${row}_${col}`;
        },

        hexDiv: function (row, col) {
            return $(this.hexDivId(row,col));
        },

        handPosDiv: function (i) {
            let id = `bbl_hand_${i}`;
            let div = $(id);
            if (div != null) {
                return div;
            }
            // dynamically extend hand as needed.
            const hand = $(IDS.HAND);
            for (j = 0; j <= i; ++j) {
                let id = `bbl_hand_${j}`;
                let d = $(id);
                if (d == null) {
                    dojo.create('div',
                                {
                                    id: id,
                                    className: CSS.EMPTY,
                                },
                                hand);
                }
            }
            return $(id);
        },

        pieceClass: function (piece, playerNumber) {
            if (playerNumber == null) {
                return 'bbl_' + piece;
            } else {
                return 'bbl_' + piece + '_' + playerNumber;
            }
        },

        renderPlayedPiece: function (row, col, piece, playerNumber) {
            this.hexDiv(row, col).className =
                this.pieceClass(piece, playerNumber);
        },

        handPieceClass: function(piece, playerNumber = null) {
            if (piece == null || piece == "empty") {
                return CSS.EMPTY;
            }
            return this.pieceClass(
                piece,
                playerNumber == null ? this.playerNumber : playerNumber);
        },

        updateCounter: function(counter, value, animate) {
            if (animate) {
                counter.toValue(value);
            } else {
                counter.setValue(value);
            }
        },

        updateHandCount: function(player, animate=true) {
            this.updateCounter(this.hand_counters[player.player_id],
                               player.hand_size,
                               animate);
        },

        updatePoolCount: function (player, animate=true) {
            this.updateCounter(this.pool_counters[player.player_id],
                               player.pool_size,
                               animate);
        },

        updateCapturedCityCount: function (player, animate=true) {
            this.updateCounter(this.city_counters[player.player_id],
                               player.captured_city_count,
                               animate);
        },

        renderHand: function() {
            for (i = 0; i < this.hand.length; ++i) {
                this.handPosDiv(i).className = this.handPieceClass(this.hand[i]);
            }
        },

        setupAvailableZcards: function(zcards) {
            console.log('Setting up available ziggurat cards', zcards);
            this.zcards = zcards;
            for( let z = 0; z < zcards.length; z++) {
                let card = zcards[z];
                const id = `bbl_zig_${z}`;
                if (card.owning_player_id != 0) {
                    this.addZcardDivInPlayerBoard(z);
                    // and "shell" in available cards
                    dojo.place(`<div id='${id}'</div>`, IDS.AVAILABLE_ZCARDS);
                } else {
                    // just in available cards
                    this.addZigguratCardDiv(id, IDS.AVAILABLE_ZCARDS, z);
                }
            }
        },

        playerBoardZcardsId: function(z) {
            const owner = this.zcards[z].owning_player_id;
            return `bbl_zcards_${owner}`;
        },

        ownedZcardId: function(z) {
            return `bbl_ozig_${z}`;
        },

        availableZcardId: function(z) {
            return `bbl_zig_${z}`;
        },

        addZcardDivInPlayerBoard: function(z) {
            this.addZigguratCardDiv(this.ownedZcardId(z),
                                    this.playerBoardZcardsId(z),
                                    z);
        },

        indexOfZcard: function(cardType) {
            for (var z = 0; z < this.zcards.length; ++z) {
                if (this.zcards[z].type == cardType) {
                    return z;
                }
            }
            return -1;
        },

        zcardClass: function(card, used = false) {
            return used ? 'bbl_zc_used' : ('bbl_' + card);
        },

        addZigguratCardDiv: function(id, parentElem, z) {
            const cls = this.zcardClass(this.zcards[z].type, this.zcards[z].used);
            const div = dojo.place( `<div id='${id}' class='${cls}'</div>`,
                                    parentElem );
            this.addTooltip( id, this.zcards[z].tooltip, '' );
            // div.title = this.zcards[z].tooltip;
        },

        slideDiv: function(className,
                           from,
                           to,
                           onEnd = null,
                           parent = IDS.BOARD) {
            let id = `tempSlide${this.lastId++}`;

            let prect = $(parent).getBoundingClientRect();
            let frect = $(from).getBoundingClientRect();
            let top = frect.top - prect.top;
            let left = frect.left - prect.left;
            let div = dojo.place(`<div id="${id}" class='${className}' style='position:absolute; top: ${top}px; left: ${left}px; z-index: 100;'></div>`,
                                 parent);
            let a = this.slideToObject(div, to);
            dojo.connect(a, 'onEnd', () => {
                dojo.destroy(div);
                if (onEnd !== null) {
                    onEnd();
                }
            });
            return a;
        },

        /* @Override */
        format_string_recursive : function format_string_recursive(log, args) {
            let saved = [];
            try {
                if (log && args && !args.processed) {
                    args.processed = true;

                    // list of special keys we want to replace with images
                    var keys = ['piece', 'city', 'zcard', 'original_piece'];
                    for ( var i in keys) {
                        var key = keys[i];
                        if (key in args) {
                            saved[key] = args[key];
                            args[key] = this.richFormat(key, args);
                        }
                    }
                }
            } catch (e) {
//                console.error(log,args,'Exception thrown', e.stack);
            }
            try {
                return this.inherited({callee: format_string_recursive}, arguments);
            } finally {
                for ( var i in saved ) {
                    args[i] = saved[i];
                }
            }
        },

        richFormat: function(key, args) {
            switch (key) {
                case 'zcard':
                    return this.format_block(
                        'jstpl_log_zcard',
                        {
                            'zcard': args[key],
                        });
                case 'city':
                    return this.format_block(
                        'jstpl_log_city',
                        {
                            'city': args[key],
                        });
                case 'piece':
                case 'original_piece':
                    return this.format_block(
                        'jstpl_log_piece',
                        {
                            'piece': args[key] + '_' + args['player_number']
                        });
                default:
                    break;
            }
            return 'NOT SURE WHAT HAPPENED';
        },

        notif_extraTurnUsed: async function ( args ) {
            console.log( 'notif_extraTurnUsed', args );
            const z = this.indexOfZcard(args.card);
            if (z < 0) {
                console.error("Couldn't find ${args.card} zcard");
            } else {
                this.zcards[z].used = args.used;
                const carddiv = $( this.ownedZcardId(z) );
                if ( carddiv == undefined ) {
                    console.error(`Could not find div for owned ${args.card} card`,
                                  z,
                                  this.zcards[z] );
                } else {
                    carddiv.className = this.zcardClass(null, true);
                }
            }
            return Promise.resolve();
        },

        notif_zigguratCardSelection: async function( args ) {
            console.log( 'notif_zigguratCardSelection', args );
            const z = this.indexOfZcard(args.card);
            if (z < 0) {
                console.error("Couldn't find ${args.card} zcard");
                return Promise.resolve();
            } else {
                this.zcards[z].owning_player_id = args.player_id;
                this.zcards[z].used = args.cardused;
                this.scoreCtrl[args.player_id].toValue(args.score);

                const id = this.availableZcardId(z);

                // mark the available zig card spot as 'taken'
                $( id ).className = "";
                this.removeTooltip(id);

                anim = this.slideDiv(
                    this.zcardClass(this.zcards[z].type, false),
                    id,
                    this.playerBoardZcardsId(z),
                    () => this.addZcardDivInPlayerBoard(z),
                    IDS.AVAILABLE_ZCARDS
                );
                await this.bgaPlayDojoAnimation(anim);
            }
        },

        fadeOut: function(hexes) {
            a = [];
            for (i = 0; i < hexes.length; ++i) {
                let hex = hexes[i];
                a.push(fx.fadeOut({ node: this.hexDiv(hex.row, hex.col) }));
            }
            return dojo.fx.combine(a);
        },
        fadeIn: function(hexes) {
            a = [];
            for (i = 0; i < hexes.length; ++i) {
                let hex = hexes[i];
                a.push(fx.fadeIn({ node: this.hexDiv(hex.row, hex.col) }));
            }
            return dojo.fx.combine(a);
        },

        notif_cityScored: async function( args ) {
            console.log( 'notif_cityScored', args );

            anim = [];

            for( let player_id in args.details ) {
                let details = args.details[player_id];

                anim.push(this.fadeOut(details.network_hexes));

                dojo.connect(anim[anim.length-1],
                             'onBegin',
                             () => {
                                 for (let i = 0; i < details.scored_hexes.length; ++i) {
                                     this.hexDiv(details.scored_hexes[i].row,
                                                 details.scored_hexes[i].col).classList.add(CSS.SELECTED);
                                 }
                             });

                anim.push(this.fadeIn(details.network_hexes));
                anim.push(this.fadeOut(details.network_hexes));
                anim.push(this.fadeIn(details.network_hexes));

                let eq = function(h1, h2) {
                    return h1.row == h2.row && h1.col == h2.col;
                }

                var nonscoring = [];
                var scoring = [];
                for (let i = 0; i < details.network_hexes.length; ++i) {
                    var found = false;
                    for (let j = 0; j < details.scored_hexes.length; ++j) {
                        if (eq(details.scored_hexes[j], details.network_hexes[i])) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        nonscoring.push(details.network_hexes[i]);
                    }
                }

                anim.push(this.fadeOut(nonscoring));

                // this achieves a "pause".
                // TODO: find a better way.
                anim.push(fx.fadeIn({
                    node: 'bbl_vars',
                    duration: 700,
                }));

                // TODO: add an animation stage showing the player score, and
                //   updating that player score

                anim.push(this.fadeIn(nonscoring));

                dojo.connect(anim[anim.length-1],
                             'onEnd',
                             () => {
                                 for (let i = 0; i < details.scored_hexes.length; ++i) {
                                     this.hexDiv(details.scored_hexes[i].row, details.scored_hexes[i].col).classList.remove(CSS.SELECTED);
                                 }
                                 this.scoreCtrl[player_id].toValue(details.score);
                                 this.updateCapturedCityCount(details);
                             });
            }

            const hexDivId = this.hexDivId(args.row, args.col);
            a = ( args.captured_by != 0 ) ?
                this.slideDiv(
                    this.pieceClass(args.city),
                    hexDivId,
                    this.citycount_id(args.captured_by),
                    () => this.renderPlayedPiece( args.row, args.col, '', null )
                )
                :
                this.slideDiv(
                    this.pieceClass(args.city),
                    hexDivId,
                    // TODO: find a location for 'off the board'
                    IDS.AVAILABLE_ZCARDS,
                    () => this.renderPlayedPiece( args.row, args.col, '', null )
                );

            anim.push(a);
            await this.bgaPlayDojoAnimation(dojo.fx.chain(anim));
        },

        notif_turnFinished: async function( args ) {
            console.log( 'notif_turnFinished', args );

            this.updateHandCount( args );
            this.updatePoolCount( args );

            return Promise.resolve();
        },

        notif_undoMove: async function( args ) {
            console.log( 'notif_undoMove', args );

            const isActive = this.playerNumber == args.player_number;
            var targetDivId = this.handcount_id(args.player_id);
            var handPosDiv = null;
            if (isActive) {
                this.hand[args.handpos] = args.original_piece;
                handPosDiv = this.handPosDiv(args.handpos);
                targetDivId = handPosDiv.id;
            }

            // Put any piece (field) captured in the move back on the board
            // TODO: animate this? (and animate the capture too?)
            this.renderPlayedPiece( args.row,
                                    args.col,
                                    args.captured_piece,
                                    null );
            anim = this.slideDiv(
                this.handPieceClass(args.piece, args.player_number),
                this.hexDivId(args.row, args.col),
                targetDivId,
                () => {
                    if (isActive) {
                        cl = handPosDiv.classList;
                        cl.remove(CSS.EMPTY);
                        cl.add(CSS.PLAYABLE);
                        cl.add(this.handPieceClass(args.original_piece));
                    }
                    this.hand_counters[args.player_id].incValue(1);
                    this.scoreCtrl[args.player_id].incValue(-args.points);
                });
            await this.bgaPlayDojoAnimation(anim);
        },

        notif_piecePlayed: async function( args ) {
            console.log( 'notif_piecePlayed', args );
            const isActive = this.playerNumber == args.player_number;
            var sourceDivId = this.handcount_id(args.player_id);
            let hpc = this.handPieceClass(args.piece,
                                          args.player_number);
            if (isActive) {
                this.hand[args.handpos] = null;
                const handPosDiv = this.handPosDiv(args.handpos);
                sourceDivId = handPosDiv.id;
                // Active player hand piece 'removed' from hand.
                let cl = handPosDiv.classList;
                cl.remove(hpc);
                cl.add(CSS.EMPTY);
            }
            anim = this.slideDiv(
                hpc,
                sourceDivId,
                this.hexDiv(args.row, args.col).id,
                () => {
                    this.renderPlayedPiece( args.row,
                                            args.col,
                                            args.piece,
                                            args.player_number );
                    this.updateHandCount( args );
                    this.scoreCtrl[args.player_id].toValue(args.score);
                }
            );

            await this.bgaPlayDojoAnimation(anim);
        },

        notif_handRefilled: async function( args ) {
            console.log( 'notif_handRefilled', args );
            anim = [];
            let pid = this.player_id;
            for (i = 0; i < args.hand.length; i++) {
                if (this.hand[i] == null) {
                    this.hand[i] = args.hand[i];
                }
                const div = this.handPosDiv(i);
                let hc = this.handPieceClass(this.hand[i]);
                if (hc != CSS.EMPTY
                    && div.classList.contains(CSS.EMPTY)) {
                    const a = this.slideDiv(
                        hc,
                        this.handcount_id(pid),
                        div.id,
                        () => { div.className = hc; }
                    );
                    anim.push(a);
                }
            }
            if (anim.length == 0) {
                return Promise.resolve();
            }
            await this.bgaPlayDojoAnimation(dojo.fx.chain(anim));
        },
    });
});
