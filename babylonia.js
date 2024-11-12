/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © Jay Sachs <jay@covariant.org>
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

            dojo.connect( $(this.ID_HAND), 'onclick', this, 'onPieceSelection' );
            dojo.connect( $(this.ID_BOARD), 'onclick', this, 'onHexSelection' );
            dojo.connect( $(this.ID_AVAILABLE_ZCARDS), 'onclick', this, 'onZcardSelected');
        },

        CSS_SELECTED: 'bbl_selected',
        CSS_PLAYABLE: 'bbl_playable',
        CSS_UNPLAYABLE: 'bbl_unplayable',
        CSS_EMPTY: 'bbl_empty',
        ID_AVAILABLE_ZCARDS: 'bbl_available_zcards',
        ID_BOARD: 'bbl_board',
        ID_HAND: 'bbl_hand',

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
            console.log(player_board_div);
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
            console.log(hexloc);
            let boardDiv = $( this.ID_BOARD );
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
            console.log('Setting up available ziggurat cards');
            // Set up the ziggurat tiles
            for( let z = 0; z < zcards.length; z++) {
                let card = zcards[z];
                this.card_tooltips[card.type] = card.tooltip;
                this.addZigguratCardDiv(`bbl_zig${z}`,
                                        this.ID_AVAILABLE_ZCARDS,
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
            while (e.parentElement != null && e.parentElement.id != this.ID_BOARD) {
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
            $(this.ID_BOARD).querySelectorAll('.' + this.CSS_PLAYABLE)
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
            if (zdiv.id != this.ID_AVAILABLE_ZCARDS) {
                return false;
            }
            let cl = e.classList;
            for (var i = 0; i < cl.length; ++i) {
                let c = cl[i];
                if (c.startsWith('bbl_zc_')) {
                    type = c.slice(4); // better way to do this?
                    this.bgaPerformAction('actSelectZigguratCard',
                                          { card_type: type });
                    let div = $( this.ID_AVAILABLE_ZCARDS );
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
            if (selectedDiv.parentElement.id != this.ID_HAND) {
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
            handDiv = $(this.ID_HAND);
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
            handDiv = $(this.ID_HAND);
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
                        let div = $( this.ID_AVAILABLE_ZCARDS );
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
            const hand = $(this.ID_HAND);
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

        slideDiv: function(className,
                           from,
                           to,
                           onEnd = null,
                           parent = this.ID_BOARD,
                           delay = 0,
                           time = 500) {
            let a = this.slideTemporaryObject(
                `<div class='${className}'></div>`,
                parent,
                from,
                to,
                time,
                delay
            );
            if (onEnd != null) {
                dojo.connect(a, 'onEnd', onEnd);
            }
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

            // Can add 'wait time' in ms via
            //   this.notifqueue.setSynchronous( 'cardPlayed', 3000 );
            [
                'piecePlayed',
                'handRefilled',
                'cityScored',
                'cityScoredPlayer',
                'turnFinished',
                'zigguratCardSelection',
                'extraTurnUsed',
                'undoMove',
            ].forEach(n => dojo.subscribe(n, this, `notif_${n}`));
        },

        notif_extraTurnUsed: function ( notif ) {
            console.log( 'notif_extraTurnUsed', notif );
            const carddiv = $( 'ozig_zc_xturn' );
            if ( carddiv == undefined ) {
                console.error( 'Could not find owned extra turn card.' );
            } else {
                carddiv.className = this.cardClass(null, true);
            }
        },

        notif_zigguratCardSelection: function( notif ) {
            console.log( 'notif_zigguratCardSelection', notif );
            // TODO: also hand marking cards as 'used'?
            this.setZigguratCardOwned(notif.args.player_id,
                                      notif.args.zcard,
                                      // 10pts card used on acquisition
                                      notif.args.zcard == 'zc_10pts');
            this.scoreCtrl[notif.args.player_id].toValue(notif.args.score);
        },

        notif_cityScored: function( notif ) {
            console.log( 'notif_cityScored', notif );
            this.renderPlayedPiece( notif.args.row, notif.args.col, '', null );
            const hexDivId = this.hexDivId(notif.args.row, notif.args.col);

            if ( notif.args.captured_by != 0 ) {
                this.slideDiv(
                    'bbl_city_blank',
                    hexDivId,
                    this.citycount_id(notif.args.captured_by)
                );
            } else {
                this.slideDiv(
                    'bbl_city_blank',
                    hexDivId,
                    // TODO: find a location for 'off the board'
                    this.ID_AVAILABLE_ZCARDS
                );
            }
        },

        notif_turnFinished: function( notif ) {
            console.log( 'notif_turnFinished', notif );

            this.updateHandCount( notif.args );
            this.updatePoolCount( notif.args );
        },

        notif_cityScoredPlayer: function( notif ) {
            console.log( 'notif_cityScoredPlayer', notif );

            // TODO: animate hexes contributing to scoring

            this.scoreCtrl[notif.args.player_id].toValue(notif.args.score);
            this.updateCapturedCityCount(notif.args);
        },

        notif_undoMove: function( notif ) {
            console.log( 'notif_undoMove', notif );
            const isActive = this.playerNumber == notif.args.player_number;
            var targetDivId = this.handcount_id(notif.args.player_id);
            var handPosDiv = null;
            if (isActive) {
                handPosDiv = this.handPosDiv(notif.args.handpos);
                targetDivId = handPosDiv.id;
            }

            // Put any piece (field) captured in the move back on the board
            this.renderPlayedPiece( notif.args.row,
                                    notif.args.col,
                                    notif.args.captured_piece,
                                    null );
            this.slideDiv(
                this.handPieceClass(notif.args.piece, notif.args.player_number),
                this.hexDivId(notif.args.row, notif.args.col),
                targetDivId,
                () => {
                    if (isActive) {
                        cl = handPosDiv.classList;
                        cl.remove(this.CSS_EMPTY);
                        cl.add(this.CSS_PLAYABLE);
                        cl.add(this.handPieceClass(notif.args.original_piece));
                    }
                    this.hand_counters[notif.args.player_id].incValue(1);
                    this.scoreCtrl[notif.args.player_id].incValue(-notif.args.points);
                });
        },

        notif_piecePlayed: function( notif ) {
            console.log( 'notif_piecePlayed', notif );
            const isActive = this.playerNumber == notif.args.player_number;
            var sourceDivId = this.handcount_id(notif.args.player_id);
            let hpc = this.handPieceClass(notif.args.piece,
                                          notif.args.player_number);
            if (isActive) {
                const handPosDiv = this.handPosDiv(notif.args.handpos);
                sourceDivId = handPosDiv.id;
                // Active player hand piece 'removed' from hand.
                let cl = handPosDiv.classList;
                cl.remove(hpc);
                cl.add(this.CSS_EMPTY);
            }
            this.slideDiv(
                hpc,
                sourceDivId,
                this.hexDiv(notif.args.row, notif.args.col).id,
                () => {
                    this.renderPlayedPiece( notif.args.row,
                                            notif.args.col,
                                            notif.args.piece,
                                            notif.args.player_number );
                    this.updateHandCount( notif.args );
                    this.scoreCtrl[notif.args.player_id].toValue(notif.args.score);
                }
            );
        },

        notif_handRefilled: function( notif ) {
            console.log( 'notif_handRefilled', notif );
            var delay = 0;
            for (i = 0; i < notif.args.hand.length; i++) {
                const div = this.handPosDiv(i);
                let hc = this.handPieceClass(notif.args.hand[i]);
                if (hc != this.CSS_EMPTY
                    && div.classList.contains(this.CSS_EMPTY)) {
                    const a = this.slideDiv(
                        hc,
                        this.handcount_id(this.player_id),
                        div.id,
                        () => { div.className = hc; },
                        this.ID_HAND,
                        delay
                    );
                    delay += 500;
                }
            }
        },
    });
});
