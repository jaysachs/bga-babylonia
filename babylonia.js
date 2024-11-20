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

const ID_AVAILABLE_ZCARDS = 'bbl_available_zcards';
const ID_BOARD = 'bbl_board';
const ID_HAND = 'bbl_hand';

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
           <div id="${ID_HAND}"></div>
         </div>
         <div id="bbl_board_container">
           <span id="bbl_vars"></span>
           <div id="${ID_BOARD}"></div>
         </div>
         <div id="${ID_AVAILABLE_ZCARDS}">
        </div>
      </div>
`);


var thegame = null;
define([
    'dojo','dojo/_base/declare',
    g_gamethemeurl + "modules/js/hexloc.js",
    'ebg/core/gamegui',
    'ebg/counter',
],
function (dojo, declare, hexloc) {
    return declare('bgagame.babylonia', ebg.core.gamegui, {
        constructor: function(){
            console.log('babylonia constructor');

            // Here, you can init the global variables of your user interface
            // Example:
            // this.myGlobalValue = 0;

            dojo.connect( $(ID_HAND), 'onclick', this, 'onPieceSelection' );
            dojo.connect( $(ID_BOARD), 'onclick', this, 'onHexSelection' );
            dojo.connect( $(ID_AVAILABLE_ZCARDS), 'onclick', this, 'onZcardSelected');
        },

        CSS_SELECTED: 'bbl_selected',
        CSS_PLAYABLE: 'bbl_playable',
        CSS_UNPLAYABLE: 'bbl_unplayable',
        CSS_EMPTY: 'bbl_empty',

        selectedHandPos: null,
        pieceClasses: [ 'priest', 'servant', 'farmer', 'merchant' ],
        card_tooltips: {},
        stateName: '',
        stateArgs: [],
        playerNumber: -1,
        thegamedatas: null,
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
            this.thegamedatas = gamedatas;
            this.playerNumber = gamedatas.players[this.player_id].player_number;

            console.log('Setting up player boards');
            for( var player_id in gamedatas.players ) {
                this.setupPlayerBoard( gamedatas.players[player_id] );
            }

            this.setupBoard(gamedatas.board, gamedatas.players);

            console.log("Setting up player hand");
            this.renderHand(gamedatas.hand);

            this.setupAvailableZcards(gamedatas.ziggurat_cards);

            console.log( 'setting up notifications' );
            this.setupNotifications();

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
            let boardDiv = $( ID_BOARD );
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

        setupAvailableZcards: function(zcards) {
            console.log('Setting up available ziggurat cards', zcards);
            // Set up the ziggurat tiles
            for( let z = 0; z < zcards.length; z++) {
                let card = zcards[z];
                this.card_tooltips[card.type] = card.tooltip;
                this.addZigguratCardDiv(`bbl_zig${z}`,
                                        ID_AVAILABLE_ZCARDS,
                                        card.type,
                                        card.used);
                if ( card.owning_player_id != 0 ) {
                    this.setZigguratCardOwned(card.owning_player_id,
                                              card.type,
                                              card.used);
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
            while (e.parentElement != null && e.parentElement.id != ID_BOARD) {
                e = e.parentElement;
            }
            if (e.parentElement == null) {
                console.warn('no hex');
                return null;
            }
            // now check if it's allowed
            let ae = e;
            if (!ae.classList.contains(this.CSS_PLAYABLE)) {
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
                this.markHexUnplayable(rc);
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
                this.markHexUnplayable({
                    row: hex.row,
                    col: hex.col
                });
            });
            this.unselectAllHandPieces();
        },

        markAllHexesUnplayable: function() {
            $(ID_BOARD).querySelectorAll('.' + this.CSS_PLAYABLE)
                .forEach(div => div.classList.remove(this.CSS_PLAYABLE));
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

        allowedMovesFor: function(cl) {
            let p = this.pieceForHandDivClassList(cl);
            if (p == null) {
                console.error('no playable piece found');
                return [];
            }
            let m = this.stateArgs.allowedMoves[p];
            if (m == null) {
                m = [];
            }
            return m;
        },

        markHexPlayable: function (rc) {
            this.hexDiv(rc.row, rc.col)
                .classList.add(this.CSS_PLAYABLE);
        },

        markHexUnplayable: function (rc2) {
            this.hexDiv(rc2.row, rc2.col)
                .classList.remove(this.CSS_PLAYABLE);
        },

        markScoreableHexesPlayable: function(hexes) {
            hexes.forEach(rc => this.markHexPlayable(rc));
        },

        markHexesPlayableForPiece: function(cl) {
            this.allowedMovesFor(cl).forEach(rc => this.markHexPlayable(rc));
        },

        markHexesUnplayableForPiece: function(cl) {
            this.allowedMovesFor(cl).forEach(rc => this.markHexUnplayable(rc));
        },

        onZcardSelected: function (event) {
            console.log(event);
            event.preventDefault();
            event.stopPropagation();
            if(! this.isCurrentPlayerActive() ) {
                 return false;
            }
            if (this.stateName != 'selectZigguratCard') {
                return false;
            }
            let e = event.target;
            let zdiv = e.parentElement;
            if (zdiv.id != ID_AVAILABLE_ZCARDS) {
                return false;
            }
            let cl = e.classList;
            for (var i = 0; i < cl.length; ++i) {
                let c = cl[i];
                if (c.startsWith('bbl_zc_')) {
                    type = c.slice(4); // better way to do this?
                    this.bgaPerformAction('actSelectZigguratCard',
                                          { card_type: type });
                    let div = $( ID_AVAILABLE_ZCARDS );
                    div.classList.remove('bbl_selecting');
                    return false;
                }
            }
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
                && this.stateName != 'client_mustSelectPiece') {
                return false;
            }
            let selectedDiv = event.target;
            if (selectedDiv.parentElement.id != ID_HAND) {
                return false;
            }
            var playable = false;
            let c = selectedDiv.classList;
            if (this.allowedMovesFor(c).length > 0) {
                if (!c.contains(this.CSS_SELECTED)) {
                    this.unselectAllHandPieces();
                    this.markHexesPlayableForPiece(c);
                    playable = true;
                } else {
                    this.markHexesUnplayableForPiece(c);
                }
                c.toggle(this.CSS_SELECTED);
            }
            if (playable) {
                this.selectedHandPos = selectedDiv.id.split('_')[2];
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
            } else {
                this.setStatusBarForPlayState();
            }
            return false;
        },

        unselectAllHandPieces: function() {
            handDiv = $(ID_HAND);
            for (const div of handDiv.children) {
                cl = div.classList;
                if (cl.contains(this.CSS_SELECTED)) {
                    this.markHexesUnplayableForPiece(cl);
                }
                cl.remove(this.CSS_SELECTED);
                cl.remove(this.CSS_PLAYABLE);
                cl.remove(this.CSS_UNPLAYABLE);
            }
            this.selectedHandPos = null;
        },

        setPlayablePieces: function() {
            handDiv = $(ID_HAND);
            for (const div of handDiv.children) {
                cl = div.classList;
                if (! cl.contains(this.CSS_EMPTY)) {
                    if (this.allowedMovesFor(cl).length > 0) {
                        cl.add(this.CSS_PLAYABLE);
                        cl.remove(this.CSS_UNPLAYABLE);
                    } else {
                        cl.remove(this.CSS_PLAYABLE);
                        cl.add(this.CSS_UNPLAYABLE);
                    }
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
                        let div = $( ID_AVAILABLE_ZCARDS );
                        div.scrollIntoView( false );
                        div.classList.add('bbl_selecting');
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
            const hand = $(ID_HAND);
            for (j = 0; j <= i; ++j) {
                let id = `bbl_hand_${j}`;
                let d = $(id);
                if (d == null) {
                    dojo.create('div',
                                {
                                    id: id,
                                    className: this.CSS_EMPTY,
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

        cardClass: function(card, used = false) {
            return used ? 'bbl_zc_used' : ('bbl_' + card);
        },

        renderPlayedPiece: function (row, col, piece, playerNumber) {
            this.hexDiv(row, col).className =
                this.pieceClass(piece, playerNumber);
        },

        handPieceClass: function(piece, playerNumber = null) {
            if (piece == null || piece == "empty") {
                return this.CSS_EMPTY;
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

        renderHand: function(hand) {
            for (i = 0; i < hand.length; ++i) {
                this.handPosDiv(i).className = this.handPieceClass(hand[i]);
            }
        },

        addZigguratCardDiv: function(id, parentElem, card, used = false) {
            const cls = this.cardClass(card, used);
            const div = dojo.place( `<div id='${id}' class='${cls}'</div>`,
                                    parentElem );
            this.addTooltip( id, this.card_tooltips[card], '' );
            // div.title = this.card_tooltips[card];
        },

        setZigguratCardOwned: function (player_id, card, used) {
            // add a div under div id bbl_zcards_{player_id}
            // with the card as class.
            // TODO: only if there isn't one already
            const newid = `bbl_ozig_${card}`;
            this.addZigguratCardDiv( newid, `bbl_zcards_${player_id}`, card, used );

            c = this.cardClass(card);
            // now mark the available zig card spot as 'no class'
            var s = dojo.query( `#bbl_available_zcards .${c}` );
            if (s.length == 0) {
                console.error('Could not find available card ' + card);
                return;
            }
            if (s.length > 1) {
                console.warn('More than one of the same available zig card?');
            }
            s[0].classList.remove(this.cardClass(card));
            this.removeTooltip(s[0].id);
        },

        lastId: 0,
        slideDiv: function(className,
                           from,
                           to,
                           onEnd = null,
                           parent = ID_BOARD) {
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

        setupNotifications: function() {
            console.log( 'notifications subscriptions setup' );
            this.bgaSetupPromiseNotifications();
        },

        notif_extraTurnUsed: async function ( args ) {
            console.log( 'notif_extraTurnUsed', args );
            const carddiv = $( 'ozig_zc_xturn' );
            if ( carddiv == undefined ) {
                console.error( 'Could not find owned extra turn card.' );
            } else {
                carddiv.className = this.cardClass(null, true);
            }
            return Promise.resolve();
        },

        notif_zigguratCardSelection: async function( args ) {
            console.log( 'notif_zigguratCardSelection', args );
            this.setZigguratCardOwned(args.player_id,
                                      args.zcard,
                                      // 10pts card used on acquisition
                                      args.zcard == 'zc_10pts');
            this.scoreCtrl[args.player_id].toValue(args.score);
            return Promise.resolve();
        },

        notif_cityScored: async function( args ) {
            console.log( 'notif_cityScored', args );
            this.renderPlayedPiece( args.row, args.col, '', null );
            const hexDivId = this.hexDivId(args.row, args.col);

            anim = ( args.captured_by != 0 ) ?
                this.slideDiv(
                    this.pieceClass(args.city),
                    hexDivId,
                    this.citycount_id(args.captured_by)
                )
                :
                this.slideDiv(
                    this.pieceClass(args.city),
                    hexDivId,
                    // TODO: find a location for 'off the board'
                    ID_AVAILABLE_ZCARDS
                );
            await this.bgaPlayDojoAnimation(anim);
        },

        notif_turnFinished: async function( args ) {
            console.log( 'notif_turnFinished', args );

            this.updateHandCount( args );
            this.updatePoolCount( args );

            return Promise.resolve();
        },

        notif_cityScoredPlayer: async function( args ) {
            console.log( 'notif_cityScoredPlayer', args );

            // TODO: animate hexes contributing to scoring

            this.scoreCtrl[args.player_id].toValue(args.score);
            this.updateCapturedCityCount(args);

            return Promise.resolve();
        },

        notif_undoMove: async function( args ) {
            console.log( 'notif_undoMove', args );

            const isActive = this.playerNumber == args.player_number;
            var targetDivId = this.handcount_id(args.player_id);
            var handPosDiv = null;
            if (isActive) {
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
                        cl.remove(this.CSS_EMPTY);
                        cl.add(this.CSS_PLAYABLE);
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
                const handPosDiv = this.handPosDiv(args.handpos);
                sourceDivId = handPosDiv.id;
                // Active player hand piece 'removed' from hand.
                let cl = handPosDiv.classList;
                cl.remove(hpc);
                cl.add(this.CSS_EMPTY);
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
                const div = this.handPosDiv(i);
                let hc = this.handPieceClass(args.hand[i]);
                if (hc != this.CSS_EMPTY
                    && div.classList.contains(this.CSS_EMPTY)) {
                    const a = this.slideDiv(
                        hc,
                        this.handcount_id(pid),
                        div.id,
                        () => { console.log("set ", hc); div.className = hc; }
                        // ,
                        // ID_HAND
                    );
                    anim.push(a);
                }
            }
            // return Promise.resolve();
            await this.bgaPlayDojoAnimation(dojo.fx.chain(anim));
        },
    });
});
