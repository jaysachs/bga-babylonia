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

        setup: function( gamedatas )
        {
            console.log( "Starting game setup" );

            // Setting up player boards
            for( var player_id in gamedatas.players )
            {
                var player = gamedatas.players[player_id];

                // TODO: Setting up players boards if needed
            }

            // TODO: Set up your game interface here, according to "gamedatas"

            let c = document.getElementById("board");
	    console.log(gamedatas.board);
            for( let h = 0; h < gamedatas.board.length; ++h) {
                var hex = gamedatas.board[h];
                var i = hex.x;
                var j = hex.y;
                let top = j * 31.75 + 6; // j / 2 * 63 + 6;
                let left = 38 + (i * 55);
                var p = hex.piece;
                var cl = "";
                if (p != null) {
		    if (hex.board_player != null) {
			// TODO: fix color to match player!
			cl = "class='blue " + p +" piece'";
		    } else {
			cl = "class='city " + p + "'";
		    }
                }
                c.insertAdjacentHTML(
                    `beforeend`,
                    `<div id="hex_${i}_${j}" style="top:${top}px; left:${left}px;"><div ${cl}></div></div>`);
            }

	    // TODO: need to handle empty better; they should be just
	    //  circle outline with background showing through

	    // remove existing
	    for (i = 0; i < 7; ++i) {
		document.getElementById("hand_" + i).className = "";
	    }
	    // set up hand.
	    for (i = 0; i < gamedatas.hand.length; ++i) {
		var p = gamedatas.hand[i].piece;
		document.getElementById("hand_" + i).classList.add(p);
	    }
	    for (i = gamedatas.hand.length; i < 7; ++i) {
		document.getElementById("hand_" + i).classList.add("unavailable");
	    }

            // Setup game notifications to handle (see "setupNotifications" method below)
            this.setupNotifications();

            console.log( "Ending game setup" );
        },

	onHexSelection:   function (event) {
	    console.log("onHexSelection:" + event.target.id);
            event.preventDefault();
            event.stopPropagation();
            let e = event.target;
            while (e.parentElement != null && e.parentElement.id != "board") {
		e = e.parentElement;
            }
	    if (e.parentElement == null) {
		console.log("didn't click on a hex");
		return;
	    }
	    let id = e.id.split("_");
	    let x = id[1];
	    let y = id[2];
	    console.log("selected hex " + x + "," + y);
	    let pos = "0";
	    this.bgaPerformAction("actPlayPiece", {
                handpos: pos,
		x: x,
		y: y
            }).then(() =>  {
                // What to do after the server call if it succeeded
                // (most of the time, nothing, as the game will react to notifs / change of state instead)
            });
	},

	onPieceSelection: function(event) {
	    console.log("onPieceSelection");
	    event.preventDefault();
            if(! this.isCurrentPlayerActive() ) {
		return false;
	    }
            event.preventDefault();
            event.stopPropagation();
            let e = event.target;
            let hc = e.parentElement;
            if (hc.id == "hand") {
		let c = e.classList;
		if (!c.contains("selected")) {
                    hc.querySelectorAll('.selected').forEach(div => div.classList.remove('selected'));
		}
		c.toggle("selected");
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
                 case 'playerTurn':
                    const playableCardsIds = args.playableCardsIds; // returned by the argPlayerTurn

                    // Add test action buttons in the action status bar, simulating a card click:
                    playableCardsIds.forEach(
                        cardId => this.addActionButton(`actPlayCard${cardId}-btn`, _('Play card with id ${card_id}').replace('${card_id}', cardId), () => this.onCardClick(cardId))
                    );

                    this.addActionButton('actPass-btn', _('Pass'), () => this.bgaPerformAction("actPass"), null, null, 'gray');
                    break;
                }
            }
        },

        ///////////////////////////////////////////////////
        //// Utility methods

        /*

            Here, you can defines some utility methods that you can use everywhere in your javascript
            script.

        */


        ///////////////////////////////////////////////////
        //// Player's action

        /*

            Here, you are defining methods to handle player's action (ex: results of mouse click on
            game objects).

            Most of the time, these methods:
            _ check the action is possible at this game state.
            _ make a call to the game server

        */

        // Example:

        onCardClick: function( card_id )
        {
            console.log( 'onCardClick', card_id );

            this.bgaPerformAction("actPlayCard", {
                card_id,
            }).then(() =>  {
                // What to do after the server call if it succeeded
                // (most of the time, nothing, as the game will react to notifs / change of state instead)
            });
        },


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

        // TODO: from this point and below, you can write your game notifications handling methods

        /*
        Example:

        notif_cardPlayed: function( notif )
        {
            console.log( 'notif_cardPlayed' );
            console.log( notif );

            // Note: notif.args contains the arguments specified during you "notifyAllPlayers" / "notifyPlayer" PHP call

            // TODO: play the card in the user interface.
        },

        */
   });
});
