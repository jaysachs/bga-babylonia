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

var thegamedatas = null;

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
        },

        playerNumber: -1,

        jstpl_player_board: function( player_id, player ) {
            return `<div class="b_playerboard_ext">
            <div class="b_handpoolcity">
              <div class="b_hand">hand:<span id="handcount_${player_id}">0</span></div>
              <div class="b_pool">pool:<span id="poolcount_${player_id}">0</span></div>
              <div class="b_citycount">cities:<span id="citycount_${player_id}">0</span></div>
            </div>
            <div id="b_ziggurats_${player_id}" class="b_ziggurats">
            <!-- <div></div> -->
            </div>
          </div>`
        },
        hand_counters: [],
        pool_counters: [],
        city_counters: [],

        jstpl_hex: function( hex ) {
            var row = hex.row;
            var col = hex.col;
            let top = row * 31.75 + 6; // row / 2 * 63 + 6;
            let left = 38 + (col * 55);
            board.insertAdjacentHTML(
                'beforeend',
                `<div id="hex_${row}_${col}" style="top:${top}px; left:${left}px;">
                 <div><div></div></div></div>`
            );
        },

        setupPlayerBoard: function( player ) {
            let player_id = player.player_id;
            console.log("Setting up board for player " + player_id);
            let player_board_div = this.getPlayerPanelElement(player_id);
            dojo.place( this.jstpl_player_board( player_id, player ),
                        player_board_div );

            // create counters per player
            this.hand_counters[player_id]=new ebg.counter();
            this.hand_counters[player_id].create('handcount_'+player_id);
            this.pool_counters[player_id]=new ebg.counter();
            this.pool_counters[player_id].create('poolcount_'+player_id);
            this.city_counters[player_id]=new ebg.counter();
            this.city_counters[player_id].create('citycount_'+player_id);

            this.updateHandCount(player, false);
            this.updatePoolCount(player, false);
            this.updateCapturedCityCount(player, false);
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
            thegamedatas = gamedatas;
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
                board.insertAdjacentHTML(
                    `beforeend`,
                    this.jstpl_hex( hex ) );
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
            // Set up the available ziggurat tiles
            for( let z = 0; z < gamedatas.ziggurat_cards.length; z++) {
                let div = $(`zig${z+1}`);
                let card = gamedatas.ziggurat_cards[z];
                div.classList.add(card.type);
                if ( card.owning_player_id != 0 ) {
                    this.setZigguratCardOwned(card.owning_player_id, card.type);
                }
            }

            //   and owned ziggurat cards

            console.log( "setting up notifications" );
            this.setupNotifications();

            console.log( "Ending game setup" );
        },

        onHexSelection:   function (event) {
            console.log("onHexSelection:" + event.target.id);
            event.preventDefault();
            event.stopPropagation();
            switch (this.stateName) {
                case 'playPieces':
                    this.selectPieceToPlay(event);
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

        selectPieceToPlay: function(event) {
            // first find selected hand piece, if any.
            var s = dojo.query( '#hand .selected' );
            if (s.length == 0) {
                console.log("No piece selected.");
                return;
            }
            if (s.length > 1) {
                console.log("More than one piece selected?!");
            }
            console.log("Selected hand piece div id: " + s[0].id);
            let foo = s[0].id.split("_");
            let piece = foo[0];
            let pos = foo[1];

            let hex = this.selectedHex(event.target);
            if (hex == null) {
                return;
            }
            console.log("selected hex " + hex.row + "," + hex.col);

            this.bgaPerformAction("actPlayPiece", {
                handpos: pos,
                row: hex.row,
                col: hex.col
            }).then(() =>  {
                this.markHexUnplayable({
                    row: hex.row,
                    col: hex.col
                });
            });
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
                if (cl.contains(this.handClass(this.pieceClasses[i]))) {
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
            let m = this.allowedMoves[p];
            if (m == null) {
                m = [];
            }
            return m;
        },

        setZigguratCardOwned: function (player_id, card) {
            let zpaneldiv = $( `b_ziggurats_${player_id}` );
            // add a div under div id b_ziggurats_{player_id}
            // with the card as class.
            // TODO: only if there isn't one already
            zpaneldiv.insertAdjacentHTML(
                `beforeend`,
                `<div class="${card}"></div>` );

            // also mark the available zig card spot as "no class"
            var s = dojo.query( `#available_ziggurats .${card}` );
            if (s.length == 0) {
                console.log("Couldn't find available card " + card);
                return;
            }
            if (s.length > 1) {
                console.log("More than one of the same available zig card?");
            }
            s[0].classList.remove(card);
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

        onPieceSelection: function(event) {
            console.log("onPieceSelection");
            event.preventDefault();
            event.stopPropagation();
            if(! this.isCurrentPlayerActive() ) {
                return false;
            }
            let e = event.target;
            let hc = e.parentElement;
            if (hc.id == "hand") {
                let c = e.classList;
                if (this.allowedMovesFor(c).length > 0) {
                    if (!c.contains("selected")) {
                        hc.querySelectorAll('.selected').forEach(div => {
                            if (div.classList.contains('selected')) {
                                this.markHexesUnplayableForPiece(div.classList);
                            }
                            div.classList.remove('selected');
                        });
                        this.markHexesPlayableForPiece(c);
                    } else {
                        this.markHexesUnplayableForPiece(c);
                    }
                    c.toggle("selected");
                }
            }
            return false;
        },

        stateName: "",

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
            this.stateName = stateName;

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

        // onUpdateActionButtons: in this method you can manage
        //                        "action buttons" that are displayed
        //                        in the action status bar (ie: the
        //                        HTML links in the status bar).
        //
        onUpdateActionButtons: function( stateName, args ) {
            console.log( 'onUpdateActionButtons: '+stateName,
                         this.isCurrentPlayerActive(),
                         args );
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
                        this.updateStatusBar('You must select a ziggurat card');
                        console.log(args.available_cards);
                        args.available_cards.forEach(z =>
                            this.addActionButton(
                                z + '-btn',
                                `<div class="shadow ziggurat bgaimagebutton ${z}"></div>`,
                                () => this.bgaPerformAction('actSelectZigguratCard', {
                                    card_type: z
                                }),
                                null,
                                false,
                                "gray"));
                        // TODO: highlight available ones & select by clicking on them.
                        break;

                    case 'playPieces':
                        if (args.canEndTurn) {
                            if (args.allowedMoves.length == 0) {
                                this.updateStatusBar('You must end your turn');
                            } else {
                                this.updateStatusBar('You may play a piece or end your turn');
                            }
                            this.addActionButton(
                                'end-btn',
                                'End turn',
                                () => this.bgaPerformAction("actDonePlayPieces"));
                        } else {
                            this.updateStatusBar('You must play a piece');
                        }

                        // save allowedMoves so selection can highlight hexes
                        // and enforce placement rules.
                        this.allowedMoves = args.allowedMoves;
                        this.markAllHexesUnplayable();

                        this.addActionButton(
                            'undo-btn',
                            'Undo',
                            () => window.alert('undo not supported'));
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

        handDiv: function (i) {
            return $(`hand_${i}`);
        },

        handClass: function(piece) {
            if (piece == null) {
                return "unavailable";
            }
            return piece + "_" + this.playerNumber;
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
                this.handDiv(i).className = this.handClass(hand[i]);
            }
        },

        renderPlayedPiece: function (row, col, piece, playerNumber) {
            // TODO: animate this
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

            dojo.subscribe( 'piecePlayed', this, 'notif_piecePlayed' );
            dojo.subscribe( 'handRefilled', this, 'notif_handRefilled' );
            dojo.subscribe( 'cityScored', this, 'notif_cityScored' );
            dojo.subscribe( 'cityScoredPlayer', this, 'notif_cityScoredPlayer' );
            dojo.subscribe( 'turnFinished', this, 'notif_turnFinished' );
            dojo.subscribe( 'zigguratCardSelection', this, 'notif_zigguratCardSelection');
            // TODO: here, associate your game notifications with local methods

            // Example 1: standard notification handling
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );

            // Example 2: standard notification handling + tell the
            //            user interface to wait during 3 seconds
            //            after calling the method in order to let the
            //            players see what is happening in the game.
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            // this.notifqueue.setSynchronous( 'cardPlayed', 3000 );
            //
        },

        notif_zigguratCardSelection: function( notif ) {
            console.log( 'notif_zigguratCardSelection', notif );
            // TODO: also hand marking cards as "used"?
            this.setZigguratCardOwned(notif.args.player_id, notif.args.card);
            this.scoreCtrl[notif.args.player_id].toValue(notif.args.score);
        },

        notif_cityScored: function( notif ) {
            console.log( 'notif_cityScored', notif );
            this.renderPlayedPiece( notif.args.row, notif.args.col, 'empty', null );
            if ( notif.args.captured_by != 0 ) {
                // TODO: update player and global city scored count
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

        notif_piecePlayed: function( notif ) {
            console.log( 'notif_piecePlayed', notif );
            this.renderPlayedPiece( notif.args.row,
                                    notif.args.col,
                                    notif.args.piece,
                                    notif.args.player_number );
            if (notif.args.player_number == this.playerNumber) {
                this.handDiv(notif.args.handpos).className = this.handClass("empty");
            }
            this.updateHandCount( notif.args );
            this.updatePoolCount( notif.args );
            this.scoreCtrl[notif.args.player_id].toValue(notif.args.score);
        },

        notif_handRefilled: function( notif ) {
            console.log( 'notif_handRefilled', notif );
            this.renderHand( notif.args.hand, notif.args.player_number );
        },
    });
});
