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
    "dojo","dojo/_base/declare",
    "ebg/core/gamegui",
    "ebg/counter"
],
function (dojo, declare) {
    return declare("bgagame.babylonia", ebg.core.gamegui, {
        constructor: function(){
            console.log('babylonia constructor');

            // Here, you can init the global variables of your user interface
            // Example:
            // this.myGlobalValue = 0;

            dojo.connect( $('hand'), 'onclick', this, 'onPieceSelection' );
            dojo.connect( $('board'), 'onclick', this, 'onHexSelection' );
            dojo.connect( $('available_zcards'), 'onclick', this, 'onZcardSelected');
        },

        playerNumber: -1,
        thegamedatas: null,
        hand_counters: [],
        pool_counters: [],
        city_counters: [],

        setupPlayerBoard: function( player ) {
            let player_id = player.player_id;
            console.log("Setting up board for player " + player_id);
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

        handcount_id: function(player_id) {
            return 'handcount_' + player_id;
        },
        poolcount_id: function(player_id) {
            return 'poolcount_' + player_id;
        },
        citycount_id: function(player_id) {
            return 'citycount_' + player_id;
        },


        /*
            setup:

            This method must set up the game user interface according
            to current game situation specified in parameters.

            The method is called each time the game interface is
            displayed to a player, ie:
            _ when the game starts
            _ when a player refreshes the game page (F5)

            "gamedatas" argument contains all datas retrieved by your
            "getAllDatas" PHP method.
        */
        setup: function( gamedatas ) {
            console.log( "Starting game setup" );
            thegame = this;
            this.thegamedatas = gamedatas;
            // Setting up player boards
            console.log("Setting up player boards");
            for( var player_id in gamedatas.players ) {
                this.setupPlayerBoard( gamedatas.players[player_id] );
            }

            this.playerNumber = gamedatas.players[this.player_id].player_number;

            console.log("Setting the the game board");
            let board = $('board');
            // console.log( gamedatas.board );

            for( let h = 0; h < gamedatas.board.length; ++h) {
                let hex = gamedatas.board[h];

                dojo.place( this.format_block('jstpl_hex',
                                              {
                                                  'row': hex.row,
                                                  'col': hex.col,
                                                  // or ... row / 2 * 63 + 6;
                                                  'top': hex.row * 31.75 + 6,
                                                  'left': 38 + (hex.col * 55)
                                              } ),
                            board );

                let p = hex.piece;
                if (p != null) {
                    let n = (hex.board_player == 0)
                        ? null
                        : gamedatas.players[hex.board_player].player_number;
                    this.renderPlayedPiece(hex.row, hex.col, p, n);
                }
            }

            // Set up the player's hand
            this.renderHand(gamedatas.hand);

            console.log("Setting up available ziggurat cards");
            // Set up the ziggurat tiles
            for( let z = 0; z < gamedatas.ziggurat_cards.length; z++) {
                card = gamedatas.ziggurat_cards[z];
                this.card_tooltips[card.type] = card.tooltip;
                this.addZigguratCardDiv( `zig${z}`, 'available_zcards', card.type, card.used);
                if ( card.owning_player_id != 0 ) {
                    this.setZigguratCardOwned(card.owning_player_id, card.type, card.used);
                }
            }

            console.log( "setting up notifications" );
            this.setupNotifications();

            console.log( "Ending game setup" );
        },

        card_tooltips: {},

        onHexSelection:   function (event) {
            console.log("onHexSelection:" + event.target.id);
            event.preventDefault();
            event.stopPropagation();
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
            while (e.parentElement != null && e.parentElement.id != "board") {
                e = e.parentElement;
            }
            if (e.parentElement == null) {
                console.log("didn't click on a hex");
                return null;
            }
            // now check if it's allowed
            let ae = e.firstElementChild.firstElementChild;
            if (!ae.classList.contains('playable')) {
                console.log('not playable');
                return null;
            }
            let id = e.id.split("_");
            return {
                row: id[1],
                col: id[2],
            };
        },

        selectHexToScore: function(event) {
            let hex = this.selectedHex(event.target);
            if (hex == null) {
                return;
            }
            console.log("selected hex " + hex.row + "," + hex.col);
            let rc = {
                row: hex.row,
                col: hex.col
            };
            this.bgaPerformAction("actSelectHexToScore", rc ).then(() =>  {
                this.markHexUnplayable(rc);
            });
        },

        playSelectedPiece: function(event) {
            if (this.selectedHandPos == null) {
                console.log("no piece selected!");
            }

            let hex = this.selectedHex(event.target);
            if (hex == null) {
                return;
            }
            console.log("selected hex " + hex.row + "," + hex.col);

            this.bgaPerformAction("actPlayPiece", {
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

        allowedMoves: [],

        pieceClasses: [ "priest", "servant", "farmer", "merchant" ],

        markAllHexesUnplayable: function() {
            $("board").querySelectorAll('.playable')
                .forEach(div => div.className = '');
        },

        pieceForHandDivClassList: function(cl) {
            // console.log("pieceFor: " + cl);
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
                console.log("no playable piece found");
                return [];
            }
            // console.log("hexes playable for " + p + "=" + this.allowedMoves[p]);
            let m = this.stateArgs.allowedMoves[p];
            if (m == null) {
                m = [];
            }
            return m;
        },

        markHexPlayable: function (rc) {
            this.hexDiv(rc.row, rc.col).firstElementChild.firstElementChild
                .classList.add('playable');
        },

        markHexUnplayable: function (rc2) {
            this.hexDiv(rc2.row, rc2.col).firstElementChild.firstElementChild
                .classList.remove('playable');
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
            if (zdiv.id != "available_zcards") {
                return false;
            }
            let cl = e.classList;
            for (var i = 0; i < cl.length; ++i) {
                let c = cl[i];
                if (c.startsWith('zc_')) {
                    this.bgaPerformAction('actSelectZigguratCard',
                                          { card_type: c });
                    let div = $( 'available_zcards' );
                    div.classList.remove('selecting');
                    return false;
                }
            }
            return false;
        },

        selectedHandPos: null,

        onPieceSelection: function(event) {
            console.log("onPieceSelection");
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
            if (selectedDiv.parentElement.id != "hand") {
                return false;
            }
            var playable = false;
            let c = selectedDiv.classList;
            if (this.allowedMovesFor(c).length > 0) {
                if (!c.contains("selected")) {
                    this.unselectAllHandPieces();
                    this.markHexesPlayableForPiece(c);
                    playable = true;
                } else {
                    this.markHexesUnplayableForPiece(c);
                }
                c.toggle("selected");
            }
            if (playable) {
                this.selectedHandPos = selectedDiv.id.split("_")[1];
                this.setClientState("client_pickHexToPlay", {
                    descriptionmyturn : _("${you} must select a hex to play to"),
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
            handDiv = $( 'hand' );
            for (const div of handDiv.children) {
                cl = div.classList;
                if (cl.contains('selected')) {
                    this.markHexesUnplayableForPiece(cl);
                }
                cl.remove('selected');
                cl.remove('playable');
                cl.remove('unplayable');
            }
            this.selectedHandPos = null;
        },

        setPlayablePieces: function() {
            handDiv = $( 'hand' );
            for (const div of handDiv.children) {
                cl = div.classList;
                if (! cl.contains('unavailable')) {
                    if (this.allowedMovesFor(cl).length > 0) {
                        cl.add('playable');
                        cl.remove('unplayable');
                    } else {
                        cl.remove('playable');
                        cl.add('unplayable');
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
                    this.setClientState("client_noPlaysLeft", {
                        descriptionmyturn : _("${you} must end your turn"),
                    });
                } else {
                    this.setClientState("client_selectPieceOrEndTurn", {
                        descriptionmyturn : _("${you} may select a piece to play or end your turn"),
                    });
                    this.setPlayablePieces();
                }
                this.addActionButton(
                    'end-btn',
                    'End turn',
                    () => {
                        this.unselectAllHandPieces();
                        this.bgaPerformAction("actDonePlayPieces");
                    });
            } else {
                this.setClientState("client_mustSelectPiece", {
                    descriptionmyturn : _("${you} must select a piece to play"),
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

        stateName: "",
        stateArgs: [],

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
            this.stateName = "";
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
	    if (typeof bcolor == "undefined") {
		bcolor = "gray";
	    }
	    // this will actually make a transparent button id color = gray
	    this.addActionButton(id, div, handler, null, false, bcolor);
	    // remove border, for images it better without
	    dojo.style(id, "border", "none");
	    // but add shadow style (box-shadow, see css)
	    dojo.addClass(id, "shadow bgaimagebutton");
	    // you can also add additional styles, such as background
	    if (tooltip) {
		dojo.attr(id, "title", tooltip);
	    }
	    return $(id);
        },

        // onUpdateActionButtons: in this method you can manage
        //                        "action buttons" that are displayed
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
                        let div = $( 'available_zcards' );
                        div.scrollIntoView( false );
                        div.classList.add('selecting');
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

        hexDiv: function (row, col) {
            return $(`hex_${row}_${col}`);
        },

        handPosDiv: function (i) {
            let id = `hand_${i}`;
            let div = $(id);
            if (div != null) {
                return div;
            }
            // dynamically extend hand as needed.
            const hand = $(`hand`);
            for (j = 0; j <= i; ++j) {
                let d = $(`hand_${j}`);
                if (d == null) {
                    hand.insertAdjacentHTML(
                        'beforeend',
                        `<div id="hand_${j}"></div>`
                    );
                }
            }
            return $(id);
        },

        handPieceClass: function(piece, playerNumber = 0) {
            if (piece == null || piece == "empty") {
                return "unavailable";
            }
            return piece + "_" + (playerNumber == 0 ? this.playerNumber : playerNumber);
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

        renderPlayedPiece: function (row, col, piece, playerNumber) {
            let hex = this.hexDiv(row, col);
            if (playerNumber == null) {
                hex.firstElementChild.className = piece;
            } else {
                hex.firstElementChild.className = piece + "_" + playerNumber;
            }
        },

        /*

            Here, you can defines some utility methods that you can use everywhere in your javascript
            script.

        */

        ///////////////////////////////////////////////////
        //// Player's action

        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications

        /*
            setupNotifications:

            In this method, you associate each of your game
            notifications with your local method to handle it.

            Note: game notification names correspond to
            "notifyAllPlayers" and "notifyPlayer" calls in your
            babylonia.game.php file.

        */
        setupNotifications: function() {
            console.log( 'notifications subscriptions setup' );

            // Can add "wait time" in ms via
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

        addZigguratCardDiv: function(id, parentElem, card, used = false) {
            const cls = used ? 'zc_used' : card;
            const div = dojo.place( `<div id="${id}" class="${cls}"</div>`,
                                    parentElem );
            this.addTooltip( id, this.card_tooltips[card], '' );
            // div.title = this.card_tooltips[card];
        },

        setZigguratCardOwned: function (player_id, card, used) {
            // add a div under div id b_zcards_{player_id}
            // with the card as class.
            // TODO: only if there isn't one already
            const newid = `ozig_${card}`;
            this.addZigguratCardDiv( newid, `b_zcards_${player_id}`, card, used );

            // now mark the available zig card spot as "no class"
            var s = dojo.query( `#available_zcards .${card}` );
            if (s.length == 0) {
                console.log("Couldn't find available card " + card);
                return;
            }
            if (s.length > 1) {
                console.log("More than one of the same available zig card?");
            }
            s[0].classList.remove(card);
            this.removeTooltip(s[0].id);
        },

        notif_extraTurnUsed: function ( notif ) {
            console.log( 'notif_extraTurnUsed', notif );
            const carddiv = $( 'ozig_zc_xturn' );
            if ( carddiv == undefined ) {
                console.log( "Couldn't find owned extra turn card." );
            } else {
                carddiv.className = 'zc_used';
            }
        },

        notif_zigguratCardSelection: function( notif ) {
            console.log( 'notif_zigguratCardSelection', notif );
            // TODO: also hand marking cards as "used"?
            this.setZigguratCardOwned(notif.args.player_id,
                                      notif.args.zcard,
                                      // 10pts card used on acquisition
                                      notif.args.zcard == 'zc_10pts');
            this.scoreCtrl[notif.args.player_id].toValue(notif.args.score);
        },

        notif_cityScored: function( notif ) {
            console.log( 'notif_cityScored', notif );
            this.renderPlayedPiece( notif.args.row, notif.args.col, 'empty', null );
            const hexDiv = this.hexDiv(notif.args.row, notif.args.col);

            if ( notif.args.captured_by != 0 ) {
                this.slideTemporaryObject(
                    '<div class="city_blank"></div>',
                    'board',
                    hexDiv.id,
                    this.citycount_id(notif.args.captured_by),
                    500
                );
            } else {
                this.slideTemporaryObject(
                    '<div class="city_blank"></div>',
                    'board',
                    hexDiv.id,
                    // TODO: find a location for "off the board"
                    'available_zcards',
                    500
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
//                console.error(log,args,"Exception thrown", e.stack);
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
                            'piece': args[key] + "_" + args['player_number']
                        });
                default:
                    break;
            }
            return "NOT SURE WHAT HAPPENED";
        },

        notif_undoMove: function( notif ) {
            console.log( 'notif_undoMove', notif );
            // TODO: factor out the commonality there and with notif_piecePlayed
            const isActive = this.playerNumber == notif.args.player_number;
            const hexDiv = this.hexDiv(notif.args.row, notif.args.col);
            const hc = this.handPieceClass(notif.args.piece, notif.args.player_number);
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
            const a = this.slideTemporaryObject(
                `<div class="${hc}"></div>`,
                'board',
                hexDiv.id,
                targetDivId,
                500
            );
            dojo.connect(a, 'onEnd', () => {
                if (isActive) {
                    cl = handPosDiv.classList;
                    cl.remove('unavailable');
                    cl.add('playable');
                    cl.add(this.handPieceClass(notif.args.original_piece));
                }

                this.hand_counters[notif.args.player_id].incValue(1);
                this.scoreCtrl[notif.args.player_id].incValue(-notif.args.points);
            });
        },

        notif_piecePlayed: function( notif ) {
            console.log( 'notif_piecePlayed', notif );
            const isActive = this.playerNumber == notif.args.player_number;
            const hexDiv = this.hexDiv(notif.args.row, notif.args.col);
            const hc = this.handPieceClass(notif.args.piece, notif.args.player_number);
            var sourceDivId = this.handcount_id(notif.args.player_id);
            if (isActive) {
                const handPosDiv = this.handPosDiv(notif.args.handpos);
                sourceDivId = handPosDiv.id;
                // Active player hand piece "removed" from hand.
                handPosDiv.className = this.handPieceClass("empty");
            }
            const a = this.slideTemporaryObject(
                `<div class="${hc}"></div>`,
                'board',
                sourceDivId,
                hexDiv.id,
                500
            );
            dojo.connect(a, 'onEnd', () => {
                this.renderPlayedPiece( notif.args.row,
                                        notif.args.col,
                                        notif.args.piece,
                                        notif.args.player_number );
                this.updateHandCount( notif.args );
                this.scoreCtrl[notif.args.player_id].toValue(notif.args.score);
            });
        },

        slideDiv: function(className, from, to, parent = 'board', delay = 0, time = 500) {
            return this.slideTemporaryObject(
                `<div class="${className}"></div>`,
                parent,
                from,
                to,
                time,
                delay
            );
        },

        notif_handRefilled: function( notif ) {
            console.log( 'notif_handRefilled', notif );
            var delay = 0;
            for (i = 0; i < notif.args.hand.length; i++) {
                const div = this.handPosDiv(i);
                if (notif.args.hand[i] != "empty"
                    && div.className == "unavailable") {
                    const hc = this.handPieceClass(notif.args.hand[i]);
                    const a = this.slideTemporaryObject(
                        `<div class="${hc}"></div>`,
                        'hand',
                        this.handcount_id(this.player_id),
                        div.id,
                        500,
                        delay
                    );
                    dojo.connect(a, 'onEnd', () => {
                        div.className = hc;
                    });

                    delay += 500;
                }
            }
        },
    });
});
