interface RowCol { row: number, col: number };
interface PlayerData {
  player_id: number;
  hand_size: number;
  pool_size: number;
  captured_city_count: number;
  score: number;
  color: string;
}
interface Hex extends RowCol {
  board_player: number;
  piece: string;
}

class Attrs {
  static readonly ZTYPE = 'bbl_ztype';
  static readonly PIECE = 'bbl_piece';
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
    return `bbl_handcount_${playerId}`;
  }

  static poolcount(playerId: number): string {
    return `bbl_poolcount_${playerId}`;
  }

  static citycount(playerId: number): string {
    return `bbl_citycount_${playerId}`;
  }

  static hexDiv(rc: RowCol): string {
    return `bbl_hex_${rc.row}_${rc.col}`;
  }

  static playerBoardZcards(playerId: number): string {
    return `bbl_zcards_${playerId}`;
  }

  static ownedZcard(type: string): string {
    return `bbl_owned_zig_${type}`;
  }

  static availableZcard(type: string): string {
    return `bbl_available_zig_${type}`;
  }
}

class CSS {
  static readonly SELECTING = 'bbl_selecting';
  static readonly SELECTED = 'bbl_selected';
  static readonly PLAYABLE = 'bbl_playable';
  static readonly UNPLAYABLE = 'bbl_unplayable';
}

class Html {
  readonly hstart = 38.0; // this is related to board width but not sure how
  readonly vstart = 9.0; // depends on board size too
  readonly height = 768 / 12.59;
  readonly width = this.height * 1.155;
  readonly hdelta = 0.75 * this.width + 2.0;
  readonly vdelta = 1.0 * this.height + 2.0;

  constructor(private colorIndexMap: Record<number, number>) {}

  public hex(rc: RowCol): string {
    let top = this.vstart + rc.row * this.vdelta / 2;
    let left = this.hstart + rc.col * this.hdelta;

    return `<div id='${IDS.hexDiv(rc)}' style='top:${top}px; left:${left}px;'></div>`;
  }

  public emptyHandPiece(id: string): string {
    return `<div id='${id}'/>`;
  }

  public player_board_ext(player_id: number): string {
    let color_index = this.colorIndexMap[player_id];
    return `
      <div>
        <span class='bbl_pb_hand_label_${color_index}'></span>
        <span id='${IDS.handcount(player_id)}'>5</span>
      </div>
      <div>
        <span class='bbl_pb_pool_label_${color_index}'></span>
        <span id='${IDS.poolcount(player_id)}'>19</span>
      </div>
      <div>
        <span class='bbl_pb_citycount_label'></span>
        <span id='${IDS.citycount(player_id)}'>1</span>
      </div>
      <div id='${IDS.playerBoardZcards(player_id)}' class='bbl_pb_zcards'>
        <span class='bbl_pb_zcard_label'></span>
      </div>
`;
  }

  public base_html(): string {
    return `
    <div id='bbl_main'>
      <div id='bbl_hand_container'>
        <div id='${IDS.HAND}'></div>
      </div>
      <div id='${IDS.BOARD_CONTAINER}'>
        <div id='${IDS.BOARD}'></div>
        <span id='bbl_vars'></span>
      </div>
      <div id='${IDS.AVAILABLE_ZCARDS}'></div>
   </div>
`;
  }
}

interface Zcard {
  type: string;
  used: boolean;
  tooltip: string;
  owning_player_id: number;
}

interface Gamedatas {
  player_data: PlayerData[];
  players: Player[];
  board: Hex[];
  hand: string[];
  ziggurat_cards: Zcard[];
}

interface PlayState {
  canEndTurn: boolean;
  canUndo: boolean;
  allowedMoves: RowCol[];
}

/** Game class */
class GameBody extends GameBasics<Gamedatas> {
  private hand: string[] = [];
  private handCounters: Counter[] = [];
  private poolCounters: Counter[] = [];
  private cityCounters: Counter[] = [];
  private zcards: Zcard[] = [];
  private animationManager: AnimationManager;
  private selectedHandPos: number | null = null;
  private playStateArgs: PlayState | null = null;
  private animating = false;
  private html: Html = new Html({});
  private playerIdToColorIndex: Record<number, number> = {};

  constructor() {
    super();
    this.animationManager = new AnimationManager(this);
    this.handCounters = [];
    this.hand = [];
  }

  private async play(anim: BgaAnimation<any>): Promise<void> {
    this.animating = true;
    return this.animationManager.play(anim)
      .then(() => { this.animating = false; });
  }

  private addPausableHandler(et: EventTarget, type: string, handler: (a: Event) => boolean): void {
    et.addEventListener(type, (e: Event) => { if (this.animating) return true; return handler(e); });
  }

  private setupHandlers(): void {
    this.addPausableHandler($(IDS.HAND), 'click', this.onHandClicked.bind(this));
    this.addPausableHandler($(IDS.BOARD), 'click', this.onBoardClicked.bind(this));
    this.addPausableHandler($(IDS.AVAILABLE_ZCARDS), 'click', this.onZcardClicked.bind(this));
  }

  override setup(gamedatas: Gamedatas) {
    console.log(gamedatas);
    super.setup(gamedatas);

    for (const playerId in gamedatas.players) {
      this.playerIdToColorIndex[playerId] = colorIndexMap[gamedatas.players[playerId]!.color]!;
    }
    this.html = new Html(this.playerIdToColorIndex);

    this.setupGameHtml();

    console.log('setting the the game board');
    this.setupGameBoard(gamedatas.board, gamedatas.player_data);

    console.log('setting up player boards', gamedatas.player_data);
    for (const playerId in gamedatas.player_data) {
      this.setupPlayerBoard(gamedatas.player_data[playerId]!);
    }

    console.log('setting up player hand');
    this.hand = gamedatas.hand;
    this.renderHand();

    this.setupAvailableZcards(gamedatas.ziggurat_cards);

    console.log('setting up handlers');
    this.setupHandlers();

    this.bgaSetupPromiseNotifications();
    console.log('Game setup done');
  }

  private setupGameBoard(boardData: Hex[], playersData: PlayerData[]): void {
    const boardDiv = $(IDS.BOARD);
    // console.log(gamedatas.board);

    for (const hex of boardData) {
      boardDiv.insertAdjacentHTML('beforeend', this.html.hex(hex));

      if (hex.piece != null) {
        if (hex.board_player == 0) {
          this.renderCityOrField(hex, hex.piece);
        } else {
          this.renderPlayedPiece(hex, hex.piece, hex.board_player);
        }
      }
    }
  }

  private setupAvailableZcards(zcards: Zcard[]): void {
    console.log('Setting up available ziggurat cards', zcards);
    this.zcards = zcards;
    for (let zcard of this.zcards) {
      const id = IDS.availableZcard(zcard.type);
      const ztype = zcard.used ? 'used' : zcard.type;
      // TODO: make and use a 'createDiv' method
      if (zcard.owning_player_id != 0) {
        this.addZcardDivInPlayerBoard(zcard);
        // also 'shell' in available cards
        $(IDS.AVAILABLE_ZCARDS).insertAdjacentHTML('beforeend', `<div id='${id}'></div>`);
      } else {
        // just in available cards
        $(IDS.AVAILABLE_ZCARDS).insertAdjacentHTML('beforeend', `<div id='${id}' ${Attrs.ZTYPE}='${ztype}'></div>`);
        this.addTooltip(id, zcard.tooltip, '');
      }
    }
  }

  private addZcardDivInPlayerBoard(zcard: Zcard) {
    const id = IDS.ownedZcard(zcard.type);
    const ztype = zcard.used ? 'used' : zcard.type;
    $(IDS.playerBoardZcards(zcard.owning_player_id)).insertAdjacentHTML('beforeend', `<div id='${id}' ${Attrs.ZTYPE}='${ztype}'></div>`);
    this.addTooltip(id, zcard.tooltip, '');
  }

  private zcardForType(cardType: string): Zcard {
    for (let z of this.zcards) {
      if (z.type == cardType) {
        return z;
      }
    }
    throw new Error(`Zcard type ${cardType} not found`);
  }

  private setupGameHtml(): void {
    $('game_play_area').insertAdjacentHTML('beforeend', this.html.base_html());
  }

  private updateCounter(counter: Counter, value: number, animate: boolean) {
    if (animate) {
      counter.toValue(value);
    } else {
      counter.setValue(value);
    }
  }

  private updateHandCount(player: { player_id: number; hand_size: number; }, animate: boolean = true) {
    console.log('update hand count', player, this.handCounters[player.player_id]);
    this.updateCounter(this.handCounters[player.player_id]!,
      player.hand_size,
      animate);
  }

  private updatePoolCount(player: { player_id: number; pool_size: number }, animate: boolean = true) {
    this.updateCounter(this.poolCounters[player.player_id]!,
      player.pool_size,
      animate);
  }

  private updateCapturedCityCount(player: { player_id: number; captured_city_count: number }, animate: boolean = true) {
    this.updateCounter(this.cityCounters[player.player_id]!,
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
        hand.insertAdjacentHTML('beforeend', this.html.emptyHandPiece(id));
      }
    }
    return $(id);
  }

  private renderCityOrField(rc: RowCol, piece: string): void {
    this.setPiece(this.hexDiv(rc), piece, 0);
  }

  private pieceVal(piece: string, playerId: number): string {
    return playerId > 0 ? piece + '_' + this.playerIdToColorIndex[playerId] : piece;
  }

  private pieceAttr(piece: string, playerId: number): Record<string, string> {
    let v = {};
    v[Attrs.PIECE] = this.pieceVal(piece, playerId);
    return v;
  }

  private setPiece(e: Element, piece: string, playerId: number) {
    e.setAttribute(Attrs.PIECE, this.pieceVal(piece, playerId));
  }

  private renderPlayedPiece(rc: RowCol, piece: string, playerId: number) {
    this.setPiece(this.hexDiv(rc), piece, playerId);
  }

  private renderHand(): void {
    for (let i = 0; i < this.hand.length; ++i) {
      this.setPiece(this.handPosDiv(i), this.hand[i]!, this.player_id);
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
    if (!e.classList.contains(CSS.PLAYABLE)) {
      // console.log('not playable');
      return null;
    }
    const id = e.id.split('_');
    return {
      row: Number(id[2]),
      col: Number(id[3]),
    };
  }

  private selectHexToScore(event: Event) {
    const hex = this.selectedHex(event.target!);
    if (hex == null) {
      return;
    }
    // console.log('selected hex ' + hex.row + ',' + hex.col);
    this.bgaPerformAction('actSelectHexToScore', hex).then(() => {
    });
    this.unmarkHexPlayable(hex);
  }

  private playSelectedPiece(event: Event): void {
    if (this.selectedHandPos == null) {
      console.error('no piece selected!');
    }

    const hex = this.selectedHex(event.target!);
    if (hex == null) {
      return;
    }
    // console.log('selected hex ' + hex.row + ',' + hex.col);

    this.bgaPerformAction('actPlayPiece', {
      handpos: this.selectedHandPos,
      row: hex.row,
      col: hex.col
    }).then(() => {
      this.unmarkHexPlayable(hex);
    });
    this.unselectAllHandPieces();
  }

  private onBoardClicked(event: Event): boolean {
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
        this.selectHexToScore(event);
        break;
    }
    return false;
  }

  private onZcardClicked(event: Event): boolean {
    console.log('onZcardClicked', event);
    event.preventDefault();
    event.stopPropagation();
    if (!this.isCurrentPlayerActive()) {
      return false;
    }
    if (this.currentState != 'selectZigguratCard') {
      return false;
    }
    const elem = event.target as Element;
    const tid = elem.id;
    let type = elem.getAttribute(Attrs.ZTYPE);
    if (type == null) {
      console.error(`Could not find ${Attrs.ZTYPE} attribute in clicked card ${elem}`);
      return true;
    }
    for (let zc of this.zcards) {
      if (zc.type == type) {
        this.bgaPerformAction('actSelectZigguratCard', { zctype: zc.type });
        const div = $(IDS.AVAILABLE_ZCARDS);
        div.classList.remove(CSS.SELECTING);
        return false;
      }
    }
    console.error(`Unknown zcard type ${type}`);
    return true;
  }

  private allowedMovesFor(pos: number): RowCol[] {
    const piece = this.hand[pos]!;
    return (this.playStateArgs!.allowedMoves as any)[piece] || [];
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
    for (let p = 0; p < this.hand.length; ++p) {
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
    for (let p = 0; p < this.hand.length; ++p) {
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
    if (this.playStateArgs == null) {
      console.error('playStateArgs unexpectedly null');
      return;
    }
    this.selectedHandPos = null;
    if (this.playStateArgs.canEndTurn) {
      if (this.playStateArgs.allowedMoves.length == 0) {
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
    if (this.playStateArgs.canUndo) {
      this.addActionButton(
        'undo-btn',
        'Undo',
        () => this.bgaPerformAction('actUndoPlay')
      );
    }
  }

  private onHandClicked(ev: Event): boolean {
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
    if (selectedDiv.parentElement!.id != IDS.HAND) {
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

  private setupPlayerBoard(player: PlayerData): void {
    const playerId = player.player_id;
    console.log('Setting up board for player ' + playerId);
    this.getPlayerPanelElement(playerId)
        .insertAdjacentHTML('beforeend', this.html.player_board_ext(playerId));
    //    create counters per player
    this.handCounters[playerId] = new ebg.counter();
    this.handCounters[playerId]!.create(IDS.handcount(playerId));
    this.poolCounters[playerId] = new ebg.counter();
    this.poolCounters[playerId]!.create(IDS.poolcount(playerId));
    this.cityCounters[playerId] = new ebg.counter();
    this.cityCounters[playerId]!.create(IDS.citycount(playerId));
    this.updateHandCount(player, false);
    this.updatePoolCount(player, false);
    this.updateCapturedCityCount(player, false);
  }

  private onUpdateActionButtons_chooseExtraTurn(): void {
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
  private onUpdateActionButtons_endOfTurnScoring(): void {
    this.markAllHexesUnplayable();
  }

  private onUpdateActionButtons_selectZigguratCard(): void {
    const div = $(IDS.AVAILABLE_ZCARDS);
    div.scrollIntoView(false);
    div.classList.add(CSS.SELECTING);
    this.updateStatusBar(_('You must select a ziggurat card'));
  }

  private onUpdateActionButtons_playPieces(args: PlayState): void {
    this.playStateArgs = args;
    this.setStatusBarForPlayState();
    this.markAllHexesUnplayable();
  }

  private onUpdateActionButtons_selectHexToScore(args: {hexes: RowCol[]}): void {
    this.markScoreableHexesPlayable(args.hexes);
  }

  private markAllHexesUnplayable(): void {
    $(IDS.BOARD).querySelectorAll('.' + CSS.PLAYABLE)
      .forEach(div => div.classList.remove(CSS.PLAYABLE));
  }

  private async notif_turnFinished(
      args: {
        player_id: number;
        hand_size: number;
        pool_size: number;
      }
    ): Promise<void> {
    console.log('notif_turnFinished', args);

    this.updateHandCount(args);
    this.updatePoolCount(args);

    return Promise.resolve();
  }

  private async notif_undoMoveActive(
    args: {
      player_id: number;
      points: number;
      handpos: number;
      row: number;
      col: number;
      original_piece: string;
      captured_piece: string;
      piece: string;
    }
  ): Promise<void> {
    console.log('notif_undoMove', args);
    if (this.player_id != args.player_id) {
      console.error('Non-active player got the undoMoveActive notification, ignoring');
      return Promise.resolve();
    }

    this.hand[args.handpos] = args.original_piece;
    let handPosDiv = this.handPosDiv(args.handpos);

    // Put any piece (field) captured in the move back on the board
    // TODO: animate this? (and animate the capture too?)
    this.renderCityOrField(args, args.captured_piece);
    const onDone =
      () => {
        this.setPiece(handPosDiv!, args.original_piece, this.player_id);
        handPosDiv.classList.add(CSS.PLAYABLE);
        this.handCounters[args.player_id]!.incValue(1);
        this.scoreCtrl[args.player_id]!.incValue(-args.points);
      };
    await this.play(new BgaSlideTempAnimation({
      attrs: this.pieceAttr(args.piece, args.player_id),
      fromId: IDS.hexDiv(args),
      toId: handPosDiv.id,
      parentId: IDS.BOARD
    })).then(onDone);
  }

  private async notif_undoMove(
    args: {
      player_id: number;
      points: number;
      handpos: number;
      row: number;
      col: number;
      original_piece: string;
      captured_piece: string;
      piece: string;
    }
  ): Promise<void> {
    if (this.player_id == args.player_id) {
      // active player also gets the richer `undoMoveActive` notification, so ignore this.
      return Promise.resolve();
    }

    // Put any piece (field) captured in the move back on the board
    // TODO: animate this? (and animate the capture too?)
    this.renderCityOrField(args, args.captured_piece);
    const onDone =
      () => {
        this.handCounters[args.player_id]!.incValue(1);
        this.scoreCtrl[args.player_id]!.incValue(-args.points);
      };
    await this.play(new BgaSlideTempAnimation({
      attrs: this.pieceAttr(args.piece, args.player_id),
      fromId: IDS.hexDiv(args),
      toId: IDS.handcount(args.player_id),
      parentId: IDS.BOARD
    })).then(onDone);
  }

  private async handleUndoMove(
    args: {
      player_id: number;
      points: number;
      handpos: number;
      row: number;
      col: number;
      original_piece: string;
      captured_piece: string;
      piece: string;
    }
  ): Promise<void> {
 }

  private async notif_piecePlayed(
      args: {
        player_id: number;
        points: number;
        piece: string;
        handpos: number;
        row: number;
        col: number;
        hand_size: number;
      }
    ): Promise<void> {
    console.log('notif_piecePlayed', args);
    const isActive = this.player_id == args.player_id;
    let sourceDivId = IDS.handcount(args.player_id);
    if (isActive) {
      this.hand[args.handpos] = 'empty';
      const handPosDiv = this.handPosDiv(args.handpos);
      this.setPiece(handPosDiv, 'empty', 0);
      sourceDivId = handPosDiv.id;
    }
    const onDone =
      () => {
        this.renderPlayedPiece(args,
          args.piece,
          args.player_id);
        this.updateHandCount(args);
        this.scoreCtrl[args.player_id]!.incValue(args.points);
      };
    await this.play(new BgaSlideTempAnimation({
      attrs: this.pieceAttr(args.piece, args.player_id),
      fromId: sourceDivId,
      toId: this.hexDiv(args).id,
      parentId: IDS.BOARD
    })).then(onDone);
  }

  private async notif_handRefilled(args: { hand: string[] }): Promise<void> {
    console.log('notif_handRefilled', args);
    const anim: BgaAnimation<any>[] = [];
    const pid = this.player_id;
    for (let i = 0; i < args.hand.length; ++i) {
      // extend hand if zig tile just acquired
      if (i >= this.hand.length || this.hand[i] == 'empty') {
        this.hand[i] = args.hand[i]!;
      } else if (this.hand[i] != args.hand[i]) {
        console.error(`hand from args ${args.hand[i]} not matches hand ${this.hand[i]}`)
      }
      const div = this.handPosDiv(i);
      if (div.getAttribute(Attrs.PIECE) == 'empty') { // && incoming piece is not empty?
        const a = new BgaSlideTempAnimation({
          attrs: this.pieceAttr(this.hand[i]!, this.player_id),
          fromId: IDS.handcount(pid),
          toId: div.id,
          parentId: IDS.BOARD,
          animationEnd: () => { this.setPiece(div, this.hand[i]!, this.player_id); },
        });
        anim.push(a);
      }
    }
    await this.play(new BgaCompoundAnimation({
      animations: anim,
      mode: 'sequential',
    }));
  }

  private async notif_extraTurnUsed(args: { card: string; used: boolean; }): Promise<void> {
    console.log('notif_extraTurnUsed', args);
    const zcard = this.zcardForType(args.card);
    zcard.used = args.used;
    const carddiv = $(IDS.ownedZcard(zcard.type));
    if (carddiv == undefined) {
      console.error(`Could not find div for owned ${args.card} card`, zcard);
    } else {
      carddiv.setAttribute(Attrs.ZTYPE, 'used');
    }
    return Promise.resolve();
  }

  private async notif_zigguratCardSelection(
      args: {
        zcard: string;
        player_id: number;
        cardused: boolean;
        score: number;
      }
    ): Promise<void> {
    console.log('notif_zigguratCardSelection', args);
    const zcard = this.zcardForType(args.zcard);
    zcard.owning_player_id = args.player_id;
    zcard.used = args.cardused;
    this.scoreCtrl[args.player_id]!.toValue(args.score);

    const id = IDS.availableZcard(zcard.type);

    // mark the available zig card spot as 'taken'
    $(id).removeAttribute(Attrs.ZTYPE);
    this.removeTooltip(id);

    let attrs = {};
    attrs[Attrs.ZTYPE] = zcard.type;
    await this.play(new BgaSlideTempAnimation({
      attrs: attrs,
      fromId: id,
      toId: IDS.playerBoardZcards(args.player_id),
      parentId: IDS.AVAILABLE_ZCARDS,
    })).then(() => this.addZcardDivInPlayerBoard(zcard));
  }

  private async notif_cityScored(
    args: {
      row: number;
      col: number;
      city: string;
      player_id: number;
      details: {
        player_id: number;
        captured_city_count: number;
        network_locations: RowCol[];
        scored_locations: RowCol[];
        network_points: number;
        capture_points: number;
      }[];
    }
  ): Promise<void> {
    console.log('notif_cityScored', args);

    const anim: BgaAnimation<any>[] = [];

    this.markHexPlayable(args);
    for (const playerId in args.details) {
      const details = args.details[playerId]!;
      const nonscoringLocations: RowCol[] = [];
      for (const nh of details.network_locations) {
        if (!details.scored_locations.some(
          sh => (nh.row == sh.row && nh.col == sh.col))) {
          nonscoringLocations.push(nh);
        }
      }
      anim.push(new BgaCompoundAnimation({
        mode: 'parallel',
        animationStart: () => {
          details.scored_locations.forEach(
            (rc) => this.hexDiv(rc).classList.add(CSS.SELECTED));
        },
        animations: details.network_locations.map(
          rc => new BgaFadeAnimation({
            element: this.hexDiv(rc),
            duration: 1000,
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
            duration: 400,
            kind: 'out',
          })
        ),
      }));

      anim.push(new BgaSpinGrowAnimation({
        className: 'bbl_city_scoring',
        text: `+${details.network_points}`,
        centeredOnId: IDS.hexDiv(args),
        parentId: IDS.BOARD,
        fontSize: 72,
        color: '#' + this.gamedatas.players[details.player_id]!.color,
        duration: 1200,
      }));

      anim.push(new BgaCompoundAnimation({
        mode: 'parallel',
        animations: nonscoringLocations.map(
          rc => new BgaFadeAnimation({
            element: this.hexDiv(rc),
            duration: 400,
            kind: 'in',
          })
        ),
        animationEnd: () => {
          details.scored_locations.forEach(
            (rc) => this.hexDiv(rc).classList.remove(CSS.SELECTED));
          this.scoreCtrl[details.player_id]!.incValue(details.network_points);
        },
      }));
    }

    anim.push(new BgaSlideTempAnimation({
      animationStart:
        () => {
          this.renderCityOrField(args, '');
        },
      animationEnd:
        () => {
          this.renderCityOrField(args, '');
          this.unmarkHexPlayable(args);
          for (const playerId in args.details) {
            const details = args.details[playerId]!;
            this.scoreCtrl[playerId]!.incValue(details.capture_points);
            this.updateCapturedCityCount(details);
          }
        },
      attrs: this.pieceAttr(args.city, 0),
      // className: this.css.cityOrField(args.city),
      fromId: IDS.hexDiv(args),
      toId: (args.player_id != 0)
        ? IDS.citycount(args.player_id)
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
  readonly special_log_args = {
    piece: (args: any) => `<span class='log-element' ${Attrs.PIECE}='${this.pieceVal(args.piece, args.player_id)}'></span>`,
    city: (args: any) => `<span class='log-element' ${Attrs.PIECE}='${this.pieceVal(args.city,0)}'></span>`,
    zcard: (args: any) => `<span class='log-element' ${Attrs.ZTYPE}='${args.zcard}'></span>`,
    original_piece: (args: any) => `<span class='log-element' ${Attrs.PIECE}='${this.pieceVal(args.original_piece,args.player_id)}'></span>`,
  };

  protected bgaFormatText(log: string, origargs: any): {log: string, args: any} {
    type SpecialLogArgs = keyof typeof this.special_log_args;
    const saved: { [k in SpecialLogArgs]?: any } = {};
    let args = origargs.clone();
    try {
      if (log && args && !args.processed) {
        args.processed = true;
        for (const key in this.special_log_args) {
          if (key in args) {
            const k = key as SpecialLogArgs;
//            saved[k] = args[k];
            args[k] = this.special_log_args[k](args);
          }
        }
      }
    } catch (e: any) {
      console.error(log, args, 'Exception thrown', e.stack);
    }
    try {
      return { log, args };
    } finally {
      for (const k in saved) {
//        args[k] = saved[k as SpecialLogArgs];
      }
    }
  }
}
