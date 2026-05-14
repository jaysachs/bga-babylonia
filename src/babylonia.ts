import { colorIndexMap } from './colormap';
import { BaseGame } from './basegame';
import { Html } from './html';
import { EndOfTurnScoringState, PlayPiecesState, SelectExtraTurnState, SelectScoringHexState, SelectZigguratCardState } from './gamestates';
import { Hex, PlayerData } from './bdata';
import { Attrs, CSS, BblHtml as BblHtml, IDS, Piece } from './bhtml';

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
  translated_pieces: Record<string,string>;
  current_scoring_hex: number | null;
}

/** Game class */
export class Game extends BaseGame<Player, BGamedatas> {
  private handCounters: Counter[] = [];
  private poolCounters: Counter[] = [];
  private cityCounters: Counter[] = [];
  private static playerIdToColorIndex: Record<number, number> = {};
  public zcardTooltips = new Map<string, string>();

  constructor(bga: Bga<Player, BGamedatas>) {
    super(bga);
  }

  setup(gamedatas: BGamedatas) {
    this.registerLogArgs();
    for (const playerId in gamedatas.players) {
      Game.playerIdToColorIndex[playerId] = colorIndexMap[gamedatas.players[playerId]!.color]!;
    }
    Attrs.initializeColorMap(Game.playerIdToColorIndex);

    this.setupGameHtml();

    console.log('setting up player boards', gamedatas.player_data);
    for (const pid in gamedatas.player_data) {
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

    // Register states
    this.bga.states.register('SelectExtraTurn', new SelectExtraTurnState(this));
    this.bga.states.register('EndOfTurnScoring', new EndOfTurnScoringState(this));
    this.bga.states.register('SelectZigguratCard', new SelectZigguratCardState(this));
    this.bga.states.register('PlayPieces', new PlayPiecesState(this));
    this.bga.states.register('SelectScoringHex', new SelectScoringHexState(this));

    this.bga.notifications.setupPromiseNotifications({
      logger: console.log,
      handlers: [this, this.bga.states.getStateClass('PlayPieces')],
    });

    // if a ziggurat card is being chosen
    // TODO: should this be done in the state watcher?
    if (gamedatas.current_scoring_hex) {
      this.markHexSelected(gamedatas.current_scoring_hex);
    }
    console.log('Game setup done');
  }

  private createPieceDiv(piece: string, player_id?: number) : HTMLElement {
    return Html.div({ attrs: Attrs.piece(piece, player_id) } );
  }

  private async setupGameBoard(boardData: Hex[]) {
    const boardDiv = $(IDS.BOARD);
    for (const hex of boardData) {
      const hexDiv = BblHtml.makeHexDiv(hex);
      boardDiv.appendChild(hexDiv);
      if (hex.piece != null && hex.piece != Piece.EMPTY) {
        let pieceDiv = this.createPieceDiv(hex.piece, hex.board_player)
        hexDiv.appendChild(pieceDiv);
      }
    }
  }

  private setupZcards(zcards: Zcard[]): void {
    const available = $(IDS.AVAILABLE_ZCARDS);
    for (let zcard of zcards) {
      const zelem = Html.div({});
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
      this.zcardTooltips.set(zcard.type, zcard.tooltip);
      this.bga.gameui.addTooltip(zelem.id, zcard.tooltip, '');
    }
  }

  private setupGameHtml(): void {
    this.bga.gameArea.getElement().appendChild(BblHtml.base_html());
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

  public hexDiv(rc: number): HTMLElement {
    return $(IDS.hexDiv(rc));
  }

  private handPosDiv(i: number): HTMLElement {
    const hand = $(IDS.HAND);
    while (i >= hand.childElementCount) {
      hand.appendChild(Html.div({}));
    }
    return $(IDS.HAND).childNodes.item(i)! as HTMLElement;
  }

  private markHexSelected(rc: number): void {
    this.hexDiv(rc).classList.add(CSS.SELECTED);
  }

  private unmarkHexSelected(rc: number): void {
    this.hexDiv(rc).classList.remove(CSS.SELECTED);
  }

  private setupPlayerBoard(player: PlayerData): void {
    const playerId = player.player_id;
    console.log('Setting up board for player ' + playerId);
    this.bga.playerPanels.getElement(playerId)
      .append(...BblHtml.player_board_ext(playerId, Game.playerIdToColorIndex[playerId]!));
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
    // this.bga.playerPanels.getScoreCounter(playerId).setValue(player.score);
  }


  private async notif_turnFinished(
    args: {
      player_id: number;
      hand_size: number;
      pool_size: number;
    }
  ) {
    this.updateHandCount(args);
    this.updatePoolCount(args);
  }

  private async notif_undoMove(
    args: {
      player_id: number;
      // points: number;
      rc: number;
      _private: {
        original_piece: string;
        handpos: number;
      } | undefined;
      captured_piece: string;
      piece: string;
    }
  ) {
    let anims: AnimationList = [];
    let hexDiv = $(IDS.hexDiv(args.rc));
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
    let destDiv = isActivePlayer ? this.handPosDiv(args._private!.handpos) : $(IDS.handcount(args.player_id));

    if (args._private?.original_piece) {
        // restore piece value, e.g. if it was originally hidden
        Attrs.setPiece(pieceDiv, args._private.original_piece, args.player_id);
    }
    // slide the played piece back to the hand
    anims.push(() => this.animationManager.slideAndAttach(pieceDiv, destDiv));

    await this.animationManager.playParallel(anims).then(() => {
      if (isActivePlayer) {
         destDiv.classList.add(CSS.PLAYABLE);
      }
      this.handCounters[args.player_id]!.incValue(1);
      // this.bga.playerPanels.getScoreCounter(args.player_id).incValue(-args.points);
    });
  }

  private async notif_piecePlayed(
    args: {
      player_id: number;
      // points: number;
      piece: string;
      handpos: number;
      rc: number;
      hand_size: number;
      captured_piece: string;
      // field_points: number;
      ziggurat_points: number;
      touched_ziggurats: number[];
    }
  ) {
    let anims: AnimationList = [];

    const hexDiv = this.hexDiv(args.rc);

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
          .then(() => Attrs.setPiece(pieceDiv, args.piece, args.player_id))
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
        args.touched_ziggurats.map((rc: number) =>
          () => this.animationManager.displayScoring(
              this.hexDiv(rc),
              1,
              this.bga.gameui.gamedatas.players[args.player_id]!.color,
              { extraClass: 'bbl_city_scoring', duration: 700 })
            .then(() => args.touched_ziggurats.forEach(this.unmarkHexSelected.bind(this))))
      ));
    }

    await this.animationManager.playParallel(anims);

    this.updateHandCount(args);
    // this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points);
  }

  private async notif_handRefilled(args: { hand: string[] }) {
    const anims: AnimationList = [];
    const pid = this.bga.gameui.player_id;
    const hand = $(IDS.HAND);
    let handPosDiv = hand.firstElementChild;
    for (let newPiece of args.hand) {
      if (!handPosDiv) {
        // dynamically expand hand if 7 size hand is chosen
        handPosDiv = Html.div({});
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
         } else if (pt != Attrs.pieceVal(newPiece!, pid)) {
           console.error("piece from args", newPiece, "not matches hand", pieceDiv);
         }
      }
      handPosDiv = handPosDiv!.nextElementSibling as (HTMLElement | null);
    }
    await this.animationManager.playParallel(anims);
  }

  private async notif_extraTurnUsed(args: { card: string; used: boolean; }) {
    const carddiv = $(IDS.zcard(args.card));
    if (carddiv == undefined) {
      console.error(`Could not find div for owned ${args.card} card`, args.card);
    } else {
      carddiv.setAttribute(Attrs.ZUSED, '');
    }
  }

  private async indicateNeighbors(
    winnerHexes: number[],
    otherHexes: number[]) {
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
      rc: number;
      player_name: string;
      player_id: number;
      winner_hexes: number[];
      other_hexes: number[];
    }) {
      // slight subtlety here; if there is a winner, leave the hex selected until after the cards is selected
      await this.indicateNeighbors(args.winner_hexes, args.other_hexes).then(() => { if (!args.player_id) this.unmarkHexSelected(args.rc) });
    // TODO: consider better visual treatments
  }

  private async notif_scoringSelection(
    args: {
      player_id: number;
      player_name: string;
      rc: number;
      city: string;
    }) {
    this.markHexSelected(args.rc);
  }

  private async notif_zigguratCardSelection(
    args: {
      zcard: string;
      player_id: number;
      cardused: boolean;
      // points: number;
      hex: number;
    }
  ) {
    this.unmarkHexSelected(args.hex);
    const dest = $(IDS.playerBoardZcards(args.player_id));
    const zelem = $(IDS.zcard(args.zcard));
    zelem.classList.remove(CSS.SELECTED);
    await this.animationManager.slideAndAttach(zelem, dest, { toPlaceholder: 'off' })
        .then(() => {
          // this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points);
          if (args.cardused) {
            zelem.setAttribute(Attrs.ZUSED, "true");
          }
        });
  }

  private async notif_cityScored(
    args: {
      rc: number;
      city: string;
      player_id: number;
      winner_hexes: number[];
      other_hexes: number[];
      details: {
        player_id: number;
        captured_city_count: number;
        network_locations: number[];
        scored_locations: number[];
        network_points: number;
        capture_points: number;
      }[];
    }
  ) {
    const hex = $(IDS.hexDiv(args.rc));

    let aa = this.bgaAnimationsActive();
    for (const playerId in args.details) {
      const details = args.details[playerId]!;
      if (aa) {
        for (const nh of details.network_locations) {
          let cl = this.hexDiv(nh).classList;
          cl.add(CSS.IN_NETWORK);
          if (!details.scored_locations.some(sh => (nh == sh))) {
            cl.add(CSS.UNIMPORTANT);
          }
        }
        await this.animationManager.displayScoring(
          hex,
          details.network_points,
          this.bga.gameui.gamedatas.players[playerId]!.color,
          { extraClass: 'bbl_city_scoring' });
        details.network_locations.forEach(
          (rc: number) => {
            let cl = this.hexDiv(rc).classList;
            cl.remove(CSS.IN_NETWORK);
            cl.remove(CSS.UNIMPORTANT);
          });
      }
      // this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.network_points);
    }

    await this.indicateNeighbors(args.winner_hexes, args.other_hexes);

    let dest = (args.player_id != 0)
      ? $(IDS.citycount(args.player_id))
      // TODO: find a better location for 'off the board' but not to any player?
      : this.bga.gameui.getGameAreaElement();

    await this.animationManager.slideOutAndDestroy(
      hex.firstElementChild as HTMLElement, dest, {}).then(() => {
        this.unmarkHexSelected(args.rc);
        for (const playerId in args.details) {
          const details = args.details[playerId]!;
          // this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.capture_points);
          this.updateCapturedCityCount(details);
        }
      }).then(() => this.unmarkHexSelected(args.rc));
  }

  private translatedPiece(piece: string): string {
    return this.bga.gameui.gamedatas.translated_pieces[piece] ?? '';
  }

  ///////
  private static zcardSalt: number = 0;
  private registerLogArgs(): void {
    this.registerLogArg('piece', (args) => Html.span({ title: this.translatedPiece(args.piece), attrs: Attrs.piece(args.piece, args.player_id) }));
    this.registerLogArg('city', (args) => Html.span({ title: this.translatedPiece(args.city), attrs: Attrs.piece(args.city, 0)}));
    this.registerLogArg('zcard', (args) => Html.span({
      id: `logzcard_${Game.zcardSalt++}`,
      title: this.zcardTooltips.get(args.zcard) ?? '',
      attrs: Attrs.ztype(args.zcard)}));
    this.registerLogArg('original_piece', (args) => Html.span({ title: this.translatedPiece(args.original_piece), attrs: Attrs.piece(args.original_piece, args.player_id)}));
  }
}
