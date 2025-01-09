interface RowCol { row: number, col: number };
interface TopLeft { top: number, left: number };
interface Player {
  player_id: number;
  hand_size: number;
  pool_size: number;
  captured_city_count: number;
  score: number;
  player_name: string;
  player_color: string;
  player_number: number;
}

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


const special_log_args = {
  zcard: {
    tmpl: 'jstpl_log_zcard',
    tmplargs: (a:any) => a
  },
  city: {
    tmpl: 'jstpl_log_city',
    tmplargs: (a:any) => a
  },
  piece: {
    tmpl: 'jstpl_log_piece',
    tmplargs: (a:any) => a
  },
  original_piece: {
    tmpl: 'jstpl_log_piece',
    tmplargs: (args:any) => Object.assign(
      Object.assign({}, args),
      {
        piece: args['original_piece'],
        player_number: args['player_number']
      }
    )
  }
};

interface Zcard {
  type: string;
  used: boolean;
  tooltip: string;
  owning_player_id: number;
}

/** Game class */
class GameBody extends GameBasics {
  private playerNumber: number;
  private hand: string[] = [];
  private handCounters: Counter[] = [];
  private poolCounters: Counter[] = [];
  private cityCounters: Counter[] = [];
  private zcards: Zcard[] = [];
  private animationManager: AnimationManager;
  private selectedHandPos: number | null;
  private readonly pieceClasses = ['priest', 'servant', 'farmer', 'merchant'];
  private lastId: number;

  private animating = false;

  constructor() {
    super();
    this.animationManager = new AnimationManager(this);
  }

  private async play(anim: BgaAnimation<any>): Promise<void> {
    this.animating = true;
    return this.animationManager.play(anim)
      .then(() => { this.animating = false; });
  }

  private pausable(f: (a: any) => void): any {
    return (e: any) => {
      if (!this.animating) {
        f(e);
      }
    };
  }

  private addPausableHandler(e: EventTarget, type: string, handler: (a: any) => void): void {
    e.addEventListener(type, this.pausable(handler));
  }

  private setupHandlers(): void {
    this.addPausableHandler($(IDS.HAND), 'click', this.onHandClicked.bind(this));
    this.addPausableHandler($(IDS.BOARD), 'click', this.onBoardClicked.bind(this));
    this.addPausableHandler($(IDS.AVAILABLE_ZCARDS), 'click', this.onZcardClicked.bind(this));
  }

  protected override setup(gamedatas) {
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

    console.log("setting up handlers");
    this.setupHandlers();

    this.bgaSetupPromiseNotifications();
    console.log('Game setup done');
  }

  private hexLocation(hex: RowCol): TopLeft {
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

  private setupGameBoard(boardData, playersData): void {
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

  private setupAvailableZcards(zcards: Zcard[]): void {
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

  private addZcardDivInPlayerBoard(z: number) {
    this.addZigguratCardDiv(
      IDS.ownedZcard(z),
      IDS.playerBoardZcards(this.zcards[z].owning_player_id),
      z
    );
  }

  private indexOfZcard(cardType: string): number {
    for (var z = 0; z < this.zcards.length; ++z) {
      if (this.zcards[z].type == cardType) {
        return z;
      }
    }
    return -1;
  }

  private addZigguratCardDiv(id, parentElem, z): void {
    const cls = CSS.zcard(this.zcards[z].type, this.zcards[z].used);
    const div = this.appendHtml(`<div id='${id}' class='${cls}'></div>`,
      parentElem);
    this.addTooltip(id, this.zcards[z].tooltip, '');
    // div.title = this.zcards[z].tooltip;
  }

  private setupGameHtml(): void {
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

  private updateCounter(counter: Counter, value: number, animate: boolean) {
    if (animate) {
      counter.toValue(value);
    } else {
      counter.setValue(value);
    }
  }

  private updateHandCount(player: Player, animate: boolean = true) {
    this.updateCounter(this.handCounters[player.player_id],
      player.hand_size,
      animate);
  }

  private updatePoolCount(player: Player, animate: boolean = true) {
    this.updateCounter(this.poolCounters[player.player_id],
      player.pool_size,
      animate);
  }

  private updateCapturedCityCount(player: Player, animate: boolean = true) {
    this.updateCounter(this.cityCounters[player.player_id],
      player.captured_city_count,
      animate);
  }

  private hexDiv(rc: RowCol): HTMLElement {
    return $(IDS.hexDiv(rc));
  }

  private handPosDiv(i: number): HTMLElement {
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

  private renderPlayedPiece(rc: RowCol, piece: string, playerNumber: number) {
    this.hexDiv(rc).className = CSS.piece(piece, playerNumber);
  }

  private renderHand(): void {
    for (let i = 0; i < this.hand.length; ++i) {
      this.handPosDiv(i).className = CSS.handPiece(this.hand[i], this.playerNumber);
    }
  }

  // Returns the hex (row,col) clicked on, or null if not a playable hex
  private selectedHex(target: EventTarget): RowCol | null {
    let e = target as Element;
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
      row: Number(id[2]),
      col: Number(id[3]),
    };
  }

  private selectHexToScore(event: PointerEvent) {
    const hex = this.selectedHex(event.target);
    if (hex == null) {
      return;
    }
    // console.log('selected hex ' + hex.row + ',' + hex.col);
    const rc = {
      row: hex.row,
      col: hex.col
    };
    this.bgaPerformAction('actSelectHexToScore', rc).then(() => {
    });
    this.unmarkHexPlayable(rc);
  }

  private playSelectedPiece(event: PointerEvent): void {
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
    }).then(() => {
      this.unmarkHexPlayable({
        row: hex.row,
        col: hex.col
      });
    });
    this.unselectAllHandPieces();
  }

  private onBoardClicked(event: PointerEvent): boolean {
    console.log('onBoardClicked:' + (event.target as Element).id);
    event.preventDefault();
    event.stopPropagation();
    if (!this.isCurrentPlayerActive()) {
      return false;
    }
    switch (this.currentState) {
      case 'client_pickHexToPlay':
        this.playSelectedPiece(event);
        break;
      case 'selectHexToScore':
        // this.selectHexToScore(event);
        break;
    }
    return false;
  }

  private onZcardClicked(event: PointerEvent): boolean {
    console.log('onZcardClicked', event);
    event.preventDefault();
    event.stopPropagation();
    if (!this.isCurrentPlayerActive()) {
      return false;
    }
    if (this.currentState != 'selectZigguratCard') {
      return false;
    }
    const tid = (event.target as Element).id;

    let z = -1;
    for (var i = 0; i < this.zcards.length; ++i) {
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
  }

  private allowedMovesFor(pos: number): RowCol[] {
    const piece = this.hand[pos];
    if (piece == null) {
      return [];
    }
    return this.stateArgs.allowedMoves[piece] || [];
  }

  private markHexPlayable(rc: RowCol): void {
    this.hexDiv(rc).classList.add(CSS.PLAYABLE);
  }

  private unmarkHexPlayable(rc: RowCol): void {
    this.hexDiv(rc).classList.remove(CSS.PLAYABLE);
  }

  private markScoreableHexesPlayable(hexes: RowCol[]): void {
    hexes.forEach(rc => this.markHexPlayable(rc));
  }

  private markHexesPlayableForPiece(pos: number): void {
    this.allowedMovesFor(pos).forEach(rc => this.markHexPlayable(rc));
  }

  private unmarkHexesPlayableForPiece(pos: number): void {
    this.allowedMovesFor(pos).forEach(rc => this.unmarkHexPlayable(rc));
  }

  private unselectAllHandPieces(): void {
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

  private setPlayablePieces(): void {
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

  private setStatusBarForPlayState(): void {
    if (!this.isCurrentPlayerActive()) {
      return;
    }
    this.selectedHandPos = null;
    if (this.stateArgs.canEndTurn) {
      if (this.stateArgs.allowedMoves.length == 0) {
        this.setClientState('client_noPlaysLeft', {
          descriptionmyturn: _('${you} must end your turn'),
        });
      } else {
        this.setClientState('client_selectPieceOrEndTurn', {
          descriptionmyturn: _('${you} may select a piece to play or end your turn'),
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
        descriptionmyturn: _('${you} must select a piece to play'),
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

  private onHandClicked(ev: PointerEvent): boolean {
    console.log('onHandClicked', ev);
    ev.preventDefault();
    ev.stopPropagation();
    if (this.inFlight > 0) {
      return false;
    }
    if (!this.isCurrentPlayerActive()) {
      return false;
    }
    if (this.currentState != 'client_selectPieceOrEndTurn'
      && this.currentState != 'client_pickHexToPlay'
      && this.currentState != 'client_mustSelectPiece') {
      return false;
    }
    const selectedDiv = ev.target as HTMLElement;
    if (selectedDiv.parentElement.id != IDS.HAND) {
      return false;
    }
    const handpos = Number(selectedDiv.id.split('_')[2]);
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
      if (this.currentState != 'client_pickHexToPlay') {
        this.setClientState('client_pickHexToPlay', {
          descriptionmyturn: _('${you} must select a hex to play to'),
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
    dojo.place(html, parent);

    // const div = document.createElement('div');
    // div.innerHTML = html;
    // const frag = document.createDocumentFragment();
    // var fc: Node;

    // while ((fc = div.firstChild)) { // intentional assignment
    //   parent.append(fc);
    // }
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

  private onUpdateActionButtons_chooseExtraTurn(args: any): void {
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
  }
  private onUpdateActionButtons_endOfTurnScoring(args: any): void {
    this.markAllHexesUnplayable();
  }

  private onUpdateActionButtons_selectZigguratCard(args: any): void {
    const div = $(IDS.AVAILABLE_ZCARDS);
    div.scrollIntoView(false);
    div.classList.add(CSS.SELECTING);
    this.updateStatusBar(_('You must select a ziggurat card'));
  }


  private onUpdateActionButtons_playPieces(args: any): void {
    this.setStatusBarForPlayState();
    this.markAllHexesUnplayable();
  }

  private onUpdateActionButtons_selectHexToScore(args: any): void {
    this.markScoreableHexesPlayable(args.hexes);
  }

  private markAllHexesUnplayable(): void {
    $(IDS.BOARD).querySelectorAll('.' + CSS.PLAYABLE)
      .forEach(div => div.classList.remove(CSS.PLAYABLE));
  }

  protected override setupNotifications(): void {
    for (var m in this) {
      if (typeof this[m] == "function" && m.startsWith("notif_")) {
        dojo.subscribe(m.substring(6), this, m);
      }
    }
  }


  private async notif_turnFinished(args: any): Promise<void> {
    console.log('notif_turnFinished', args);

    this.updateHandCount(args);
    this.updatePoolCount(args);

    return Promise.resolve();
  }

  private async notif_undoMove(args: any): Promise<void> {
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
    await this.play(new BgaSlideTempAnimation({
      className: CSS.handPiece(args.piece, args.player_number),
      fromId: IDS.hexDiv(args),
      toId: targetDivId,
      parentId: IDS.BOARD
    })).then(onDone);
  }

  private async notif_piecePlayed(args: any): Promise<void> {
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
    await this.play(new BgaSlideTempAnimation({
      className: hpc,
      fromId: sourceDivId,
      toId: this.hexDiv(args).id,
      parentId: IDS.BOARD
    })).then(onDone);
  }

  private async notif_handRefilled(args: { hand: string[] }): Promise<void> {
    console.log('notif_handRefilled', args);
    const anim = [];
    const pid = this.player_id;
    for (var i = 0; i < args.hand.length; ++i) {
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
    await this.play(new BgaCompoundAnimation({
      animations: anim,
      mode: 'sequential',
    }));
  }


  private async notif_extraTurnUsed(args: any): Promise<void> {
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
  }

  private async notif_zigguratCardSelection(args: any): Promise<void> {
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

      await this.play(new BgaSlideTempAnimation({
        className: CSS.zcard(this.zcards[z].type, false),
        fromId: id,
        toId: IDS.playerBoardZcards(args.player_id),
        parentId: IDS.AVAILABLE_ZCARDS,
      })).then(() => this.addZcardDivInPlayerBoard(z));
    }
  }

  private async notif_cityScored(args: any): Promise<void> {
    console.log('notif_cityScored', args);

    const anim = [];

    for (const playerId in args.details) {
      const details = args.details[playerId];
      const nonscoringLocations = [];
      for (const nh of details.network_locations) {
        if (!details.scored_locations.some(
          sh => (nh.row == sh.row && nh.col == sh.col))) {
          nonscoringLocations.push(nh);
        }
      }
      anim.push(new BgaCompoundAnimation({
        mode: 'parallel',
        animationStart: () => {
          for (const rc of details.scored_locations) {
            this.hexDiv(rc).classList.add(CSS.SELECTED);
          }
        },
        animations: details.network_locations.map(
          rc => new BgaFadeAnimation({
            element: this.hexDiv(rc),
            duration: 1400,
            kind: 'outin',
            iterations: 2,
          })
        ),
      }));

      anim.push(new BgaCompoundAnimation({
        mode: 'parallel',
        animations: nonscoringLocations.map(
          rc => new BgaFadeAnimation({
            element: this.hexDiv(rc),
            duration: 500,
            kind: 'out',
          })
        ),
      }));

      // TODO: should be spin/grow with score
      anim.push(new BgaSpinGrowAnimation({
        className: '',
        text: `+${details.network_points}`,
        centeredOnId: IDS.hexDiv(args),
        parentId: IDS.BOARD,
        color: '#' + this.gamedatas.players[playerId].player_color,
        duration: 2500,
      }));

      anim.push(new BgaCompoundAnimation({
        mode: 'parallel',
        animations: nonscoringLocations.map(
          rc => new BgaFadeAnimation({
            element: this.hexDiv(rc),
            duration: 500,
            kind: 'in',
          })
        ),
        animationEnd: () => {
          details.scored_locations.forEach(
            rc => this.hexDiv(rc).classList.remove(CSS.SELECTED));
          this.scoreCtrl[playerId].incValue(details.network_points);
        },
      }));
    }

    anim.push(new BgaSlideTempAnimation({
      animationStart:
        () => {
          this.renderPlayedPiece(args, null, null);
        },
      animationEnd:
        () => {
          this.renderPlayedPiece(args, null, null);
          for (const playerId in args.details) {
            const details = args.details[playerId];
            this.scoreCtrl[playerId].incValue(details.capture_points);
            this.updateCapturedCityCount(details);
          }
        },
      className: CSS.piece(args.city),
      fromId: IDS.hexDiv(args),
      toId: (args.captured_by != 0)
        ? IDS.citycount(args.captured_by)
        // TODO: find a better location for 'off the board'
        : IDS.AVAILABLE_ZCARDS,
      parentId: IDS.BOARD,
    }));
    await this.play(new BgaCompoundAnimation({
      mode: 'sequential',
      animations: anim,
    }));
  }


  ///////

  /* @Override */
  protected override format_string_recursive(log: string, args: any): string {
    const defargs = (key:string) => { return { [key]: args[key] } };
    const saved = {};
    const defModify = (x:any) => x;
    try {
      if (log && args && !args.processed) {
        args.processed = true;
        for (const key of Object.keys(special_log_args)) {
          if (key in args) {
            saved[key] = args[key];
            const s = special_log_args[key];
            args[key] = this.format_block(
              s.tmpl,
              s.tmplargs(args)
            );
          }
        }
      }
    } catch (e) {
      console.error(log, args, 'Exception thrown', e.stack);
    }
    try {
      return this.inherited(arguments);
    } finally {
      for (const i in saved) {
        args[i] = saved[i];
      }
    }
  }
}
