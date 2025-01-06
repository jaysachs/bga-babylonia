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
"use strict";
const IDS = {
    AVAILABLE_ZCARDS: 'bbl_available_zcards',
    BOARD: 'bbl_board',
    BOARD_CONTAINER: 'bbl_board_container',
    HAND: 'bbl_hand',

    handPos: function(pos) {
        return `bbl_hand_${pos}`;
    },

    handcount: function(playerId) {
        return 'bbl_handcount_' + playerId;
    },

    poolcount: function(playerId) {
        return 'bbl_poolcount_' + playerId;
    },

    citycount: function(playerId) {
        return 'bbl_citycount_' + playerId;
    },

    hexDiv: function(rc) {
        return `bbl_hex_${rc.row}_${rc.col}`;
    },

    playerBoardZcards: function(playerId) {
        return `bbl_zcards_${playerId}`;
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



const jstpl_log_piece = '<span class="log-element bbl_${piece}_${player_number}"></span>';
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
    g_gamethemeurl + "modules/js/bga-animations.js",
    "dojo/on", "dojo/query",
    'ebg/core/gamegui',
    'ebg/counter',
],
function (dojo, declare, fx, hexloc, bblfx, bgaAnim, on) {
    return declare('bgagame.babylonia', ebg.core.gamegui, {
        constructor: function(){
            console.log('babylonia constructor');
            this.animationManager = new AnimationManager(this);
        },

        animationManager: null,
        selectedHandPos: null,
        pieceClasses: [ 'priest', 'servant', 'farmer', 'merchant' ],
        stateName: '',
        stateArgs: [],
        lastId: 0,
        zcards: [],
        hand: [],
        playerNumber: -1,
        handCounters: [],
        poolCounters: [],
        cityCounters: [],
        gamedatas: null,

        handlers: [],
        playAnimation: async function(anim) {
            const p = this.bgaPlayDojoAnimation(anim);
            this.pauseHandlers();
            p.then(() => this.resumeHandlers());
            return p;
        },
        setupHandlers: function() {
            this.handlers.push(on.pausable(
                $(IDS.HAND), 'click', this.onHandClicked.bind(this)
            ));
            this.handlers.push(on.pausable(
                $(IDS.BOARD), 'click', this.onBoardClicked.bind(this)
            ));
            this.handlers.push(on.pausable(
                $(IDS.AVAILABLE_ZCARDS),
                'click',
                this.onZcardClicked.bind(this)
            ));
        },
        resumeHandlers: function() {
            this.handlers.forEach(h => h.resume());
        },
        pauseHandlers: function() {
            this.handlers.forEach(h => h.pause());
        },

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
            console.log('starting game setup');
            this.gamedatas = gamedatas;
            this.playerNumber = gamedatas.players[this.player_id].player_number;

            console.log('setting up player boards');
            for (const playerId in gamedatas.players) {
                this.setupPlayerBoard(gamedatas.players[playerId]);
            }

            console.log('setting the the game board');
            this.setupGameBoard(gamedatas.board, gamedatas.players);

            console.log('setting up player hand');
            this.hand = gamedatas.hand;
            this.renderHand();

            this.setupAvailableZcards(gamedatas.ziggurat_cards);

            console.log('setting up notifications');
            this.bgaSetupPromiseNotifications();

            console.log('adding event handlers');
            this.setupHandlers();

            console.log('finished game setup.');
        },

        setupPlayerBoard: function(player) {
            const playerId = player.player_id;
            console.log('Setting up board for player ' + playerId);
            const player_board_div = this.getPlayerPanelElement(playerId);
            dojo.place(this.format_block('jstpl_player_board_ext',
                                          {
                                              player_id: playerId,
                                              player_number: player.player_number
                                          }),
                        player_board_div);
            // create counters per player
            this.handCounters[playerId]=new ebg.counter();
            this.handCounters[playerId].create(IDS.handcount(playerId));
            this.poolCounters[playerId]=new ebg.counter();
            this.poolCounters[playerId].create(IDS.poolcount(playerId));
            this.cityCounters[playerId]=new ebg.counter();
            this.cityCounters[playerId].create(IDS.citycount(playerId));
            this.updateHandCount(player, false);
            this.updatePoolCount(player, false);
            this.updateCapturedCityCount(player, false);
        },

        setupGameBoard: function(boardData, playersData) {
            const boardDiv = $(IDS.BOARD);
            // console.log(gamedatas.board);

            for (const hex of boardData) {
                const tl = hexloc.hexLocation(hex);

                dojo.place(this.format_block('jstpl_hex',
                                              {
                                                  row: hex.row,
                                                  col: hex.col,
                                                  // or ... row / 2 * 63 + 6;
                                                  top: tl.top,
                                                  left: tl.left,
                                              }),
                            boardDiv);

                if (hex.piece != null) {
                    const n = (hex.board_player == 0)
                        ? null
                        : playersData[hex.board_player].player_number;
                    this.renderPlayedPiece(hex, hex.piece, n);
                }
            }
        },

        onBoardClicked: function (event) {
            console.log('onBoardClicked:' + event.target.id);
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
            const ae = e;
            if (!ae.classList.contains(CSS.PLAYABLE)) {
                // console.log('not playable');
                return null;
            }
            const id = e.id.split('_');
            return {
                row: id[2],
                col: id[3],
            };
        },

        selectHexToScore: function(event) {
            const hex = this.selectedHex(event.target);
            if (hex == null) {
                return;
            }
            // console.log('selected hex ' + hex.row + ',' + hex.col);
            const rc = {
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

            const hex = this.selectedHex(event.target);
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

        allowedMovesFor: function(pos) {
            const piece = this.hand[pos];
            if (piece == null) {
                return [];
            }
            return this.stateArgs.allowedMoves[piece] || [];
        },

        markHexPlayable: function (rc) {
            this.hexDiv(rc).classList.add(CSS.PLAYABLE);
        },

        unmarkHexPlayable: function (rc) {
            this.hexDiv(rc).classList.remove(CSS.PLAYABLE);
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

        onZcardClicked: function (event) {
            console.log('onZcardClicked', event);
            event.preventDefault();
            event.stopPropagation();
            if (! this.isCurrentPlayerActive()) {
                 return false;
            }
            if (this.stateName != 'selectZigguratCard') {
                return false;
            }
            const tid = event.target.id;

            let z = -1;
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
                                  { zctype: this.zcards[z].type });
            const div = $(IDS.AVAILABLE_ZCARDS);
            div.classList.remove(CSS.SELECTING);
            return false;
        },

        onHandClicked: function(event) {
            console.log('onHandClicked', event);
            event.preventDefault();
            event.stopPropagation();
            if (this.inFlight > 0) {
                return false;
            }
            if (! this.isCurrentPlayerActive()) {
                 return false;
            }
            if (this.stateName != 'client_selectPieceOrEndTurn'
                && this.stateName != 'client_pickHexToPlay'
                && this.stateName != 'client_mustSelectPiece') {
                return false;
            }
            const selectedDiv = event.target;
            if (selectedDiv.parentElement.id != IDS.HAND) {
                return false;
            }
            const handpos = selectedDiv.id.split('_')[2];
            if (this.allowedMovesFor(handpos).length == 0) {
                return false;
            }
            let playable = false;
            if (!selectedDiv.classList.contains(CSS.SELECTED)) {
                this.unselectAllHandPieces();
                this.markHexesPlayableForPiece(handpos);
                playable = true;
            } else {
                this.unmarkHexesPlayableForPiece(handpos);
            }
            selectedDiv.classList.toggle(CSS.SELECTED);
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
                const cl = $(IDS.handPos(p)).classList;
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
                const cl = $(IDS.handPos(p)).classList;
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
                        const div = $(IDS.AVAILABLE_ZCARDS);
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

        hexDiv: function (rc) {
            return $(IDS.hexDiv(rc));
        },

        handPosDiv: function (i) {
            const id = IDS.handPos(i);
            const div = $(id);
            if (div != null) {
                return div;
            }
            // dynamically extend hand as needed.
            const hand = $(IDS.HAND);
            for (let j = 0; j <= i; ++j) {
                const id = IDS.handPos(j);
                if ($(id) == null) {
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

        renderPlayedPiece: function (rc, piece, playerNumber) {
            this.hexDiv(rc).className = CSS.piece(piece, playerNumber);
        },

        updateCounter: function(counter, value, animate) {
            if (animate) {
                counter.toValue(value);
            } else {
                counter.setValue(value);
            }
        },

        updateHandCount: function(player, animate=true) {
            this.updateCounter(this.handCounters[player.player_id],
                               player.hand_size,
                               animate);
        },

        updatePoolCount: function (player, animate=true) {
            this.updateCounter(this.poolCounters[player.player_id],
                               player.pool_size,
                               animate);
        },

        updateCapturedCityCount: function(player, animate=true) {
            this.updateCounter(this.cityCounters[player.player_id],
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

        shouldAnimate: function() {
            return document.visibilityState !== 'hidden'
                && !this.instantaneousMode;
        },

        slideTemporaryDiv: function(className,
                                    from,
                                    to,
                                    onEnd = null,
                                    parent = IDS.BOARD) {
            if (!this.shouldAnimate()) {
                const a = bblfx.empty();
                if (onEnd != null) {
                    dojo.connect(a, 'onEnd', onEnd);
                }
                return a;
            }
            return bblfx.slideTemporaryDiv({
                className: className,
                from: from,
                to: to,
                onEnd: onEnd,
                parent: parent,
            });
        },

        extend: function(o1, o2) {
            return Object.assign(Object.assign({}, o1), o2);
        },

        special_log_args: {
            zcard: {
                tmpl: 'jstpl_log_zcard',
                tmplargs: a => a
            },
            city: {
                tmpl: 'jstpl_log_city',
                tmplargs: a => a
            },
            piece: {
                tmpl: 'jstpl_log_piece',
                tmplargs: a => a
            },
            original_piece: {
                tmpl: 'jstpl_log_piece',
                tmplargs: args => Object.assign(
                    Object.assign({}, args),
                    {
                        piece: args['original_piece'],
                        player_number: args['player_number']
                    }
                )
            }
        },

        /* @Override */
        format_string_recursive : function format_string_recursive(log, args) {
            const defargs = key => { return { [key]: args[key] } };
            const saved = {};
            const defModify = x => x;
            try {
                if (log && args && !args.processed) {
                    args.processed = true;
                    for (const key of Object.keys(this.special_log_args)) {
                        if (key in args) {
                            saved[key] = args[key];
                            const s = this.special_log_args[key];
                            args[key] = this.format_block(
                                s.tmpl,
                                s.tmplargs(args)
                            );
                        }
                    }
                }
            } catch (e) {
                console.error(log,args,'Exception thrown', e.stack);
            }
            try {
                return this.inherited({callee: format_string_recursive}, arguments);
            } finally {
                for (const i in saved) {
                    args[i] = saved[i];
                }
            }
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

                await this.animationManager.play( new BgaSlideTempAnimation({
                    className: CSS.zcard(this.zcards[z].type, false),
                    fromId: id,
                    toId: IDS.playerBoardZcards(args.player_id),
                    parentId: IDS.AVAILABE_ZCARDS,
                })).then(() => this.addZcardDivInPlayerBoard(z));
            }
        },

        fadeOut: function(rcs) {
            if (!this.shouldAnimate()) {
                return  bblfx.empty();
            }
            return dojo.fx.combine(
                rcs.map(rc => fx.fadeOut({ node: this.hexDiv(rc) }))
            );
        },
        fadeIn: function(rcs) {
            if (!this.shouldAnimate()) {
                return  bblfx.empty();
            }
            return dojo.fx.combine(
                rcs.map(rc => fx.fadeIn({ node: this.hexDiv(rc) }))
            );
        },

        notif_cityScored: async function(args) {
            console.log('notif_cityScored', args);

            const anim = [];

            for (const playerId in args.details) {
                const details = args.details[playerId];

                anim.push(this.fadeOut(details.network_locations));

                dojo.connect(anim[anim.length-1],
                             'onBegin',
                             () => {
                                 for (const rc of details.scored_locations) {
                                     this.hexDiv(rc).classList.add(CSS.SELECTED);
                                 }
                             });

                anim.push(this.fadeIn(details.network_locations));
                anim.push(this.fadeOut(details.network_locations));
                anim.push(this.fadeIn(details.network_locations));

                const nonscoringLocations = [];
                for (const nh of details.network_locations) {
                    if (!details.scored_locations.some(sh => nh == sh)) {
                        nonscoringLocations.push(nh);
                    }
                }

                anim.push(this.fadeOut(nonscoringLocations));

                if (this.shouldAnimate()) {
                    anim.push(bblfx.spinGrowText({
                        text: `+${details.network_points}`,
                        parent: IDS.BOARD,
                        centeredOn: IDS.hexDiv(args),
                        color: '#' + this.gamedatas.players[playerId].player_color
                    }));
                }
                anim.push(this.fadeIn(nonscoringLocations));

                dojo.connect(anim[anim.length-1],
                             'onEnd',
                             () => {
                                 details.scored_locations.forEach(
                                     rc => this.hexDiv(rc).classList.remove(CSS.SELECTED));
                                 this.scoreCtrl[playerId].incValue(details.network_points);
                             });
            }

            const hexDivId = IDS.hexDiv(args);
            const a = (args.captured_by != 0)
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
                             this.renderPlayedPiece(args, null, null);
                         });
            dojo.connect(a,
                         'onEnd',
                         () => {
                             for (const playerId in args.details) {
                                 const details = args.details[playerId];
                                 this.scoreCtrl[playerId].incValue(details.capture_points);
                                 this.updateCapturedCityCount(details);
                             }
                         });
            anim.push(a);
            await this.playAnimation(dojo.fx.chain(anim));
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
            let targetDivId = IDS.handcount(args.player_id);
            let handPosDiv = null;
            if (isActive) {
                this.hand[args.handpos] = args.original_piece;
                handPosDiv = this.handPosDiv(args.handpos);
                targetDivId = handPosDiv.id;
            }

            // Put any piece (field) captured in the move back on the board
            // TODO: animate this? (and animate the capture too?)
            this.renderPlayedPiece(args,
                                   args.captured_piece,
                                   null);
            const onDone =
                () => {
                    if (isActive) {
                        const cl = handPosDiv.classList;
                        cl.remove(CSS.EMPTY);
                        cl.add(CSS.PLAYABLE);
                        cl.add(CSS.handPiece(args.original_piece, this.playerNumber));
                    }
                    this.handCounters[args.player_id].incValue(1);
                    this.scoreCtrl[args.player_id].incValue(-args.points);
                };
            await this.animationManager.play( new BgaSlideTempAnimation({
                className: CSS.handPiece(args.piece, args.player_number),
                fromId: IDS.hexDiv(args),
                toId: targetDivId,
                parentId: IDS.BOARD
            })).then(onDone);
        },

        notif_piecePlayed: async function(args) {
            console.log('notif_piecePlayed', args);
            const isActive = this.playerNumber == args.player_number;
            let sourceDivId = IDS.handcount(args.player_id);
            const hpc = CSS.handPiece(args.piece, args.player_number);
            if (isActive) {
                this.hand[args.handpos] = null;
                const handPosDiv = this.handPosDiv(args.handpos);
                sourceDivId = handPosDiv.id;
                // Active player hand piece 'removed' from hand.
                const cl = handPosDiv.classList;
                cl.remove(hpc);
                cl.add(CSS.EMPTY);
            }
            const onDone =
                  () => {
                      this.renderPlayedPiece(args,
                                             args.piece,
                                             args.player_number);
                      this.updateHandCount(args);
                      this.scoreCtrl[args.player_id].incValue(args.points);
                  };
            await this.animationManager.play( new BgaSlideTempAnimation({
                className: hpc,
                fromId: sourceDivId,
                toId: this.hexDiv(args).id,
                parentId: IDS.BOARD
            })).then(onDone);
        },

        notif_handRefilled: async function(args) {
            console.log('notif_handRefilled', args);
            const anim = [];
            const pid = this.player_id;
            for (const i in args.hand) {
                if (this.hand[i] == null) {
                    this.hand[i] = args.hand[i];
                }
                const div = this.handPosDiv(i);
                const hc = CSS.handPiece(this.hand[i], this.playerNumber);
                if (hc != CSS.EMPTY && div.classList.contains(CSS.EMPTY)) {
                    const a = new BgaSlideTempAnimation({
                        className: hc,
                        fromId: IDS.handcount(pid),
                        toId: div.id,
                        parentId: IDS.BOARD,
                        animationEnd: () => { div.className = hc; },
                    });
                    anim.push(a);
                }
            }
            await this.animationManager.playSequence(anim);
        },
    });
});
