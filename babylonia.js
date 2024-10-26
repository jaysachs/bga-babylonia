/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * babylonia implementation : © <Your name here> <Your email address here>
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

        /*
            setup:

            This method must set up the game user interface according to current game situation specified
            in parameters.

            The method is called each time the game interface is displayed to a player, ie:
            _ when the game starts
            _ when a player refreshes the game page (F5)

            "gamedatas" argument contains all datas retrieved by your "getAllDatas" PHP method.
        */

        playerNumber: -1,

	jstpl_player_panel: function(id, color) {
	    return `<div class="b_playerboard_ext">
            <div class="b_hand">hand:<span id="handcount_${id}">0</span></div>
            <div class="b_pool">pool:<span id="poolcount_${id}">0</span></div>
            <div class="b_citycount">cities:<span id="citycount_${id}">0</span></div>
            </div>`;
	},

        setup: function( gamedatas )
        {
            console.log( "Starting game setup" );
	    thegamedatas = gamedatas;
            // Setting up player boards
            for( var player_id in gamedatas.players )
            {
                var player = gamedatas.players[player_id];

		this.getPlayerPanelElement(player_id).innerHTML =
		    this.jstpl_player_panel(player_id, player.color);

		this.updateHandCount(player_id,
				     player.hand_size);
		this.updatePoolCount(player_id,
				     player.pool_size);
		this.updateCapturedCityCount(player_id,
					     player.captured_city_count);
            }

            this.playerNumber = gamedatas.players[this.player_id].player_number;

	    // Set up the board
            let board = $('board');
            console.log(gamedatas.board);
            for( let h = 0; h < gamedatas.board.length; ++h) {
                var hex = gamedatas.board[h];
                var row = hex.row;
                var col = hex.col;
                let top = row * 31.75 + 6; // row / 2 * 63 + 6;
                let left = 38 + (col * 55);
                board.insertAdjacentHTML(
                    `beforeend`,
                    `<div id="hex_${row}_${col}" style="top:${top}px; left:${left}px;"><div><div></div></div></div>`);
                var p = hex.piece;
                if (p != null) {
                    let n = (hex.board_player == null || hex.board_player == 0) ? null : gamedatas.players[hex.board_player].player_number;
                    this.renderPlayedPiece(row, col, p, n);
                }
            }

	    // Set up the available ziggurat tiles
	    for( let z = 0; z < gamedatas.ziggurat_cards.length; z++) {
		let div = $(`zig${z+1}`);
		if ( gamedatas.ziggurat_cards[z].player_id == null
		     || gamedatas.ziggurat_cards[z].player_id == 0 ) {
		    div.classList = gamedatas.ziggurat_cards[z].ziggurat_card;
		} else {
		    div.className = "";
		}
	    }

	    // Set up the player's hand
            this.renderHand(gamedatas.hand);
	    //   and owned ziggurat cards
	    // TODO: update player board with hand/pool/city counts

            console.log("setting up notifications");

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            console.log( "Ending game setup" );
        },

        onHexSelection:   function (event) {
            console.log("onHexSelection:" + event.target.id);
            event.preventDefault();
            event.stopPropagation();

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
            let e = event.target;
            while (e.parentElement != null && e.parentElement.id != "board") {
                e = e.parentElement;
            }
            if (e.parentElement == null) {
                console.log("didn't click on a hex");
                return;
            }
	    // now check if it's allowed
	    let ae = e.firstElementChild.firstElementChild;
	    if (!ae.classList.contains('playable')) {
		console.log('not playable');
		return;
	    }
	    
            let id = e.id.split("_");
            let row = id[1];
            let col = id[2];
            console.log("selected hex " + row + "," + col);

            this.bgaPerformAction("actPlayPiece", {
                handpos: pos,
                row: row,
                col: col
            }).then(() =>  {
                // What to do after the server call if it succeeded
                // (most of the time, nothing, as the game will react to notifs / change of state instead)
            });
        },

	allowedMoves: [],

	pieceClasses: [ "priest", "servant", "farmer", "merchant" ],

	removeAllAllowedMoves: function() {
            $("board").querySelectorAll('.playable')
		.forEach(div => div.className = '');
	},
	
	pieceForHandDivClassList: function(cl) {
	    console.log("pieceFor: " + cl);
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
	    console.log("hexes playable for " + p + "=" + this.allowedMoves[p]);
	    let m = this.allowedMoves[p];
	    if (m == null) {
		m = [];
	    }
	    return m;
	},
	
	addPlayableFor: function(cl) {
	    this.allowedMovesFor(cl).forEach(rc => {
		this.hexDiv(rc.row, rc.col).firstElementChild.firstElementChild.className = 'playable';
	    });
	},

	removePlayableFor: function(cl) {
	    this.allowedMovesFor(cl).forEach(rc => {
		this.hexDiv(rc.row, rc.col).firstElementChild.firstElementChild.className = '';
	    });
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
				this.removePlayableFor(div.classList);
			    }
			    div.classList.remove('selected');
			});
			this.addPlayableFor(c);
                    } else {
			this.removePlayableFor(c);
		    }
                    c.toggle("selected");
                }
            }
            return false;
        },

        ///////////////////////////////////////////////////
        //// Game & client states

        // onEnteringState: this method is called each time we are entering into a new game state.
        //                  You can use this method to perform some user interface changes at this moment.
        //
        onEnteringState: function( stateName, args )
        {
            console.log( 'Entering state: '+stateName, args );

            switch( stateName )
            {

            /* Example:

            case 'myGameState':

                // Show some HTML block at this game state
                dojo.style( 'my_html_block_id', 'display', 'block' );

                break;
           */


            case 'dummmy':
                break;
            }
        },

        // onLeavingState: this method is called each time we are leaving a game state.
        //                 You can use this method to perform some user interface changes at this moment.
        //
        onLeavingState: function( stateName )
        {
            console.log( 'Leaving state: '+stateName );

            switch( stateName )
            {

            /* Example:

            case 'myGameState':

                // Hide the HTML block we are displaying only during this game state
                dojo.style( 'my_html_block_id', 'display', 'none' );

                break;
           */


            case 'dummmy':
                break;
            }
        },

        // onUpdateActionButtons: in this method you can manage "action buttons" that are displayed in the
        //                        action status bar (ie: the HTML links in the status bar).
        //
        onUpdateActionButtons: function( stateName, args )
        {
            console.log( 'onUpdateActionButtons: '+stateName, args );
            if( this.isCurrentPlayerActive() )
            {
                switch( stateName )
                {
		    // If we want to get fancy, can even roll own HTML for buttons:
		    // this.addActionButton(
		    // 	'gear_button',
		    // 	'<div id="gear_token" class="skills_and_techniques gear_token"></div>',
		    // 	'onSelectAssetType', null, false, 'blue');

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
			    () => this.bgaPerformAction("actDonePlayPieces").then(() => this.removeAllAllowedMoves())
		    );
		    } else {
			this.updateStatusBar('You must play a piece');
		    }

		    // save allowedMoves so selection can highlight hexes
		    // and enforce placement rules.
		    this.allowedMoves = args.allowedMoves;
		    this.removeAllAllowedMoves();
		    
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

	updateHandCount: function(player_id, count) {
	    $(`handcount_${player_id}`).innerHTML = count;
	},

	updatePoolCount: function (player_id, count) {
	    $(`poolcount_${player_id}`).innerHTML = count;
	},
	
	updateCapturedCityCount: function (player_id, count) {
	    $(`citycount_${player_id}`).innerHTML = count;
	},

        renderHand: function(hand) {
            console.log("renderHand: " + hand);

            for (i = 0; i < hand.length; ++i) {
                this.handDiv(i).className = this.handClass(hand[i].piece);
            }
            console.log("renderHand done");
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

            In this method, you associate each of your game notifications with your local method to handle it.

            Note: game notification names correspond to "notifyAllPlayers" and "notifyPlayer" calls in
                  your babylonia.game.php file.

        */
        setupNotifications: function()
        {
            console.log( 'notifications subscriptions setup' );

            dojo.subscribe( 'piecePlayed', this, 'notif_piecePlayed' );
            dojo.subscribe( 'handRefilled', this, 'notif_handRefilled' );
	    dojo.subscribe( 'cityScored', this, 'notif_cityScored' );
	    dojo.subscribe( 'cityScoredPlayer', this, 'notif_cityScoredPlayer' );
            dojo.subscribe( 'turnFinished', this, 'notif_turnFinished' );

            // TODO: here, associate your game notifications with local methods

            // Example 1: standard notification handling
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );

            // Example 2: standard notification handling + tell the user interface to wait
            //            during 3 seconds after calling the method in order to let the players
            //            see what is happening in the game.
            // dojo.subscribe( 'cardPlayed', this, "notif_cardPlayed" );
            // this.notifqueue.setSynchronous( 'cardPlayed', 3000 );
            //
        },

	notif_cityScored: function( notif ) {
	    console.log( notif );
	    this.renderPlayedPiece( notif.args.row, notif.args.col, 'empty', null );
	    if ( notif.args.captured_by != 0 ) {
		// TODO: update player and global city scored count
	    }
	},

	notif_turnFinished: function( notif ) {
	    console.log( "turnFinished" );
	    console.log( notif );

	    this.updateHandCount(notif.args.player_id,
				 notif.args.handcount);
	    this.updatePoolCount(notif.args.player_id,
				 notif.args.poolcount);
	},

	notif_cityScoredPlayer: function( notif ) {
	    console.log( notif );

	    // TODO: animate hexes contributing to scoring

	    this.scoreCtrl[notif.args.player_id].toValue(notif.args.score);
	    this.updateCapturedCityCount(notif.args.player_id,
					 notif.args.captured_city_count);
	},

        notif_piecePlayed: function( notif ) {
            console.log( 'notif_piecePlayed' );
            console.log( notif );
            this.renderPlayedPiece( notif.args.row, notif.args.col, notif.args.piece, notif.args.player_number );
            if (notif.args.player_number == this.playerNumber) {
                this.handDiv(notif.args.handpos).className = this.handClass("empty");
            }
	    this.updateHandCount(notif.args.player_id,
				 notif.args.handcount);
            this.scoreCtrl[notif.args.player_id].toValue(notif.args.score);
        },

        notif_handRefilled: function( notif ) {
            console.log( 'notif_handRefilled' );
            console.log( notif );
            this.renderHand( notif.args.hand, notif.args.player_number );
        },
    });
});
