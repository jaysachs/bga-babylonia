interface RowCol { row: number, col: number };
interface TopLeft { top: number, left: number };
class IDS {
  static readonly AVAILABLE_ZCARDS: string = 'bbl_available_zcards';
  static readonly BOARD = 'bbl_board';
  static readonly BOARD_CONTAINER = 'bbl_board_container';
  static readonly HAND = 'bbl_hand';

  static handPos(pos: number): string {
    return `bbl_hand_${pos}`;
  }

  static handcount(playerId: number): string {
    return 'bbl_handcount_' + playerId;
  }

  static poolcount(playerId: number): string {
    return 'bbl_poolcount_' + playerId;
  }

  static citycount(playerId: number): string {
    return 'bbl_citycount_' + playerId;
  }

  static hexDiv(rc: RowCol): string {
    return `bbl_hex_${rc.row}_${rc.col}`;
  }

  static playerBoardZcards(playerId: number): string {
    return `bbl_zcards_${playerId}`;
  }

  static ownedZcard(z: number): string {
    return `bbl_ozig_${z}`;
  }

  static availableZcard(z: number): string {
    return `bbl_zig_${z}`;
  }
}


class CSS {
  static readonly SELECTING = 'bbl_selecting';
  static readonly SELECTED = 'bbl_selected';
  static readonly PLAYABLE = 'bbl_playable';
  static readonly UNPLAYABLE = 'bbl_unplayable';
  static readonly EMPTY = 'bbl_empty';

  static piece(piece: string, playerNumber: number = null): string {
    if (playerNumber == null) {
      return 'bbl_' + piece;
    } else {
      return 'bbl_' + piece + '_' + playerNumber;
    }
  }

  static handPiece(piece: string, playerNumber: number): string {
    if (piece == null || piece == "empty") {
      return CSS.EMPTY;
    }
    return CSS.piece(piece, playerNumber);
  }

  static zcard(card: string, used: boolean = false): string {
    return used ? 'bbl_zc_used' : ('bbl_' + card);
  }
}

const jstpl_log_piece = '<span class="log-element bbl_${piece}_${player_number}"></span>';
const jstpl_log_city = '<span class="log-element bbl_${city}"></span>';
const jstpl_log_zcard = '<span class="log-element bbl_${zcard}"></span>';

const jstpl_hex =
  '<div id="bbl_hex_${row}_${col}" style="top:${top}px; left:${left}px;"></div>';

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


/** Game class */
class GameBody extends GameBasics {
  private playerNumber: number;
  private hand: string[] = [];
  private handCounters: Counter[] = [];
  private poolCounters: Counter[] = [];
  private cityCounters: Counter[] = [];
  private zcards: any = [];
  private animationManager: AnimationManager;
  private selectedHandPos: number | null;
  private readonly pieceClasses = [ 'priest', 'servant', 'farmer', 'merchant' ];
  private stateName: string;
  private stateArgs: any;
  private lastId: number;
  private handlers: any[];

  constructor() {
    super();
    this.animationManager = new AnimationManager(this);
  }


  setup(gamedatas) {
    super.setup(gamedatas);

    this.playerNumber = gamedatas.players[this.player_id].player_number;

    this.setupGameHtml();

    console.log('setting the the game board');
    this.setupGameBoard(gamedatas.board, gamedatas.players);

    console.log('setting up player boards');
    for (const playerId in gamedatas.players) {
      this.setupPlayerBoard(gamedatas.players[playerId]);
    }

    console.log('setting up player hand');
    this.hand = gamedatas.hand;
    this.renderHand();

    this.setupAvailableZcards(gamedatas.ziggurat_cards);

    this.createDiv(undefined, "whiteblock cow", "thething").innerHTML = _("Should we eat the cow?");
    this.setupNotifications();
    console.log("Ending game setup");
  }

  hexLocation(hex: RowCol): TopLeft {
    const hstart = 38.0; // this is related to board width but not sure how
    const vstart = 9.0; // depends on board size too
    const height = 768 / 12.59;
    const width = height * 1.155;
    const hdelta = 0.75 * width + 2.0;
    const vdelta = 1.0 * height + 2.0;
    return {
      top: vstart + hex.row * vdelta / 2,
      left: hstart + hex.col * hdelta,
    };
  }

  setupGameBoard(boardData, playersData): void {
    const boardDiv = $(IDS.BOARD);
    // console.log(gamedatas.board);

    for (const hex of boardData) {
      const tl = this.hexLocation(hex);

      this.appendHtml(this.format_block('jstpl_hex',
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
  }

  renderPlayedPiece(rc: RowCol, piece: string, playerNumber: number) {
    this.hexDiv(rc).className = CSS.piece(piece, playerNumber);
  }


  setupAvailableZcards(zcards: any): void {
    console.log('Setting up available ziggurat cards', zcards);
    this.zcards = zcards;
    for (let z = 0; z < zcards.length; ++z) {
      const id = IDS.availableZcard(z);
      if (zcards[z].owning_player_id != 0) {
        this.addZcardDivInPlayerBoard(z);
        // also "shell" in available cards
        this.appendHtml(`<div id='${id}'></div>`, document.getElementById(IDS.AVAILABLE_ZCARDS));
      } else {
        // just in available cards
        this.addZigguratCardDiv(id, document.getElementById(IDS.AVAILABLE_ZCARDS), z);
      }
    }
  }

  addZcardDivInPlayerBoard(z: number) {
    this.addZigguratCardDiv(
      IDS.ownedZcard(z),
      IDS.playerBoardZcards(this.zcards[z].owning_player_id),
      z
    );
  }

  addZigguratCardDiv(id, parentElem, z): void {
    const cls = CSS.zcard(this.zcards[z].type, this.zcards[z].used);
    const div = this.appendHtml(`<div id='${id}' class='${cls}'></div>`,
      parentElem);
    this.addTooltip(id, this.zcards[z].tooltip, '');
    // div.title = this.zcards[z].tooltip;
  }

  setupGameHtml(): void {
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
`  )
  }

  updateCounter(counter: any, value: number, animate: boolean) {
    if (animate) {
      counter.toValue(value);
    } else {
      counter.setValue(value);
    }
  }

  updateHandCount(player: any, animate: boolean = true) {
    this.updateCounter(this.handCounters[player.player_id],
      player.hand_size,
      animate);
  }

  updatePoolCount(player: any, animate: boolean = true) {
    this.updateCounter(this.poolCounters[player.player_id],
      player.pool_size,
      animate);
  }

  updateCapturedCityCount(player: any, animate: boolean = true) {
    this.updateCounter(this.cityCounters[player.player_id],
      player.captured_city_count,
      animate);
  }

  hexDiv(rc: RowCol) {
    return $(IDS.hexDiv(rc));
  }

  handPosDiv(i: number): Element {
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
        this.appendHtml(`<div id='${id}' class='${CSS.EMPTY}'/>`, hand);
      }
    }
    return $(id);
  }

  renderHand(): void {
    for (let i = 0; i < this.hand.length; ++i) {
      this.handPosDiv(i).className = CSS.handPiece(this.hand[i], this.playerNumber);
    }
  }

  private onBoardClicked(e: any): void { }
  private onZcardClicked(e: any): void { }
  allowedMovesFor(pos: number): any {
    const piece = this.hand[pos];
    if (piece == null) {
        return [];
    }
    return this.stateArgs.allowedMoves[piece] || [];
  }

  markHexPlayable(rc: RowCol): void {
    this.hexDiv(rc).classList.add(CSS.PLAYABLE);
  }

  unmarkHexPlayable(rc: RowCol): void {
    this.hexDiv(rc).classList.remove(CSS.PLAYABLE);
  }

  markScoreableHexesPlayable(hexes: RowCol[]): void  {
    hexes.forEach(rc => this.markHexPlayable(rc));
  }

  markHexesPlayableForPiece(pos: number): void {
    this.allowedMovesFor(pos).forEach(rc => this.markHexPlayable(rc));
  }

  unmarkHexesPlayableForPiece(pos: number): void {
    this.allowedMovesFor(pos).forEach(rc => this.unmarkHexPlayable(rc));
  }

  unselectAllHandPieces(): void {
    for (var p = 0; p < this.hand.length; ++p) {
        const cl = $(IDS.handPos(p)).classList;
        if (cl.contains(CSS.SELECTED)) {
            this.unmarkHexesPlayableForPiece(p);
        }
        cl.remove(CSS.SELECTED);
        cl.remove(CSS.PLAYABLE);
        cl.remove(CSS.UNPLAYABLE);
    }
    this.selectedHandPos = null;
  }

  setPlayablePieces(): void {
    for (var p = 0; p < this.hand.length; ++p) {
        const cl = $(IDS.handPos(p)).classList;
        if (this.allowedMovesFor(p).length > 0) {
            cl.add(CSS.PLAYABLE);
            cl.remove(CSS.UNPLAYABLE);
        } else {
            cl.remove(CSS.PLAYABLE);
            cl.add(CSS.UNPLAYABLE);
        }
    }
  }

  setStatusBarForPlayState(): void {
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
  }

  onHandClicked(ev: any): boolean {
    console.log('onHandClicked', ev);
    ev.preventDefault();
    ev.stopPropagation();
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
    const selectedDiv = ev.target;
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
}


  private appendHtml(html: string, parent: Element): void {
    const div = document.createElement('div');
    div.innerHTML = html;
    const frag = document.createDocumentFragment();
    var fc: Node;

    while ((fc = div.firstChild)) { // intentional assignment
      parent.append(fc);
    }
  }

  private setupPlayerBoard(player): void {
    const playerId = player.player_id;
    console.log('Setting up board for player ' + playerId);
    this.appendHtml(this.format_block('jstpl_player_board_ext',
      {
        player_id: playerId,
        player_number: player.player_number
      }), this.getPlayerPanelElement(playerId));
    //    create counters per player
    this.handCounters[playerId] = new ebg.counter();
    this.handCounters[playerId].create(IDS.handcount(playerId));
    this.poolCounters[playerId] = new ebg.counter();
    this.poolCounters[playerId].create(IDS.poolcount(playerId));
    this.cityCounters[playerId] = new ebg.counter();
    this.cityCounters[playerId].create(IDS.citycount(playerId));
    this.updateHandCount(player, false);
    this.updatePoolCount(player, false);
    this.updateCapturedCityCount(player, false);
  }

  onUpdateActionButtons_playerTurnA(args) {
    this.addActionButton("b1", _("Play Card"), () => this.ajaxcallwrapper("playCard"));
    this.addActionButton("b2", _("Vote"), () => this.ajaxcallwrapper("playVote"));
    this.addActionButton("b3", _("Pass"), () => this.ajaxcallwrapper("pass"));
  }
  onUpdateActionButtons_playerTurnB(args) {
    this.addActionButton("b1", _("Support"), () => this.ajaxcallwrapper("playSupport"));
    this.addActionButton("b2", _("Oppose"), () => this.ajaxcallwrapper("playOppose"));
    this.addActionButton("b3", _("Wait"), () => this.ajaxcallwrapper("playWait"));
  }

  setupNotifications(): void {
    for (var m in this) {
      if (typeof this[m] == "function" && m.startsWith("notif_")) {
        dojo.subscribe(m.substring(6), this, m);
      }
    }
  }

  notif_message(notif: any): void {
    console.log("notif", notif);
  }
}
