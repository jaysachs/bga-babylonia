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
  static readonly ZTYPE : string = 'bbl_ztype';
  static readonly ZUSED : string = 'bbl_zused';
  static readonly PIECE : string = 'bbl_piece';
}

class Piece {
  static readonly EMPTY = 'empty'
}

class IDS {
  static readonly AVAILABLE_ZCARDS_CONTAINER: string = 'bbl_available_zcards_container';
  static readonly AVAILABLE_ZCARDS: string = 'bbl_available_zcards';
  static readonly BOARD = 'bbl_board';
  static readonly BOARD_CONTAINER = 'bbl_board_container';
  static readonly HAND = 'bbl_hand';

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

  static zcard(type: string): string {
    return `bbl_${type}`;
  }
}

class CSS {
  static readonly IN_NETWORK = 'bbl_in_network';
  static readonly SELECTING = 'bbl_selecting';
  static readonly SELECTED = 'bbl_selected';
  static readonly PLAYABLE = 'bbl_playable';
  static readonly UNPLAYABLE = 'bbl_unplayable';
  static readonly UNIMPORTANT = 'bbl_unimportant';
}

class Html {
  readonly hstart = 38.0; // this is related to board width but not sure how
  readonly vstart = 9.0; // depends on board size too
  readonly height = 768 / 12.59;
  readonly width = this.height * 1.155;
  readonly hdelta = 0.75 * this.width + 2.0;
  readonly vdelta = 1.0 * this.height + 2.0;

  constructor(private colorIndexMap: Record<number, number>) { }

  public hexDiv(rc: RowCol): HTMLElement {
    let top = this.vstart + rc.row * this.vdelta / 2;
    let left = this.hstart + rc.col * this.hdelta;
    let div = document.createElement('div') as HTMLElement;
    div.id = IDS.hexDiv(rc);
    div.style.top = `${top}px`;
    div.style.left = `${left}px`;
    // div.style = `top:${top}px; left:${left}px;`;
    return div;
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
      <div id='${IDS.AVAILABLE_ZCARDS_CONTAINER}' class="whiteblock">
        <div>${_('Ziggurat Cards')}</div>
        <div id='${IDS.AVAILABLE_ZCARDS}'></div>
      </div>
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

interface BGamedatas extends Gamedatas {
  player_data: PlayerData[];
  board: Hex[];
  hand: string[];
  ziggurat_cards: Zcard[];
  current_scoring_hex: RowCol | null;
}

interface PlayState {
  canEndTurn: boolean;
  canUndo: boolean;
  allowedMoves: RowCol[];
}

/** Game class */
class BabyloniaGame extends BaseGame<BGamedatas> {
  private handCounters: Counter[] = [];
  private poolCounters: Counter[] = [];
  private cityCounters: Counter[] = [];
  private selectedHandDiv: Element | null = null;
  private playStateArgs: PlayState | null = null;
  private html: Html = new Html({});
  private playerIdToColorIndex: Record<number, number> = {};

  private setupHandlers(): void {
    $(IDS.HAND).addEventListener('click', this.onHandClicked.bind(this));
    $(IDS.BOARD).addEventListener('click', this.onBoardClicked.bind(this));
    $(IDS.AVAILABLE_ZCARDS).addEventListener('click', this.onZcardClicked.bind(this));
  }

  override setup(gamedatas: BGamedatas) {
    console.log(gamedatas);
    super.setup(gamedatas);

    for (const playerId in gamedatas.players) {
      this.playerIdToColorIndex[playerId] = colorIndexMap[gamedatas.players[playerId]!.color]!;
    }
    this.html = new Html(this.playerIdToColorIndex);

    this.setupGameHtml();

    console.log('setting up player boards', gamedatas.player_data);
    for (const playerId in gamedatas.player_data) {
      this.setupPlayerBoard(gamedatas.player_data[playerId]!);
    }

    console.log('setting the the game board');
    this.setupGameBoard(gamedatas.board, gamedatas.player_data);

    console.log('setting up player hand', gamedatas.hand);
    gamedatas.hand.forEach((piece, i) => {
      const hpd = this.handPosDiv(i);
      if (piece && piece != Piece.EMPTY) {
        hpd.appendChild(this.createPieceDiv(piece, this.player_id));
      }
    });

    console.log('Setting up ziggurat cards', gamedatas.ziggurat_cards);
    this.setupZcards(gamedatas.ziggurat_cards);

    console.log('setting up handlers');
    this.setupHandlers();

    this.bgaSetupPromiseNotifications();

    // Active player gets their own undo notification with private data,
    //   so ignore the generic undo notification.
    this.notifqueue.setIgnoreNotificationCheck(
      'undoMove',
      (notif: any) => (notif.args.player_id == this.player_id));

    // if a ziggurat card is being chosen
    if (gamedatas.current_scoring_hex) {
      this.markHexSelected(gamedatas.current_scoring_hex);
    }

    console.log('Game setup done');
  }

  private createPieceDiv(piece: string, player_id?: number) : HTMLElement {
    let e = this.createDiv();
    e.setAttribute(Attrs.PIECE, this.pieceVal(piece, player_id || 0));
    return e;
  }

  private async setupGameBoard(boardData: Hex[], playersData: PlayerData[]): Promise<void> {
    const boardDiv = $(IDS.BOARD);

    const animateBoardInitialPlacement = true;

    if (animateBoardInitialPlacement) {
      const inParallel = true;
      const duration = inParallel ? 500 : 125;
      let anims: (() => Promise<any>)[] = [];
      for (const hex of boardData) {
        const hexDiv = this.html.hexDiv(hex);
        boardDiv.appendChild(hexDiv);
        if (hex.piece != null && hex.piece != Piece.EMPTY) {
          let pieceDiv = this.createPieceDiv(hex.piece, hex.board_player)
          if (hex.board_player == 0) {
            hexDiv.appendChild(pieceDiv);
          } else {
            anims.push(() => {
              hexDiv.appendChild(pieceDiv);
              return this.animationManager.slideIn(pieceDiv, $(IDS.handcount(hex.board_player)), { duration: duration });
            });
          }
        }
      }
      if (inParallel) {
        await this.animationManager.playParallel(anims);
      } else {
        await this.animationManager.playSequentially(anims);
      }
    } else {
      for (const hex of boardData) {
        const hexDiv = this.html.hexDiv(hex);
        boardDiv.appendChild(hexDiv);
        if (hex.piece != null && hex.piece != Piece.EMPTY) {
          let pieceDiv = this.createPieceDiv(hex.piece, hex.board_player)
          hexDiv.appendChild(pieceDiv);
        }
      }
    }
  }

  private setupZcards(zcards: Zcard[]): void {
    const available = $(IDS.AVAILABLE_ZCARDS);
    for (let zcard of zcards) {
      let nextSpot = this.createDiv();
      available.appendChild(nextSpot);
      const zelem = this.createDiv({ id: IDS.zcard(zcard.type) });
      zelem.setAttribute(Attrs.ZTYPE, zcard.type);
      if (zcard.used) {
        zelem.setAttribute(Attrs.ZUSED, "");
      }
      this.addTooltip(zelem.id, zcard.tooltip, '');
      if (zcard.owning_player_id != 0) {
        $(IDS.playerBoardZcards(zcard.owning_player_id)).appendChild(zelem);
      } else {
        nextSpot.appendChild(zelem);
      }
    }
  }

  private setupGameHtml(): void {
    this.getGameAreaElement().insertAdjacentHTML('beforeend', this.html.base_html());
  }

  private updateCounter(counter: Counter, value: number, animate: boolean) {
    if (animate) {
      counter.toValue(value);
    } else {
      counter.setValue(value);
    }
  }

  private updateHandCount(player: { player_id: number; hand_size: number; }, animate: boolean = true) {
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
    const hand = $(IDS.HAND);
    while (i >= hand.childElementCount) {
      hand.appendChild(this.createDiv());
    }
    return $(IDS.HAND).childNodes.item(i)! as HTMLElement;
  }

  private pieceVal(piece: string, playerId: number): string {
    return (playerId > 0 && piece != Piece.EMPTY)
      ? piece + '_' + this.playerIdToColorIndex[playerId]
      : piece;
  }

  // Returns the hex (row,col) clicked on, or null if not a playable hex
  private selectedHex(target: EventTarget): RowCol | null {
    let hexDiv = target as Element;
    while (hexDiv.parentElement != null && hexDiv.parentElement.id != IDS.BOARD) {
      hexDiv = hexDiv.parentElement;
    }
    if (hexDiv.parentElement == null) {
      console.warn('no hex');
      return null;
    }
    // now check if it's allowed
    if (!hexDiv.classList.contains(CSS.PLAYABLE)) {
      return null;
    }
    const id = hexDiv.id.split('_');
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
    this.setClientState('client_hexpicked', {});
    this.bgaPerformAction('actSelectHexToScore', hex).then(() => {
    });
    this.unmarkHexPlayable(hex);
    // this.markHexSelected(hex);
  }

  private playSelectedPiece(event: Event): void {
    if (!this.selectedHandDiv) {
      console.error('no piece selected!');
      return;
    }

    const hex = this.selectedHex(event.target!);
    if (hex == null) {
      console.error('no hex selected!');
      return;
    }
    this.setClientState('client_hexpicked', {});
    this.bgaPerformAction('actPlayPiece', {
      handpos: this.indexInParent(this.selectedHandDiv),
      row: hex.row,
      col: hex.col
    }).then(() => {
      this.unmarkHexPlayable(hex);
    });
    this.unselectAllHandPieces();
  }

  private onBoardClicked(event: Event): boolean {
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
    event.preventDefault();
    event.stopPropagation();
    if (!this.isCurrentPlayerActive()) {
      return false;
    }
    if (this.currentState != 'selectZigguratCard') {
      return false;
    }

    let e = event.target as HTMLElement;
    let z = e.getAttribute(Attrs.ZTYPE);
    if (!z) { return false; }
    // let c = e.parentElement!.classList;
    // if (c.contains(CSS.UNPLAYABLE)) { return false; }
    if (e.getAttribute(Attrs.ZTYPE)) {
      this.toggleZcardSelected(e);
    }
    return false;
  }

  private toggleZcardSelected(e: Element) {
    const zt = e.getAttribute(Attrs.ZTYPE);
    let addButtons = () => {
      this.pushActionBarTitle(this.format_string_recursive(
        _('Select ziggurat card ${zcard}?'), { zcard: zt }));
      this.statusBar.addActionButton(_('Confirm'),
        () => {
          this.bgaPerformAction('actSelectZigguratCard', { zctype: zt });
        },
        { autoclick: true }
      );

      this.statusBar.addActionButton(_('Cancel'), () => {
        this.toggleZcardSelected(e);
      });
    };
    let removeButtons = () => {
      this.popActionBarTitle();
      this.statusBar.removeActionButtons();
    };
    const epar = e.parentElement!;
    let alreadySelected = document.querySelector(`#${IDS.AVAILABLE_ZCARDS} > .${CSS.SELECTED}`);
    epar.classList.toggle(CSS.SELECTED);
    if (alreadySelected == null) {
      addButtons();
    } else if (alreadySelected == epar) {
      // remove confirm and cancel buttons from action bar
      removeButtons();
    } else {
      alreadySelected.classList.toggle(CSS.SELECTED);
      // buttons should already be in right state but we need to change the title bar text.
      // (We also can't reset the timer.) So we remove & add.
      removeButtons();
      addButtons();
    }
  }

  private allowedMovesFor(div: Element | null): RowCol[] {
    if (!div) { return []; }
    // Peel off player number
    const piece = div.getAttribute(Attrs.PIECE)!.split('_')[0]!;
    return (this.playStateArgs!.allowedMoves as any)[piece] || [];
  }

  private markHexPlayable(rc: RowCol): void {
    this.hexDiv(rc).classList.add(CSS.PLAYABLE);
  }

  private unmarkHexPlayable(rc: RowCol): void {
    this.hexDiv(rc).classList.remove(CSS.PLAYABLE);
  }

  private markHexSelected(rc: RowCol): void {
    this.hexDiv(rc).classList.add(CSS.SELECTED);
  }

  private unmarkHexSelected(rc: RowCol): void {
    this.hexDiv(rc).classList.remove(CSS.SELECTED);
  }

  private markHexesPlayable(hexes: RowCol[]): void {
    hexes.forEach(rc => this.markHexPlayable(rc));
  }

  private markHexesPlayableForPiece(div: Element): void {
    this.allowedMovesFor(div).forEach(rc => this.markHexPlayable(rc));
  }

  private unmarkHexesPlayableForPiece(div: Element): void {
    this.allowedMovesFor(div).forEach(rc => this.unmarkHexPlayable(rc));
  }

  private unselectAllHandPieces(): void {
    const hand = $(IDS.HAND);
    hand.childNodes.forEach((posDiv : HTMLElement) => {
      const cl = posDiv.classList;
      if (cl.contains(CSS.SELECTED)) {
        this.unmarkHexesPlayableForPiece(posDiv.firstElementChild!);
      }
      cl.remove(CSS.SELECTED);
      cl.remove(CSS.PLAYABLE);
      cl.remove(CSS.UNPLAYABLE);
    });
    this.selectedHandDiv = null;
  }

  private setPlayablePieces(): void {
    const hand = $(IDS.HAND);
    hand.childNodes.forEach((child : HTMLElement, p : number) => {
      const cl = child.classList;
      if (this.allowedMovesFor(child.firstElementChild).length > 0) {
        cl.add(CSS.PLAYABLE);
        cl.remove(CSS.UNPLAYABLE);
      } else {
        cl.remove(CSS.PLAYABLE);
        cl.add(CSS.UNPLAYABLE);
      }
    });
  }

  private setStatusBarForPlayState(): void {
    if (!this.isCurrentPlayerActive()) {
      return;
    }
    if (this.playStateArgs == null) {
      console.error('playStateArgs unexpectedly null');
      return;
    }
    this.selectedHandDiv = null;
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
      this.statusBar.addActionButton(
        _('End turn'),
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
      this.statusBar.addActionButton(
        _('Undo'),
        () => { this.setClientState('client_undo', { }); this.bgaPerformAction('actUndoPlay'); }
      );
    }
  }

  private onHandClicked(ev: Event): boolean {
    ev.preventDefault();
    ev.stopPropagation();
    if (!this.isCurrentPlayerActive()) {
      return false;
    }
    if (this.currentState != 'client_selectPieceOrEndTurn'
      && this.currentState != 'client_pickHexToPlay'
      && this.currentState != 'client_mustSelectPiece') {
      return false;
    }
    const pieceDiv = ev.target as HTMLElement;
    let p = pieceDiv.getAttribute(Attrs.PIECE);
    if (!p || p == Piece.EMPTY) { return false; }

    let parentDiv = pieceDiv.parentElement!;
    let cl = parentDiv.classList;
    if (cl.contains(CSS.UNPLAYABLE)) { return false; }
    // if (parent.parentElement!.id != IDS.HAND) {
    //   return false;
    // }

    if (this.allowedMovesFor(pieceDiv).length == 0) {
      return false;
    }
    let playable = false;
    if (!cl.contains(CSS.SELECTED)) {
      this.unselectAllHandPieces();
      this.markHexesPlayableForPiece(pieceDiv);
      playable = true;
    } else {
      this.unmarkHexesPlayableForPiece(pieceDiv);
    }
    cl.toggle(CSS.SELECTED);
    if (playable) {
      this.selectedHandDiv = parentDiv;
      if (this.currentState != 'client_pickHexToPlay') {
        this.setClientState('client_pickHexToPlay', {
          descriptionmyturn: _('${you} must select a hex to play to'),
        });
        this.statusBar.addActionButton(
          _('Cancel'),
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
    this.scoreCtrl[player.player_id]!.setValue(player.score);
  }

  private onUpdateActionButtons_chooseExtraTurn(): void {
    this.statusBar.addActionButton(
      _('Take your one-time extra turn'),
      () => this.bgaPerformAction('actChooseExtraTurn', {
        take_extra_turn: true
      }));
    this.statusBar.addActionButton(
      _('Just finish your turn'),
      () => this.bgaPerformAction('actChooseExtraTurn', {
        take_extra_turn: false
      }));
  }

  private onUpdateActionButtons_endOfTurnScoring(): void {
    this.markAllHexesUnplayable();
  }

  private onUpdateActionButtons_selectZigguratCard(): void {
    // TODO: do better than this?
    const div = $(IDS.AVAILABLE_ZCARDS);
    div.scrollIntoView(false);
    //  div.classList.add(CSS.SELECTING);
  }

  private onUpdateActionButtons_playPieces(args: PlayState): void {
    this.playStateArgs = args;
    this.setStatusBarForPlayState();
    this.markAllHexesUnplayable();
  }

  private onUpdateActionButtons_selectHexToScore(args: { hexes: RowCol[] }): void {
    this.markHexesPlayable(args.hexes);
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
    this.updateHandCount(args);
    this.updatePoolCount(args);
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
    if (this.player_id != args.player_id) {
      console.error('Non-active player got the undoMoveActive notification, ignoring');
      return Promise.resolve();
    }

    let handPosDiv = this.handPosDiv(args.handpos);

    let anims: Promise<any>[] = [];
    let hexDiv = $(IDS.hexDiv(args));
    let pieceDiv = hexDiv.firstElementChild as HTMLElement;

    // restore piece value, e.g. if it was originally hidden
    pieceDiv.setAttribute(Attrs.PIECE, this.pieceVal(args.original_piece, this.player_id));
    anims.push(this.animationManager.slideAndAttach(pieceDiv, handPosDiv));

    if (args.captured_piece != Piece.EMPTY) {
      let field = this.createPieceDiv(args.captured_piece, 0);
      hexDiv.appendChild(field);
      anims.push(this.animationManager.slideIn(field, $(IDS.handcount(args.player_id)), {}));
    }

    await this.playParallel(anims).then(() => {
      handPosDiv.classList.add(CSS.PLAYABLE);
      this.handCounters[args.player_id]!.incValue(1);
      this.scoreCtrl[args.player_id]!.incValue(-args.points);
    });
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
      console.error("active player should have undoMove filtered");
      return Promise.resolve();
    }

    let hexDiv = $(IDS.hexDiv(args));
    let anims: Promise<any>[] = [];

    if (args.captured_piece != Piece.EMPTY) {
      let field = this.createPieceDiv(args.captured_piece, 0);
      hexDiv.appendChild(field);
      anims.push(this.animationManager.slideIn(field, $(IDS.handcount(args.player_id)), {}));
    }

    anims.push(this.animationManager.slideOutAndDestroy(
      hexDiv.firstElementChild as HTMLElement,
      $(IDS.handcount(args.player_id)),
      {}
     ));

    await this.playParallel(anims).then(() => {
      this.handCounters[args.player_id]!.incValue(1);
      this.scoreCtrl[args.player_id]!.incValue(-args.points);
    });
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
      captured_piece: string;
      field_points: number;
      ziggurat_points: number;
      touched_ziggurats: RowCol[];
    }
  ): Promise<void> {
    let anims: Promise<any>[] = [];

    const hexDiv = this.hexDiv(args);

    // Check for field capture
    if (args.captured_piece != Piece.EMPTY /* .startsWith('field') */) {
      let field = hexDiv.firstElementChild as HTMLElement;
      if (!field) { // or field is not F567X
        console.error("attempt to capture a field that is not there");
      }
      // TODO: consider capturing to player board
      anims.push(this.animationManager.slideOutAndDestroy(field, $(IDS.handcount(args.player_id)), {}));
    }

    if (this.isCurrentPlayerActive()) {
      const handPosDiv = this.handPosDiv(args.handpos);
      const pieceDiv = handPosDiv.firstElementChild as HTMLElement;
      anims.push(
        this.animationManager.slideAndAttach(pieceDiv, hexDiv)
          // play into river, piece is hidden
          .then(() => pieceDiv.setAttribute(Attrs.PIECE, this.pieceVal(args.piece, this.player_id)))
      );
    } else {
      // for non-active player, need to create it first
      let div = this.createPieceDiv(args.piece, args.player_id);
      hexDiv.appendChild(div);
      anims.push(this.animationManager.slideIn(div, $(IDS.handcount(args.player_id))));
    }
    // animate the ziggurat scoring, if any
    if (args.ziggurat_points > 0) {
      args.touched_ziggurats.forEach((rc) => this.markHexSelected(rc));
      anims.push(this.playParallel(
        args.touched_ziggurats.map((rc: RowCol) =>
          this.animationManager.displayScoring(
              this.hexDiv(rc),
              1,
              this.gamedatas.players[this.player_id]!.color,
              { duration: 2000, easing: 'ease-in-out', extraClass: 'bbl_city_scoring' })
            .then(() => args.touched_ziggurats.forEach((rc) => this.unmarkHexSelected(rc))))
      ));
    }

    await this.playParallel(anims);

    this.updateHandCount(args);
    this.scoreCtrl[args.player_id]!.incValue(args.points);
  }

  private async notif_handRefilled(args: { hand: string[] }): Promise<void> {
    const anims: Promise<void>[] = [];
    const pid = this.player_id;
    const hand = $(IDS.HAND);
    let handPosDiv = hand.firstElementChild;
    for (let newPiece of args.hand) {
      if (!handPosDiv) {
        // dynamically expand hand if 7 size hand is chosen
        handPosDiv = this.createDiv();
        hand.appendChild(handPosDiv);
      }
      let pieceDiv = handPosDiv!.firstElementChild as HTMLElement;
      if (!pieceDiv) {
        if (newPiece && newPiece != Piece.EMPTY) {
          pieceDiv = this.createPieceDiv(newPiece, pid);
          handPosDiv?.appendChild(pieceDiv);
          anims.push(this.animationManager.slideIn(pieceDiv, $(IDS.poolcount(pid))));
        }
      } else {
         let pt = pieceDiv.getAttribute(Attrs.PIECE);
         if (!pt) {
           console.error("hand had piece div but no attribute");
         } else if (pt != this.pieceVal(newPiece!, pid)) {
           console.error("piece from args", newPiece, "not matches hand", pieceDiv);
         }
      }
      handPosDiv = handPosDiv!.nextElementSibling;
    }
    await this.playParallel(anims);
  }

  private async notif_extraTurnUsed(args: { card: string; used: boolean; }): Promise<void> {
    const carddiv = $(IDS.zcard(args.card));
    if (carddiv == undefined) {
      console.error(`Could not find div for owned ${args.card} card`, args.card);
    } else {
      carddiv.setAttribute(Attrs.ZUSED, '');
    }
  }

  private async indicateNeighbors(
    winnerHexes: RowCol[],
    otherHexes: RowCol[]) {
    if (this.bgaAnimationsActive()) {
      for (const rc of otherHexes) {
        this.hexDiv(rc).classList.add(CSS.IN_NETWORK);
        this.hexDiv(rc).classList.add(CSS.UNIMPORTANT);
      }
      for (let i = 0; i < 3; i++) {
        for (const rc of winnerHexes) {
          this.hexDiv(rc).classList.add(CSS.IN_NETWORK);
        }
        await this.wait(250);
        for (const rc of winnerHexes) {
          this.hexDiv(rc).classList.remove(CSS.IN_NETWORK);
        }
        await this.wait(250);
      }
      for (const rc of otherHexes) {
        this.hexDiv(rc).classList.remove(CSS.IN_NETWORK);
        this.hexDiv(rc).classList.remove(CSS.UNIMPORTANT);
      }
    }
  }

  private async notif_zigguratScored(
    args: {
      row: number;
      col: number;
      player_name: string;
      player_id: number;
      winner_hexes: RowCol[];
      other_hexes: RowCol[];
    }): Promise<void> {
    await this.indicateNeighbors(args.winner_hexes, args.other_hexes).then(() => this.unmarkHexSelected(args));
    // TODO: consider better visual treatments
  }

  private async notif_scoringSelection(
    args: {
      player_id: number;
      player_name: string;
      row: number;
      col: number;
      city: string;
    }): Promise<void> {
    this.markHexSelected(args);
  }

  private async notif_zigguratCardSelection(
    args: {
      zcard: string;
      player_id: number;
      cardused: boolean;
      score: number;
      hex: RowCol;
    }
  ): Promise<void> {
    this.scoreCtrl[args.player_id]!.toValue(args.score);
    const zelem = $(IDS.zcard(args.zcard));
    zelem.classList.remove(CSS.SELECTED);
    await this.animationManager.slideAndAttach(zelem, $(IDS.playerBoardZcards(args.player_id)));
  }

  private async notif_cityScored(
    args: {
      row: number;
      col: number;
      city: string;
      player_id: number;
      winner_hexes: RowCol[];
      other_hexes: RowCol[];
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
    this.pushActionBarTitle(this.format_string(_("City at ${row},${col} scoring"),
                                               {"row": `${args.row}`, "col": `${args.col}`}));
    const hex = $(IDS.hexDiv(args));

    let aa = this.bgaAnimationsActive();
    for (const playerId in args.details) {
      const details = args.details[playerId]!;
      if (aa) {
        for (const nh of details.network_locations) {
          let cl = this.hexDiv(nh).classList;
          cl.add(CSS.IN_NETWORK);
          if (!details.scored_locations.some(
            sh => (nh.row == sh.row && nh.col == sh.col))) {
            cl.add(CSS.UNIMPORTANT);
          }
        }
        await this.animationManager.displayScoring(
          hex,
          details.network_points,
          this.gamedatas.players[playerId]!.color,
          { duration: 2500, easing: 'ease-in-out', extraClass: 'bbl_city_scoring' });
        details.network_locations.forEach(
          (rc: RowCol) => {
            let cl = this.hexDiv(rc).classList;
            cl.remove(CSS.IN_NETWORK);
            cl.remove(CSS.UNIMPORTANT);
          });
      }
      this.scoreCtrl[details.player_id]!.incValue(details.network_points);
    }

    await this.indicateNeighbors(args.winner_hexes, args.other_hexes);

    let dest = (args.player_id != 0)
      ? $(IDS.citycount(args.player_id))
      // TODO: find a location for 'off the board' but not to any player?
      : undefined;

    await this.animationManager.slideOutAndDestroy(
      hex.firstElementChild as HTMLElement, dest, {}).then(() => {
        this.unmarkHexSelected(args);
        for (const playerId in args.details) {
          const details = args.details[playerId]!;
          this.scoreCtrl[playerId]!.incValue(details.capture_points);
          this.updateCapturedCityCount(details);
        }
      }).then(() => this.popActionBarTitle());
  }

  ///////
  readonly special_log_args = {
    piece: (args: any) => `<span class='log-element' ${Attrs.PIECE}='${this.pieceVal(args.piece, args.player_id)}'></span>`,
    city: (args: any) => `<span class='log-element' ${Attrs.PIECE}='${this.pieceVal(args.city, 0)}'></span>`,
    zcard: (args: any) => `<span class='log-element' ${Attrs.ZTYPE}='${args.zcard}'></span>`,
    original_piece: (args: any) => `<span class='log-element' ${Attrs.PIECE}='${this.pieceVal(args.original_piece, args.player_id)}'></span>`,
  };

  override bgaFormatText(log: string, args: any): {log: string, args: any } {
    try {
      if (log && args && !args.processed) {
        args.processed = true;
        for (const key in this.special_log_args) {
          if (key in args) {
            args[key] = this.special_log_args[key](args);
          }
        }
      }
    } catch (e: any) {
      console.error(log, args, 'Exception thrown', e.stack);
    }
    return { log, args };
  }


  /// experimental
  private handPieceDivs() : (HTMLElement | undefined)[] {
    let result: (HTMLElement | undefined)[] = [];
    const hand = $(IDS.HAND);
    hand.childNodes.forEach((n: ChildNode) => {
      result.push(n as HTMLElement);
    });
    return result;
  }

}
