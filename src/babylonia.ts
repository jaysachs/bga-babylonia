import { colorIndexMap } from './colormap';
import { BaseGame } from './basegame';
import { Html as BHtml, AttrLike } from './html';

type AnimationList = (() => Promise<any>)[];

interface RowCol { row: number, col: number };
interface PlayerData {
  player_id: number;
  hand_size: number;
  pool_size: number;
  captured_city_count: number;
  score: number;
}
interface Hex extends RowCol {
  board_player: number;
  piece: string;
}

export class Attrs implements AttrLike {
  toRecord(): Record<string, string> {
    return this.r;
  }
  private r: any = {};

  static readonly ZTYPE : string = 'bbl_ztype';
  static readonly ZUSED : string = 'bbl_zused';
  static readonly PIECE : string = 'bbl_piece';
  static readonly TT_PROCESSED : string = 'bbl_tt_processed';

  static ztype(zt : string): Attrs {
    return new Attrs().ztype(zt);
  }
  ztype(zt : string): Attrs {
    this.r[Attrs.ZTYPE] = zt;
    return this;
  }

  static zused(u: boolean): Attrs {
    return new Attrs().zused(u);
  }
  zused(u: boolean): Attrs {
    this.r[Attrs.ZUSED] = ""+u;
    return this;
  }

  static piece(p: string) : Attrs {
    return new Attrs().piece(p);
  }
  piece(p: string): Attrs {
    this.r[Attrs.PIECE] = p;
    return this;
  }

  static processed(p: string): Attrs {
    return new Attrs().processed(p);
  }
  processed(p: string): Attrs {
    this.r[Attrs.TT_PROCESSED] = p;
    return this;
  }
}

class Piece {
  static readonly EMPTY = 'empty'
}

class IDS {
  static readonly AVAILABLE_ZCARDS: string = 'bbl_available_zcards';
  static readonly BOARD = 'bbl_board';
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
  static readonly SELECTED = 'bbl_selected';
  static readonly PLAYABLE = 'bbl_playable';
  static readonly UNPLAYABLE = 'bbl_unplayable';
  static readonly UNIMPORTANT = 'bbl_unimportant';
}

class Html {
  static readonly hstart = 38.0; // this is related to board width but not sure how
  static readonly vstart = 9.0; // depends on board size too
  static readonly height = 768 / 12.59;
  static readonly width = this.height * 1.155;
  static readonly hdelta = 0.75 * this.width + 2.0;
  static readonly vdelta = 1.0 * this.height + 2.0;

  public static hexDiv(rc: RowCol): HTMLElement {
    let top = this.vstart + rc.row * this.vdelta / 2;
    let left = this.hstart + rc.col * this.hdelta;
    let div = document.createElement('div') as HTMLElement;
    div.id = IDS.hexDiv(rc);
    div.style.top = `${top}px`;
    div.style.left = `${left}px`;
    return div;
  }

  public static player_board_ext(player_id: number, color_index: number): string {
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

  public static base_html(): string {
    return `
    <div id='bbl_main'>
      <div id='bbl_hand_container'>
        <div id='${IDS.HAND}'></div>
      </div>
      <div id='bbl_board_container'>
        <div id='${IDS.BOARD}'></div>
      </div>
      <div id='bbl_available_zcards_container' class="whiteblock">
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

interface BGamedatas extends Gamedatas<Player> {
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
export class Game extends BaseGame<Player, BGamedatas> {
  private handCounters: Counter[] = [];
  private poolCounters: Counter[] = [];
  private cityCounters: Counter[] = [];
  private static playerIdToColorIndex: Record<number, number> = {};
  public zcardTooltips: string[] = [];

  public get currentPlayerState(): BabyloniaState | null {
    return this.bga.states.getCurrentPlayerStateClass() as any;
  }

  public get playStateArgs(): PlayState | null {
    return this.currentPlayerState?.playStateArgs || null;
  }

  constructor(bga: Bga<Player, BGamedatas>) {
    super(bga, Game.special_log_args);
  }

  public addTooltipsToLog() {
    const elements = document.querySelectorAll(`[${Attrs.ZTYPE}]:not([${Attrs.TT_PROCESSED}])`);
    elements.forEach(ele => {
      ele.setAttribute(Attrs.TT_PROCESSED, '');  // prevents tooltips being re-added to previous log entries
      this.bga.gameui.addTooltip(ele.id, this.zcardTooltips[ele.getAttribute(Attrs.ZTYPE)!], '');
    });
  }

  override setup(gamedatas: BGamedatas) {
    console.log(gamedatas);
    super.setup(gamedatas);

    for (const playerId in gamedatas.players) {
      Game.playerIdToColorIndex[playerId] = colorIndexMap[gamedatas.players[playerId]!.color]!;
    }

    this.setupGameHtml();

    console.log('setting up player boards', gamedatas.player_data);
    for (let pid in gamedatas.player_data) {
      this.setupPlayerBoard(gamedatas.player_data[pid]!);
    }

    console.log('setting the the game board');
    this.setupGameBoard(gamedatas.board);

    console.log('setting up player hand', gamedatas.hand);
    gamedatas.hand.forEach((piece, i) => {
      const hpd = this.handPosDiv(i);
      if (piece && piece != Piece.EMPTY) {
        hpd.appendChild(this.createPieceDiv(piece, this.bga.gameui.player_id));
      }
    });

    console.log('Setting up ziggurat cards', gamedatas.ziggurat_cards);
    this.setupZcards(gamedatas.ziggurat_cards);

    this.bga.notifications.setupPromiseNotifications({ logger: console.log, onEnd: this.addTooltipsToLog.bind(this) });

    // Register states
    this.bga.states.register('SelectExtraTurn', new SelectExtraTurnState(this));
    this.bga.states.register('EndOfTurnScoring', new EndOfTurnScoringState(this));
    this.bga.states.register('SelectZigguratCard', new SelectZigguratCardState(this));
    this.bga.states.register('PlayPieces', new PlayPiecesState(this));
    this.bga.states.register('SelectScoringHex', new SelectScoringHexState(this));
    this.bga.states.register('client_pickHexToPlay', new ClientPickHexToPlayState(this));
    this.bga.states.register('client_selectPieceOrEndTurn', new ClientSelectPieceOrEndTurnState(this));
    this.bga.states.register('client_mustSelectPiece', new ClientMustSelectPieceState(this));
    this.bga.states.register('client_noPlaysLeft', new ClientNoPlaysLeftState(this));
    this.bga.states.register('client_undo', new ClientUndoState(this));
    this.bga.states.register('client_hexpicked', new ClientHexPickedState(this));

    // if a ziggurat card is being chosen
    // TODO: should this be done in the state watcher?
    if (gamedatas.current_scoring_hex) {
      this.markHexSelected(gamedatas.current_scoring_hex);
    }
    console.log('Game setup done');
  }

  private createPieceDiv(piece: string, player_id?: number) : HTMLElement {
    let e = document.createElement('div');
    e.setAttribute(Attrs.PIECE, Game.pieceVal(piece, player_id || 0));
    return e;
  }

  private async setupGameBoard(boardData: Hex[]): Promise<void> {
    const boardDiv = $(IDS.BOARD);

    const animateBoardInitialPlacement = false;
    const inParallel = true;
    const duration = inParallel ? 800 : 200;
    let anims: AnimationList = [];

    for (const hex of boardData) {
      const hexDiv = Html.hexDiv(hex);
      boardDiv.appendChild(hexDiv);
      if (hex.piece != null && hex.piece != Piece.EMPTY) {
        let pieceDiv = this.createPieceDiv(hex.piece, hex.board_player)
        if (!animateBoardInitialPlacement || hex.board_player == 0) {
          hexDiv.appendChild(pieceDiv);
        } else {
          anims.push(() => {
            $(IDS.handcount(hex.board_player)).appendChild(pieceDiv);
            return this.animationManager.slideAndAttach(pieceDiv, hexDiv, { duration: duration, fromPlaceholder: 'off' });
          });
        }
      }
    }

    if (animateBoardInitialPlacement) {
      if (inParallel) {
        await this.animationManager.playParallel(anims);
      } else {
        await this.animationManager.playSequentially(anims);
      }
    }
  }

  private setupZcards(zcards: Zcard[]): void {
    const available = $(IDS.AVAILABLE_ZCARDS);
    for (let zcard of zcards) {
      const zelem = document.createElement('div');
      zelem.id = IDS.zcard(zcard.type);
      zelem.setAttribute(Attrs.ZTYPE, zcard.type);
      if (zcard.used) {
        zelem.setAttribute(Attrs.ZUSED, "");
      }
      if (zcard.owning_player_id != 0) {
        $(IDS.playerBoardZcards(zcard.owning_player_id)).appendChild(zelem);
      } else {
        available.appendChild(zelem);
      }
      this.zcardTooltips[zcard.type] = zcard.tooltip;
      this.bga.gameui.addTooltip(zelem.id, zcard.tooltip, '');
    }
  }

  private setupGameHtml(): void {
    this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', Html.base_html());
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

  public hexDiv(rc: RowCol): HTMLElement {
    return $(IDS.hexDiv(rc));
  }

  private handPosDiv(i: number): HTMLElement {
    const hand = $(IDS.HAND);
    while (i >= hand.childElementCount) {
      hand.appendChild(document.createElement('div'));
    }
    return $(IDS.HAND).childNodes.item(i)! as HTMLElement;
  }

  private static pieceVal(piece: string, playerId: number): string {
    return (playerId > 0 && piece != Piece.EMPTY)
      ? piece + '_' + this.playerIdToColorIndex[playerId]
      : piece;
  }

  // Returns the hex (row,col) clicked on, or null if not a playable hex
  public selectedHex(target: EventTarget): RowCol | null {
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

  public markHexPlayable(rc: RowCol): void {
    this.hexDiv(rc).classList.add(CSS.PLAYABLE);
  }

  public unmarkHexPlayable(rc: RowCol): void {
    this.hexDiv(rc).classList.remove(CSS.PLAYABLE);
  }

  public markHexSelected(rc: RowCol): void {
    this.hexDiv(rc).classList.add(CSS.SELECTED);
  }

  public unmarkHexSelected(rc: RowCol): void {
    this.hexDiv(rc).classList.remove(CSS.SELECTED);
  }

  public markHexesPlayable(hexes: RowCol[]): void {
    hexes.forEach(this.markHexPlayable.bind(this));
  }

  public unmarkHexesPlayable(hexes: RowCol[]): void {
    hexes.forEach(this.unmarkHexPlayable.bind(this));
  }


  private setupPlayerBoard(player: PlayerData): void {
    const playerId = player.player_id;
    console.log('Setting up board for player ' + playerId);
    this.bga.playerPanels.getElement(playerId)
      .insertAdjacentHTML('beforeend', Html.player_board_ext(playerId, Game.playerIdToColorIndex[playerId]!));
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
    this.bga.playerPanels.getScoreCounter(playerId).setValue(player.score);
  }


  public markAllHexesUnplayable(): void {
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

  private async notif_undoMove(
    args: {
      player_id: number;
      points: number;
      row: number;
      col: number;
      _private: {
        original_piece: string;
        handpos: number;
      };
      captured_piece: string;
      piece: string;
    }
  ): Promise<void> {
    let anims: AnimationList = [];
    let hexDiv = $(IDS.hexDiv(args));
    let isActivePlayer = this.bga.gameui.player_id == args.player_id;

    if (args.captured_piece != Piece.EMPTY) {
      // slide the previously captured field back
      let field = this.createPieceDiv(args.captured_piece, 0);
      anims.push(() => {
        $(IDS.handcount(args.player_id)).appendChild(field);
        return this.animationManager.slideAndAttach(field, hexDiv, { fromPlaceholder: 'off' });
      })
    }

    let pieceDiv = hexDiv.firstElementChild as HTMLElement;
    let destDiv = isActivePlayer ? this.handPosDiv(args._private.handpos) : $(IDS.handcount(args.player_id));

    if (args._private.original_piece) {
        // restore piece value, e.g. if it was originally hidden
        pieceDiv.setAttribute(Attrs.PIECE, Game.pieceVal(args._private.original_piece, args.player_id));
    }
    // slide the played piece back to the hand
    anims.push(() => this.animationManager.slideAndAttach(pieceDiv, destDiv));

    await this.animationManager.playParallel(anims).then(() => {
      if (isActivePlayer) {
         destDiv.classList.add(CSS.PLAYABLE);
      }
      this.handCounters[args.player_id]!.incValue(1);
      this.bga.playerPanels.getScoreCounter(args.player_id).incValue(-args.points);
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
    let anims: AnimationList = [];

    const hexDiv = this.hexDiv(args);

    // Check for field capture
    if (args.captured_piece != Piece.EMPTY /* .startsWith('field') */) {
      let field = hexDiv.firstElementChild as HTMLElement;
      if (!field) { // or field is not F567X
        console.error("attempt to capture a field that is not there");
      }
      // slide the captured field to the player board
      anims.push(() => this.animationManager.slideOutAndDestroy(field, $(IDS.handcount(args.player_id)), {}));
    }

    if (this.bga.players.isCurrentPlayerActive()) {
      const handPosDiv = this.handPosDiv(args.handpos);
      const pieceDiv = handPosDiv.firstElementChild as HTMLElement;
      anims.push(() =>
        // slide piece from hand to hex
        this.animationManager.slideAndAttach(pieceDiv, hexDiv)
          // play into river, piece is hidden, so use the value from the args not the hand
          .then(() => pieceDiv.setAttribute(Attrs.PIECE, Game.pieceVal(args.piece, args.player_id)))
      );
    } else {
      anims.push(() => {
        // slide piece from hand count to hex
        let div = this.createPieceDiv(args.piece, args.player_id);
        $(IDS.handcount(args.player_id)).appendChild(div);
        return this.animationManager.slideAndAttach(div, hexDiv, { fromPlaceholder: 'off' });
      });
    }
    // animate the ziggurat scoring, if any
    if (args.ziggurat_points > 0) {
      args.touched_ziggurats.forEach(this.markHexSelected.bind(this));
      // TODO: since it's parallel, just flatten into the anims list?
      anims.push(() => this.animationManager.playParallel(
        args.touched_ziggurats.map((rc: RowCol) =>
          () => this.animationManager.displayScoring(
              this.hexDiv(rc),
              1,
              this.gamedatas.players[args.player_id]!.color,
              { extraClass: 'bbl_city_scoring', duration: 700 })
            .then(() => args.touched_ziggurats.forEach(this.unmarkHexSelected.bind(this))))
      ));
    }

    await this.animationManager.playParallel(anims);

    this.updateHandCount(args);
    this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points);
  }

  private async notif_handRefilled(args: { hand: string[] }): Promise<void> {
    const anims: AnimationList = [];
    const pid = this.bga.gameui.player_id;
    const hand = $(IDS.HAND);
    let handPosDiv = hand.firstElementChild;
    for (let newPiece of args.hand) {
      if (!handPosDiv) {
        // dynamically expand hand if 7 size hand is chosen
        handPosDiv = document.createElement('div');
        hand.appendChild(handPosDiv);
      }
      let pieceDiv = handPosDiv!.firstElementChild as HTMLElement;
      if (!pieceDiv) {
        if (newPiece && newPiece != Piece.EMPTY) {
          let destDiv = handPosDiv! as HTMLElement;
          anims.push(() => {
            pieceDiv = this.createPieceDiv(newPiece, pid);
            $(IDS.poolcount(pid)).appendChild(pieceDiv);
            return this.animationManager.slideAndAttach(pieceDiv, destDiv, { fromPlaceholder: 'off' })
          });
        }
      } else {
         let pt = pieceDiv.getAttribute(Attrs.PIECE);
         if (!pt) {
           console.error("hand had piece div but no attribute");
         } else if (pt != Game.pieceVal(newPiece!, pid)) {
           console.error("piece from args", newPiece, "not matches hand", pieceDiv);
         }
      }
      handPosDiv = handPosDiv!.nextElementSibling as (HTMLElement | null);
    }
    await this.animationManager.playParallel(anims);
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
        await this.bga.gameui.wait(250);
        for (const rc of winnerHexes) {
          this.hexDiv(rc).classList.remove(CSS.IN_NETWORK);
        }
        await this.bga.gameui.wait(250);
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
      // slight subtlety here; if there is a winner, leave the hex selected until after the cards is selected
      await this.indicateNeighbors(args.winner_hexes, args.other_hexes).then(() => { if (!args.player_id) this.unmarkHexSelected(args) });
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
      points: number;
      hex: RowCol;
    }
  ): Promise<void> {
    this.unmarkHexSelected(args.hex);
    const dest = $(IDS.playerBoardZcards(args.player_id));
    const zelem = $(IDS.zcard(args.zcard));
    zelem.classList.remove(CSS.SELECTED);
    await this.animationManager.slideAndAttach(zelem, dest, { toPlaceholder: 'off' })
        .then(() => {
          this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points);
          if (args.cardused) {
            zelem.setAttribute(Attrs.ZUSED, "true");
          }
        });
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
          { extraClass: 'bbl_city_scoring' });
        details.network_locations.forEach(
          (rc: RowCol) => {
            let cl = this.hexDiv(rc).classList;
            cl.remove(CSS.IN_NETWORK);
            cl.remove(CSS.UNIMPORTANT);
          });
      }
      this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.network_points);
    }

    await this.indicateNeighbors(args.winner_hexes, args.other_hexes);

    let dest = (args.player_id != 0)
      ? $(IDS.citycount(args.player_id))
      // TODO: find a better location for 'off the board' but not to any player?
      : this.bga.gameui.getGameAreaElement();

    await this.animationManager.slideOutAndDestroy(
      hex.firstElementChild as HTMLElement, dest, {}).then(() => {
        this.unmarkHexSelected(args);
        for (const playerId in args.details) {
          const details = args.details[playerId]!;
          this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.capture_points);
          this.updateCapturedCityCount(details);
        }
      }).then(() => this.unmarkHexSelected(args));
  }

  ///////
  private static zcardSalt: number = 0;
  private static readonly special_log_args : Record<string, (args: any) => HTMLElement> = {
    piece: (args: any) => BHtml.span({ attrs: Attrs.piece(Game.pieceVal(args.piece, args.player_id)) }),
    city: (args: any) => BHtml.span({ attrs: Attrs.piece(Game.pieceVal(args.city, 0))}),
    zcard: (args: any) => BHtml.span({ id: `logzcard_${Game.zcardSalt++}`, attrs: Attrs.ztype(args.zcard)}),
    original_piece: (args: any) => BHtml.span({ attrs: Attrs.piece(Game.pieceVal(args.original_piece, args.player_id))}),
  };
}

export abstract class BabyloniaState {
  public playStateArgs: PlayState | null = null;
  
  protected get selectedHandDiv(): Element | null {
    return document.querySelector(`#${IDS.HAND} > .${CSS.SELECTED}`);
  }

  constructor(protected game: Game) {}

  public onEnteringState(args: any, isCurrentPlayerActive: boolean) {
    if (args && args.playStateArgs) {
      this.playStateArgs = args.playStateArgs;
    } else if (args && args.allowedMoves) {
      this.playStateArgs = args as PlayState;
    }
    this.doEnterState(args, isCurrentPlayerActive);
  }

  public onLeavingState(args: any, isCurrentPlayerActive: boolean) {
    this.doLeaveState(args, isCurrentPlayerActive);
  }

  protected doEnterState(args: any, isCurrentPlayerActive: boolean) {}
  protected doLeaveState(args: any, isCurrentPlayerActive: boolean) {}

  public playSelectedPiece(event: Event): void {
    const handDiv = this.selectedHandDiv;
    if (!handDiv) {
      console.error('no piece selected!');
      return;
    }

    const hex = this.game.selectedHex(event.target!);
    if (hex == null) {
      console.error('no hex selected!');
      return;
    }
    this.game.bga.states.setClientState('client_hexpicked', {});
    this.game.bgaPerformAction('actPlayPiece', {
      handpos: this.game.indexInParent(handDiv),
      row: hex.row,
      col: hex.col
    }).then(() => {
      this.game.unmarkHexPlayable(hex);
    });
    this.unselectAllHandPieces();
  }

  protected allowedMovesFor(div: Element | null): RowCol[] {
    if (!div) { return []; }
    const piece = div.getAttribute(Attrs.PIECE)!.split('_')[0]!;
    return (this.playStateArgs!.allowedMoves as any)[piece] || [];
  }

  protected markHexesPlayableForPiece(div: Element): void {
    this.game.markHexesPlayable(this.allowedMovesFor(div));
  }

  protected unmarkHexesPlayableForPiece(div: Element): void {
    this.game.unmarkHexesPlayable(this.allowedMovesFor(div));
  }

  public unselectAllHandPieces(): void {
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
  }

  public setPlayablePieces(): void {
    const hand = $(IDS.HAND);
    hand.childNodes.forEach((child : HTMLElement) => {
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

  public onHandClickedLogic(ev: Event): boolean {
    const pieceDiv = ev.target as HTMLElement;
    let p = pieceDiv.getAttribute(Attrs.PIECE);
    if (!p || p == Piece.EMPTY) { return false; }

    let parentDiv = pieceDiv.parentElement!;
    let cl = parentDiv.classList;
    if (cl.contains(CSS.UNPLAYABLE)) { return false; }

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
      if (this.game.currentState != 'client_pickHexToPlay') {
        this.game.bga.states.setClientState('client_pickHexToPlay', {
          descriptionmyturn: _('${you} must select a hex to play to'),
          playStateArgs: this.playStateArgs,
        });
        this.game.bga.statusBar.addActionButton(
          _('Cancel'),
          () => {
            this.unselectAllHandPieces();
            this.setStatusBarForPlayState();
          },
        { color: "secondary"});
      }
    } else {
      this.setStatusBarForPlayState();
    }
    return false;
  }

  public setStatusBarForPlayState(): void {
    const bga = this.game.bga;
    if (!bga.players.isCurrentPlayerActive()) {
      return;
    }
    if (this.playStateArgs == null) {
      console.error('playStateArgs unexpectedly null');
      return;
    }
    if (this.playStateArgs.canEndTurn) {
      if (this.playStateArgs.allowedMoves.length == 0) {
        bga.states.setClientState('client_noPlaysLeft', {
          descriptionmyturn: _('${you} must end your turn'),
          playStateArgs: this.playStateArgs
        });
        this.setPlayablePieces();
      } else {
        bga.states.setClientState('client_selectPieceOrEndTurn', {
          descriptionmyturn: _('${you} may select a piece to play or end your turn'),
          playStateArgs: this.playStateArgs
        });
        this.setPlayablePieces();
      }
      bga.statusBar.addActionButton(
        _('End turn'),
        () => {
          this.unselectAllHandPieces();
          this.game.bgaPerformAction('actDonePlayPieces');
        });
    } else {
      bga.states.setClientState('client_mustSelectPiece', {
        descriptionmyturn: _('${you} must select a piece to play'),
        playStateArgs: this.playStateArgs
      });
      this.setPlayablePieces();
    }
    if (this.playStateArgs.canUndo) {
      bga.statusBar.addActionButton(
        _('Undo'),
        () => { bga.states.setClientState('client_undo', { playStateArgs: this.playStateArgs }); this.game.bgaPerformAction('actUndoPlay'); },
        { color: "alert" }
      );
    }
  }
}

export class SelectExtraTurnState extends BabyloniaState {
  protected doEnterState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.game.bga.statusBar.addActionButton(
        _('Take your one-time extra turn'),
        () => this.game.bgaPerformAction('actChooseExtraTurn', { take_extra_turn: true })
      );
      this.game.bga.statusBar.addActionButton(
        _('Just finish your turn'),
        () => this.game.bgaPerformAction('actChooseExtraTurn', { take_extra_turn: false })
      );
    }
  }
}

export class EndOfTurnScoringState extends BabyloniaState {
  protected doEnterState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.game.markAllHexesUnplayable();
    }
  }
}

export class SelectZigguratCardState extends BabyloniaState {
  private handler: (e: Event) => void;
  constructor(game: Game) {
    super(game);
    this.handler = (e) => this.onZcardClicked(e);
  }
  protected doEnterState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      const div = $(IDS.AVAILABLE_ZCARDS) as HTMLElement;
      div.scrollIntoView(false);
      $(IDS.AVAILABLE_ZCARDS).addEventListener('click', this.handler);
    }
  }
  protected doLeaveState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.AVAILABLE_ZCARDS).removeEventListener('click', this.handler);
    }
  }
  public toggleZcardSelected(e: Element) {
    const zt = e.getAttribute(Attrs.ZTYPE)!;
    let promptForConfirmation = () => {
      this.game.bga.statusBar.setTitle(_('Select ziggurat card ${zcard}?'), { zcard: zt });
      this.game.addTooltipsToLog();

      this.game.bga.statusBar.addActionButton(_('Confirm'),
        () => this.game.bgaPerformAction('actSelectZigguratCard', { zctype: zt }),
        { autoclick: true }
      );

      this.game.bga.statusBar.addActionButton(
        _('Cancel'),
        () => this.toggleZcardSelected(e),
        { color: "secondary"});
    };
    let cancel = () => this.game.bga.states.restoreServerGameState();

    let alreadySelected = document.querySelector(`#${IDS.AVAILABLE_ZCARDS} > .${CSS.SELECTED}`);
    e.classList.toggle(CSS.SELECTED);
    if (alreadySelected == null) {
      promptForConfirmation();
    } else if (alreadySelected == e) {
      cancel();
    } else {
      alreadySelected.classList.toggle(CSS.SELECTED);
      cancel();
      promptForConfirmation();
    }
  }
  onZcardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    let e = event.target as HTMLElement;
    let z = e.getAttribute(Attrs.ZTYPE);
    if (!z) { return false; }
    if (e.getAttribute(Attrs.ZTYPE)) {
      this.toggleZcardSelected(e);
    }
    return false;
  }
}

export class PlayPiecesState extends BabyloniaState {
  protected doEnterState(args: PlayState, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.playStateArgs = args;
      this.setStatusBarForPlayState();
      this.game.markAllHexesUnplayable();
    }
  }
}

export class SelectScoringHexState extends BabyloniaState {
  private handler: (e: Event) => void;
  constructor(game: Game) {
    super(game);
    this.handler = (e) => this.onBoardClicked(e);
  }
  protected doEnterState(args: { hexes: RowCol[] }, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      this.game.markHexesPlayable(args.hexes);
      $(IDS.BOARD).addEventListener('click', this.handler);
    }
  }
  protected doLeaveState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.BOARD).removeEventListener('click', this.handler);
    }
  }
  public selectHexToScore(event: Event) {
    const hex = this.game.selectedHex(event.target!);
    if (hex == null) {
      return;
    }
    let div = this.game.hexDiv(hex);
    let piece = div.firstElementChild!.getAttribute(Attrs.PIECE);
    div.classList.add(CSS.SELECTED);
    this.game.bga.states.setClientState('client_hexpicked', {});
    this.game.bga.statusBar.setTitle(_('Score ${city} at (${row},${col})?'), {
      row: hex.row, col: hex.col, city: piece,
    });
    this.game.bga.statusBar.addActionButton(_('Confirm'),
      () => this.game.bgaPerformAction('actSelectHexToScore', hex).then(() => this.game.unmarkHexPlayable(hex)),
      { autoclick: true });
    this.game.bga.statusBar.addActionButton(_('Cancel'),
      () => {
        div.classList.remove(CSS.SELECTED);
        this.game.bga.states.restoreServerGameState();
      },
      { color: "secondary" });
  }
  onBoardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.selectHexToScore(event);
  }
}

class HandClickableState extends BabyloniaState {
  protected handler: (e: Event) => void;
  constructor(game: Game) {
    super(game);
    this.handler = (e) => this.onHandClicked(e);
  }
  protected doEnterState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.HAND).addEventListener('click', this.handler);
    }
  }
  protected doLeaveState(args: any, isCurrentPlayerActive: boolean) {
    if (isCurrentPlayerActive) {
      $(IDS.HAND).removeEventListener('click', this.handler);
    }
  }
  onHandClicked(ev: Event) {
    ev.preventDefault();
    ev.stopPropagation();
    this.onHandClickedLogic(ev);
  }
}

export class ClientPickHexToPlayState extends HandClickableState {
  private boardHandler: (e: Event) => void;
  constructor(game: Game) {
    super(game);
    this.boardHandler = (e) => this.onBoardClicked(e);
  }
  protected doEnterState(args: any, isCurrentPlayerActive: boolean) {
    super.doEnterState(args, isCurrentPlayerActive);
    if (isCurrentPlayerActive) {
      $(IDS.BOARD).addEventListener('click', this.boardHandler);
    }
  }
  protected doLeaveState(args: any, isCurrentPlayerActive: boolean) {
    super.doLeaveState(args, isCurrentPlayerActive);
    if (isCurrentPlayerActive) {
      $(IDS.BOARD).removeEventListener('click', this.boardHandler);
    }
  }
  onBoardClicked(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.playSelectedPiece(event);
  }
}

export class ClientSelectPieceOrEndTurnState extends HandClickableState {}
export class ClientMustSelectPieceState extends HandClickableState {}

export class ClientNoPlaysLeftState extends BabyloniaState {}
export class ClientUndoState extends BabyloniaState {}
export class ClientHexPickedState extends BabyloniaState {}
