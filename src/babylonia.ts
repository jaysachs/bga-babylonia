import { colorIndexMap } from './colormap';
import { BaseGame } from './basegame';
import { Html as BHtml, AttrLike } from './html';
import { BabyloniaState, ClientHexPickedState, ClientMustSelectPieceState, ClientNoPlaysLeftState, ClientPickHexToPlayState, ClientSelectPieceOrEndTurnState, ClientUndoState, EndOfTurnScoringState, PlayPiecesState, SelectExtraTurnState, SelectScoringHexState, SelectZigguratCardState } from './gamestates';
import { Hex, PlayerData, PlayState, RowCol } from './bdata';
import { Attrs, CSS, Html, IDS, Piece } from './bhtml';

type AnimationList = (() => Promise<any>)[];

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

  public markHexSelected(rc: RowCol): void {
    this.hexDiv(rc).classList.add(CSS.SELECTED);
  }

  public unmarkHexSelected(rc: RowCol): void {
    this.hexDiv(rc).classList.remove(CSS.SELECTED);
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
