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
    BOARD_CONTAINER: 'bbl_board_container',
    HAND: 'bbl_hand',

    handPos: function(pos) {
        return `bbl_hand_${pos}`;
    },

    handcount: function(player_id) {
        return 'bbl_handcount_' + player_id;
    },

    poolcount: function(player_id) {
        return 'bbl_poolcount_' + player_id;
    },

    citycount: function(player_id) {
        return 'bbl_citycount_' + player_id;
    },

    hexDiv: function(row, col) {
        return `bbl_hex_${row}_${col}`;
    },

    playerBoardZcards: function(player_id) {
        return `bbl_zcards_${player_id}`;
    },

    ownedZcard: function(z) {
        return `bbl_ozig_${z}`;
    },

    availableZcard: function(z) {
        return `bbl_zig_${z}`;
    },
};

const CSS = {
    SELECTING: 'bbl_selecting',
    SELECTED: 'bbl_selected',
    PLAYABLE: 'bbl_playable',
    UNPLAYABLE: 'bbl_unplayable',
    EMPTY: 'bbl_empty',

    piece: function (piece, playerNumber) {
        if (playerNumber == null) {
            return 'bbl_' + piece;
        } else {
            return 'bbl_' + piece + '_' + playerNumber;
        }
    },

    handPiece: function(piece, playerNumber = null) {
        if (piece == null || piece == "empty") {
            return CSS.EMPTY;
        }
        return CSS.piece(
            piece,
            playerNumber == null ? this.playerNumber : playerNumber);
    },
    zcard: function(card, used = false) {
        return used ? 'bbl_zc_used' : ('bbl_' + card);
    }

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
         <div id="${IDS.BOARD_CONTAINER}">
           <div id="${IDS.BOARD}"></div>
           <span id="bbl_vars"></span>
         </div>
         <div id="${IDS.AVAILABLE_ZCARDS}"></div>
      </div>
`);


define([
    'dojo','dojo/_base/declare', 'dojo/_base/fx',
    g_gamethemeurl + "modules/js/hexloc.js",
    g_gamethemeurl + "modules/js/fx.js",
    'ebg/core/gamegui',
    'ebg/counter',
],
function (dojo, declare, fx, hexloc, bblfx) {
    return declare('bgagame.babylonia', ebg.core.gamegui, {
        constructor: function(){
            console.log('babylonia constructor');

            // Here, you can init the global variables of your user interface
            // Example:
            // this.myGlobalValue = 0;

            dojo.connect($(IDS.HAND), 'onclick', this, 'onPieceSelection');
            dojo.connect($(IDS.BOARD), 'onclick', this, 'onHexSelection');
            dojo.connect($(IDS.AVAILABLE_ZCARDS), 'onclick', this, 'onZcardSelected');
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
        gamedatas: null,

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
        setup: function(gamedatas) {
            console.log('Starting game setup');
            this.gamedatas = gamedatas;
            this.playerNumber = gamedatas.players[this.player_id].player_number;

            console.log('Setting up player boards');
            for (const player_id in gamedatas.players) {
                this.setupPlayerBoard(gamedatas.players[player_id]);
            }

            this.setupBoard(gamedatas.board, gamedatas.players);

            console.log('Setting up player hand');
            this.hand = gamedatas.hand;
            this.renderHand();

            this.setupAvailableZcards(gamedatas.ziggurat_cards);

            console.log('setting up notifications');
            this.bgaSetupPromiseNotifications();

            console.log('Game setup done.');
        },

        setupPlayerBoard: function(player) {
            let player_id = player.player_id;
            console.log('Setting up board for player ' + player_id);
            let player_board_div = this.getPlayerPanelElement(player_id);
            dojo.place(this.format_block('jstpl_player_board_ext',
                                          {
                                              'player_id': player_id,
                                              'player_number': player.player_number
                                          }),
                        player_board_div);
            // create counters per player
            this.hand_counters[player_id]=new ebg.counter();
            this.hand_counters[player_id].create(IDS.handcount(player_id));
            this.pool_counters[player_id]=new ebg.counter();
            this.pool_counters[player_id].create(IDS.poolcount(player_id));
            this.city_counters[player_id]=new ebg.counter();
            this.city_counters[player_id].create(IDS.citycount(player_id));
            this.updateHandCount(player, false);
            this.updatePoolCount(player, false);
            this.updateCapturedCityCount(player, false);
        },

        setupBoard: function(boardData, playersData) {
            console.log('Setting the the game board');
            let boardDiv = $(IDS.BOARD);
            // console.log(gamedatas.board);

            for (const hex of boardData) {
                let tl = hexloc.hexLocation(hex);

                dojo.place(this.format_block('jstpl_hex',
                                              {
                                                  'row': hex.row,
                                                  'col': hex.col,
                                                  // or ... row / 2 * 63 + 6;
                                                  'top': tl.top,
                                                  'left': tl.left,
                                              }),
                            boardDiv);

                if (hex.piece != null) {
                    let n = (hex.board_player == 0)
                        ? null
                        : playersData[hex.board_player].player_number;
                    this.renderPlayedPiece(hex.row, hex.col, hex.piece, n);
                }
            }
        },

        onHexSelection: function (event) {
            // console.log('onHexSelection:' + event.target.id);
            event.preventDefault();
            event.stopPropagation();
            if (! this.isCurrentPlayerActive()) {
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
            return false;
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
            this.bgaPerformAction('actSelectHexToScore', rc).then(() =>  {
            });
            this.unmarkHexPlayable(rc);
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
            for (const pc of this.pieceClasses) {
                if (cl.contains(CSS.handPiece(pc, this.playerNumber))) {
                    return pc;
                }
            }
            return null;
        },

        allowedMovesFor: function(pos) {
            const piece = this.hand[pos];
            if (piece == null) {
                return [];
            }
            return this.stateArgs.allowedMoves[piece] || [];
        },

        markHexPlayable: function (rc) {
            this.hexDiv(rc.row, rc.col)
                .classList.add(CSS.PLAYABLE);
        },

        unmarkHexPlayable: function (rc) {
            this.hexDiv(rc.row, rc.col)
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
            const tid = event.target.id;

            var z = -1;
            for (const i in this.zcards) {
                if (tid == IDS.availableZcard(i)) {
                    z = i;
                    break;
                }
            }
            if (z < 0) {
                console.error("couldn't determine zcard from ", tid);
                return false;
            }
            this.bgaPerformAction('actSelectZigguratCard',
                                  { card_type: this.zcards[z].type });
            let div = $(IDS.AVAILABLE_ZCARDS);
            div.classList.remove(CSS.SELECTING);
            return false;
        },

        onPieceSelection: function(event) {
            console.log('onPieceSelection');
            event.preventDefault();
            event.stopPropagation();
            if (! this.isCurrentPlayerActive()) {
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
            for (const p in this.hand) {
                let cl = $(IDS.handPos(p)).classList;
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
            for (const p in this.hand) {
                let cl = $(IDS.handPos(p)).classList;
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
            if (!this.isCurrentPlayerActive()) {
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
        onEnteringState: function(stateName, stateInfo) {
            console.log('Entering state: '+stateName,
                         this.isCurrentPlayerActive(),
                         stateInfo);
            // All other important things are done in onUpdateActionButtons.
            // let args = stateInfo.args;
            switch(stateName) {
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
        onLeavingState: function(stateName) {
            console.log('Leaving state: '+stateName);
            this.stateName = '';
            switch(stateName) {
                    /* Example:

                       case 'myGameState':

                       // Hide the HTML block we are displaying only
                       // during this game state
                       dojo.style('my_html_block_id', 'display', 'none');

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
        onUpdateActionButtons: function(stateName, args) {
            console.log('onUpdateActionButtons: '+stateName,
                         this.isCurrentPlayerActive(),
                         args);
            this.stateName = stateName;
            this.stateArgs = args;
            if (this.isCurrentPlayerActive()) {
                switch(stateName) {
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
                        let div = $(IDS.AVAILABLE_ZCARDS);
                        div.scrollIntoView(false);
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

        hexDiv: function (row, col) {
            return $(IDS.hexDiv(row,col));
        },

        handPosDiv: function (i) {
            let id = IDS.handPos(i);
            let div = $(id);
            if (div != null) {
                return div;
            }
            // dynamically extend hand as needed.
            const hand = $(IDS.HAND);
            for (let j = 0; j <= i; ++j) {
                let id = IDS.handPos(j);
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

        renderPlayedPiece: function (row, col, piece, playerNumber) {
            this.hexDiv(row, col).className = CSS.piece(piece, playerNumber);
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

        updateCapturedCityCount: function(player, animate=true) {
            this.updateCounter(this.city_counters[player.player_id],
                               player.captured_city_count,
                               animate);
        },

        renderHand: function() {
            for (const i in this.hand) {
                this.handPosDiv(i).className = CSS.handPiece(this.hand[i], this.playerNumber);
            }
        },

        setupAvailableZcards: function(zcards) {
            console.log('Setting up available ziggurat cards', zcards);
            this.zcards = zcards;
            for (const z in zcards) {
                const id = IDS.availableZcard(z);
                if (zcards[z].owning_player_id != 0) {
                    this.addZcardDivInPlayerBoard(z);
                    // also "shell" in available cards
                    dojo.place(`<div id='${id}'></div>`, IDS.AVAILABLE_ZCARDS);
                } else {
                    // just in available cards
                    this.addZigguratCardDiv(id, IDS.AVAILABLE_ZCARDS, z);
                }
            }
        },

        addZcardDivInPlayerBoard: function(z) {
            this.addZigguratCardDiv(
                IDS.ownedZcard(z),
                IDS.playerBoardZcards(this.zcards[z].owning_player_id),
                z
            );
        },

        indexOfZcard: function(cardType) {
            for (const z in this.zcards) {
                if (this.zcards[z].type == cardType) {
                    return z;
                }
            }
            return -1;
        },

        addZigguratCardDiv: function(id, parentElem, z) {
            const cls = CSS.zcard(this.zcards[z].type, this.zcards[z].used);
            const div = dojo.place(`<div id='${id}' class='${cls}'></div>`,
                                    parentElem);
            this.addTooltip(id, this.zcards[z].tooltip, '');
            // div.title = this.zcards[z].tooltip;
        },

        slideTemporaryDiv: function(className,
                                    from,
                                    to,
                                    onEnd = null,
                                    parent = IDS.BOARD) {
            return bblfx.slideTemporaryDiv({
                className: className,
                from: from,
                to: to,
                onEnd: onEnd,
                parent: parent,
            });
        },

        /* @Override */
        format_string_recursive : function format_string_recursive(log, args) {
            let saved = [];
            try {
                if (log && args && !args.processed) {
                    args.processed = true;

                    // list of special keys we want to replace with images
                    var keys = ['piece', 'city', 'zcard', 'original_piece'];
                    for (const key of keys) {
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
                for (const i in saved) {
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

        notif_extraTurnUsed: async function (args) {
            console.log('notif_extraTurnUsed', args);
            const z = this.indexOfZcard(args.card);
            if (z < 0) {
                console.error("Couldn't find ${args.card} zcard");
            } else {
                this.zcards[z].used = args.used;
                const carddiv = $(IDS.ownedZcard(z));
                if (carddiv == undefined) {
                    console.error(`Could not find div for owned ${args.card} card`,
                                  z,
                                  this.zcards[z]);
                } else {
                    carddiv.className = CSS.zcard(null, true);
                }
            }
            return Promise.resolve();
        },

        notif_zigguratCardSelection: async function(args) {
            console.log('notif_zigguratCardSelection', args);
            const z = this.indexOfZcard(args.card);
            if (z < 0) {
                console.error("Couldn't find ${args.card} zcard");
                return Promise.resolve();
            } else {
                this.zcards[z].owning_player_id = args.player_id;
                this.zcards[z].used = args.cardused;
                this.scoreCtrl[args.player_id].toValue(args.score);

                const id = IDS.availableZcard(z);

                // mark the available zig card spot as 'taken'
                $(id).className = "";
                this.removeTooltip(id);

                anim = this.slideTemporaryDiv(
                    CSS.zcard(this.zcards[z].type, false),
                    id,
                    IDS.playerBoardZcards(args.player_id),
                    () => this.addZcardDivInPlayerBoard(z),
                    IDS.AVAILABLE_ZCARDS
                );
                await this.bgaPlayDojoAnimation(anim);
            }
        },

        fadeOut: function(hexes) {
            return dojo.fx.combine(
                hexes.map(h => fx.fadeOut({ node: this.hexDiv(h.row, h.col) }))
            );
        },
        fadeIn: function(hexes) {
            return dojo.fx.combine(
                hexes.map(h => fx.fadeIn({ node: this.hexDiv(h.row, h.col) }))
            );
        },

        notif_cityScored: async function(args) {
            console.log('notif_cityScored', args);

            let anim = [];

            for (const player_id in args.details) {
                const details = args.details[player_id];

                anim.push(this.fadeOut(details.network_hexes));

                dojo.connect(anim[anim.length-1],
                             'onBegin',
                             () => {
                                 for (const hex of details.scored_hexes) {
                                     this.hexDiv(hex.row, hex.col).classList.add(CSS.SELECTED);
                                 }
                             });

                anim.push(this.fadeIn(details.network_hexes));
                anim.push(this.fadeOut(details.network_hexes));
                anim.push(this.fadeIn(details.network_hexes));

                let eq = function(h1, h2) {
                    return h1.row == h2.row && h1.col == h2.col;
                }

                var nonscoring_hexes = [];
                for (const nh of details.network_hexes) {
                    if (!details.scored_hexes.some(sh => eq(nh, sh))) {
                        nonscoring_hexes.push(nh);
                    }
                }

                anim.push(this.fadeOut(nonscoring_hexes));

                anim.push(bblfx.spinGrowText({
                    text: `+${details.network_points}`,
                    parent: IDS.BOARD,
                    centeredOn: IDS.hexDiv(args.row, args.col),
                    color: '#' + this.gamedatas.players[player_id].player_color
                }));

                anim.push(this.fadeIn(nonscoring_hexes));

                dojo.connect(anim[anim.length-1],
                             'onEnd',
                             () => {
                                 details.scored_hexes.forEach(
                                     hex => this.hexDiv(hex.row, hex.col).classList.remove(CSS.SELECTED));
                                 this.scoreCtrl[player_id].incValue(details.network_points);
                                 this.updateCapturedCityCount(details);
                             });
            }

            const hexDivId = IDS.hexDiv(args.row, args.col);
            let a = (args.captured_by != 0)
                ? this.slideTemporaryDiv(
                    CSS.piece(args.city),
                    hexDivId,
                    IDS.citycount(args.captured_by)
                )
                : this.slideTemporaryDiv(
                    CSS.piece(args.city),
                    hexDivId,
                    // TODO: find a better location for 'off the board'
                    IDS.AVAILABLE_ZCARDS
                );
            dojo.connect(a,
                         'onBegin',
                         () => {
                             this.renderPlayedPiece(args.row, args.col, null, null);
                         });
            dojo.connect(a,
                         'onEnd',
                         () => {
                             for (const player_id in args.details) {
                                 const details = args.details[player_id];
                                 this.scoreCtrl[player_id].incValue(details.capture_points);
                                 this.updateCapturedCityCount(details);
                             }
                         });
            anim.push(a);
            await this.bgaPlayDojoAnimation(dojo.fx.chain(anim));
        },

        notif_turnFinished: async function(args) {
            console.log('notif_turnFinished', args);

            this.updateHandCount(args);
            this.updatePoolCount(args);

            return Promise.resolve();
        },

        notif_undoMove: async function(args) {
            console.log('notif_undoMove', args);

            const isActive = this.playerNumber == args.player_number;
            var targetDivId = IDS.handcount(args.player_id);
            var handPosDiv = null;
            if (isActive) {
                this.hand[args.handpos] = args.original_piece;
                handPosDiv = this.handPosDiv(args.handpos);
                targetDivId = handPosDiv.id;
            }

            // Put any piece (field) captured in the move back on the board
            // TODO: animate this? (and animate the capture too?)
            this.renderPlayedPiece(args.row,
                                   args.col,
                                   args.captured_piece,
                                   null);
            let anim = this.slideTemporaryDiv(
                CSS.handPiece(args.piece, args.player_number),
                IDS.hexDiv(args.row, args.col),
                targetDivId,
                () => {
                    if (isActive) {
                        cl = handPosDiv.classList;
                        cl.remove(CSS.EMPTY);
                        cl.add(CSS.PLAYABLE);
                        cl.add(CSS.handPiece(args.original_piece, this.playerNumber));
                    }
                    this.hand_counters[args.player_id].incValue(1);
                    this.scoreCtrl[args.player_id].incValue(-args.points);
                });
            await this.bgaPlayDojoAnimation(anim);
        },

        notif_piecePlayed: async function(args) {
            console.log('notif_piecePlayed', args);
            const isActive = this.playerNumber == args.player_number;
            var sourceDivId = IDS.handcount(args.player_id);
            let hpc = CSS.handPiece(args.piece, args.player_number);
            if (isActive) {
                this.hand[args.handpos] = null;
                const handPosDiv = this.handPosDiv(args.handpos);
                sourceDivId = handPosDiv.id;
                // Active player hand piece 'removed' from hand.
                let cl = handPosDiv.classList;
                cl.remove(hpc);
                cl.add(CSS.EMPTY);
            }
            anim = this.slideTemporaryDiv(
                hpc,
                sourceDivId,
                this.hexDiv(args.row, args.col).id,
                () => {
                    this.renderPlayedPiece(args.row,
                                           args.col,
                                           args.piece,
                                           args.player_number);
                    this.updateHandCount(args);
                    this.scoreCtrl[args.player_id].toValue(args.score);
                }
            );

            await this.bgaPlayDojoAnimation(anim);
        },

        notif_handRefilled: async function(args) {
            console.log('notif_handRefilled', args);
            let anim = [];
            let pid = this.player_id;
            for (const i in args.hand) {
                if (this.hand[i] == null) {
                    this.hand[i] = args.hand[i];
                }
                const div = this.handPosDiv(i);
                let hc = CSS.handPiece(this.hand[i], this.playerNumber);
                if (hc != CSS.EMPTY
                    && div.classList.contains(CSS.EMPTY)) {
                    const a = this.slideTemporaryDiv(
                        hc,
                        IDS.handcount(pid),
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
