import { BGamedatas, Hex, BblPlayer, Zcard, PieceType } from "./bdata";
import { AttrLike, Html } from "./html";

export class Attrs implements AttrLike {
  toRecord(): Record<string, string> {
    return this.r;
  }
  private r: any = {};

  static readonly ZTYPE: string = 'bbl_ztype';
  static readonly ZUSED: string = 'bbl_zused';
  static readonly PIECE: string = 'bbl_piece';

  static ztype(zt: string): Attrs {
    return new Attrs().ztype(zt);
  }
  ztype(zt: string): Attrs {
    this.r[Attrs.ZTYPE] = zt;
    return this;
  }

  static zused(u: boolean): Attrs {
    return new Attrs().zused(u);
  }
  zused(u: boolean): Attrs {
    if (u) {
      this.r[Attrs.ZUSED] = "true";
    }
    return this;
  }

  static piece(p: PieceType, pl?: BblPlayer): Attrs {
    return new Attrs().piece(p, pl);
  }

  static setPiece(el: Element, p: PieceType, pl?: BblPlayer) {
    el.setAttribute(Attrs.PIECE, Attrs.pieceVal(p, pl));
  }

  /* private */ static pieceVal(p: PieceType, pl?: BblPlayer): string {
    return (pl && Piece.isNonEmpty(p))
      ? p + '_' + pl.color_index
      : p;
  }
  piece(p: PieceType, pl?: BblPlayer): Attrs {
    this.r[Attrs.PIECE] = Attrs.pieceVal(p, pl);
    return this;
  }
}

export class Piece {
  static isNonEmpty(p: PieceType | null): boolean { return p !== null && p !== undefined && p != 'empty' }
  static isCity(p: PieceType): boolean { return p?.startsWith('city_') }
}

export class IDS {
  static readonly AVAILABLE_ZCARDS: string = 'bbl_available_zcards';
  static readonly BOARD = 'bbl_board';
  static readonly OFF_BOARD = 'bbl_offboard';
  static readonly HAND = 'bbl_hand';
  static readonly MAIN = 'bbl_main';

  static handcount(playerId: number): string {
    return `bbl_handcount_${playerId}`;
  }

  static poolcount(playerId: number): string {
    return `bbl_poolcount_${playerId}`;
  }

  static citycount(playerId: number): string {
    return `bbl_citycount_${playerId}`;
  }

  static hexDiv(rc: number): string {
    return `bbl_hex_${rc}`;
  }

  static playerBoardZcards(playerId: number): string {
    return `bbl_zcards_${playerId}`;
  }

  static zcard(type: string): string {
    return `bbl_${type}`;
  }
}

export class CSS {
  static readonly IN_NETWORK = 'bbl_in_network';
  static readonly SELECTED = 'bbl_selected';
  static readonly PLAYABLE = 'bbl_playable';
  static readonly SELECTING = 'bbl_selecting';
  static readonly SELECTABLE = 'bbl_selectable';
  static readonly UNPLAYABLE = 'bbl_unplayable';
  static readonly UNIMPORTANT = 'bbl_unimportant';
  static readonly LAYOUT_UNDER_BOARD = 'bbl_altflow';
  static readonly IS_SPECTATOR = 'bbl_is_spectator';
  static readonly SCORED = 'bbl_scored';
}

export class View {

  private handCounters: Counter[] = [];
  private poolCounters: Counter[] = [];
  private cityCounters: Counter[] = [];
  private zcardTooltips = new Map<string, string>();
  private translatedPieces: Record<string, string>;

  constructor(private bga: Bga<BblPlayer, BGamedatas>) {
    this.translatedPieces = {};
  }

  public async setup(gamedatas: BGamedatas) {
    this.bga.gameui.onScreenWidthChange = () => this.handleResize();
    this.translatedPieces = gamedatas.translated_pieces;
    this.bga.gameArea.getElement().appendChild(this.base_html());

    if (this.bga.players.isCurrentPlayerSpectator()) {
      $(IDS.MAIN).classList.add(CSS.IS_SPECTATOR);
    }

    console.debug('setting up player boards');
    for (const pid in gamedatas.players) {
      this.setupPlayerBoard(gamedatas.players[pid]!);
    }

    console.debug('setting the the game board');
    this.setupGameBoard(gamedatas.board);

    console.debug('setting up player hand', gamedatas.hand);
    gamedatas.hand?.forEach((piece, i) => {
      const hpd = this.handPosDiv(i);
      if (Piece.isNonEmpty(piece)) {
        const pieceDiv = this.createPieceDiv(piece, this.bga.gameui.player_id)
        hpd.appendChild(pieceDiv);
      }
    });

    console.debug('Setting up ziggurat cards', gamedatas.ziggurat_cards);
    this.setupZcards(gamedatas.ziggurat_cards);
    this.bga.gameui.wait(1500).then(() => this.handleResize());
  }

  static readonly hstart = 56.0; // this the (negative) offset on left of board
  static readonly vstart = 63.0; // this is the offset on the top of the board
  static readonly hdelta = 190; // this.height / 2.0 * 2.0 * (2.0 / 1.732) + 2.0;
  static readonly vdelta = 216; // 1.0 * this.height + 2.0;

  private makeHexDiv(hex: Hex): HTMLElement {
    const row = Math.trunc(hex.rc / 100);
    const col = Math.trunc(hex.rc % 100);
    const top = 100 * (View.vstart + row * View.vdelta / 2) / 2709.0;
    const left = 100 * (View.hstart + col * View.hdelta) / 3385.0;
    return Html.div({ id: IDS.hexDiv(hex.rc), style: [`top:${top}%`, `left:${left}%`] });
  }

  private addTooltip(id: string, content: HTMLElement | (() => (HTMLElement))) {
    var tooltip: any;
    if (content instanceof HTMLElement) {
      this.bga.gameui.addTooltipHtml(id, content.outerHTML);
      tooltip = (this.bga.gameui as any).tooltips[id];
    } else {
      this.bga.gameui.addTooltipHtml(id, "placeholder");
      tooltip = (this.bga.gameui as any).tooltips[id];
      tooltip.getContent = () => content().outerHTML;
    }
    $(id).addEventListener('pointerenter', (e) => tooltip.open(id));
  }

  // This includes spots for cards
  static readonly map_aspect_ratio = 808 / 1082; // 2709 / 3385;

  private initialPageRectTop = 0;
  private gotit: boolean = false;
  private handleResize() {
    const pageEl = document.getElementById('page-content');
    const pageRect = pageEl!.getBoundingClientRect();

    /*
    console.log(pageRect.top, pageRect.width);
    console.log(window.visualViewport!.height, window.visualViewport!.scale);
    */

    // So this mess: when the page scrolls, pageRect.top shrinks from about 242 to 132
    //  because of the fixed location of the page title bar removes it from the flow.
    //  So we can't use pageRect.top. But we do know that when first loaded, it's in the
    //  right place.
    // But of course, for some it isn't right until after the *2nd* resize happens.
    // And it's inconsistent :-( )
    if (this.initialPageRectTop == 0) {
      this.initialPageRectTop = pageRect.top;
    }
    if (!this.gotit && pageRect.top != this.initialPageRectTop) {
      this.initialPageRectTop = pageRect.top;
      this.gotit = true;
    }

    const vertAvail = window.visualViewport!.height * window.visualViewport!.scale - this.initialPageRectTop;
    // "horizontal" "default" layout
    var w1 = pageRect.width * (1082 - 112) / 1082; // 0.889
    // 1082 808
    var h1 = w1 * View.map_aspect_ratio;
    if (h1 > vertAvail) {
      w1 = vertAvail / View.map_aspect_ratio;
      h1 = vertAvail;
    }

    // "vertical" "alt" layout
    // 747 101
    // 1494 162
    var h2 = vertAvail * 1494 / (1494 + 182); // (882-92)/882;
    var w2 = h2 / View.map_aspect_ratio;
    if (w2 > pageRect.width) {
      w2 = pageRect.width;
    }

    const mainElCl = document.getElementById(IDS.MAIN)!.classList;
    w1 = w1 * (1082 - 112) / 1082;
    w2 = w2 * (1082 - 112) / 1082;
    var width = w1;
    if (w1 >= w2) {
      width = w1;
      mainElCl.remove(CSS.LAYOUT_UNDER_BOARD);
    } else {
      width = w2;
      mainElCl.add(CSS.LAYOUT_UNDER_BOARD);
    }
    document.body.style.setProperty('--bbl-board-width', `${width}px`);
  }

  private setupGameBoard(boardData: Hex[]) {
    const boardDiv = $(IDS.BOARD);
    for (const hex of boardData) {
      const hexDiv = this.makeHexDiv(hex);
      boardDiv.appendChild(hexDiv);
      if (Piece.isNonEmpty(hex.piece)) {
        let pieceDiv = this.createPieceDiv(hex.piece, hex.board_player)
        if (hex.scored) {
          pieceDiv.classList.add(CSS.SCORED);
        }
        hexDiv.appendChild(pieceDiv);
        if (Piece.isCity(hex.piece)) {
          pieceDiv.id = `bbl_city_${hex.rc}`;
          this.addTooltip(pieceDiv.id, () => this.scoringHover(hex.rc));
        }
      }
    }
  }

  private setupPlayerBoard(player: BblPlayer): void {
    const playerId = player.player_id;
    console.debug('Setting up board for player ' + playerId);
    this.bga.playerPanels.getElement(playerId).append(...this.player_board_ext(playerId));
    //  create counters per player
    this.handCounters[playerId] = new ebg.counter();
    this.handCounters[playerId]!.create(IDS.handcount(playerId));
    this.poolCounters[playerId] = new ebg.counter();
    this.poolCounters[playerId]!.create(IDS.poolcount(playerId));
    this.cityCounters[playerId] = new ebg.counter();
    this.cityCounters[playerId]!.create(IDS.citycount(playerId));
    this.updateHandCount(player, false);
    this.updatePoolCount(player, false);
    this.updateCapturedCityCount(player, false);
    this.bga.playerPanels.getScoreCounter(playerId).setValue(Number(player.score));
  }

  private setupZcards(zcards: Zcard[]): void {
    const available = $(IDS.AVAILABLE_ZCARDS);
    for (let zcard of zcards) {
      const zelem = Html.div({ id: IDS.zcard(zcard.type), attrs: Attrs.ztype(zcard.type).zused(zcard.used) });
      const zcont = Html.div({});
      available.appendChild(zcont);
      if (zcard.owning_player_id != 0) {
        $(IDS.playerBoardZcards(zcard.owning_player_id)).appendChild(zelem);
      } else {
        zcont.appendChild(zelem);
      }
      this.zcardTooltips.set(zcard.type, zcard.tooltip);

      this.addTooltip(zelem.id, this.zcardTooltip(zcard));
      // const tooltip = (this.bga.gameui as any).tooltips[zelem.id];
      // zelem.addEventListener('pointerenter', (e) => tooltip.open(zelem.id) );
    }
  }

  private zcardTooltip(zcard: Zcard): HTMLElement {
    return Html.div({ classes: 'bbl_zcard_hover' },
      Html.div({ attrs: Attrs.ztype(zcard.type) }),
      Html.div({ classes: 'bbl_zcard_description', text: zcard.tooltip })
    );
  }

  private updateCounter(counter: Counter, value: number, animate: boolean) {
    if (animate) {
      counter.toValue(value);
    } else {
      counter.setValue(value);
    }
  }

  public updateHandCount(player: { player_id: number; hand_size: number; }, animate: boolean = true) {
    this.updateCounter(this.handCounters[player.player_id]!,
      player.hand_size,
      animate);
  }

  public updatePoolCount(player: { player_id: number; pool_size: number }, animate: boolean = true) {
    this.updateCounter(this.poolCounters[player.player_id]!,
      player.pool_size,
      animate);
  }

  public updateCapturedCityCount(player: { player_id: number; captured_city_count: number }, animate: boolean = true) {
    this.updateCounter(this.cityCounters[player.player_id]!,
      player.captured_city_count,
      animate);
  }

  private player_board_ext(player_id: number): HTMLElement[] {
    const colorIndex = this.bga.players.getPlayerById(player_id)?.color_index;
    return [
      Html.div({title: _('number of tiles in hand')},
        Html.span({ id: IDS.handcount(player_id), classes: ['bbl_pb_hand', `bbl_pb_hand_label_${colorIndex}`] }),
      ),
      Html.div({title: _('number of tiles in pool')},
        Html.span({ id: IDS.poolcount(player_id), classes: ['bbl_pb_pool', `bbl_pb_pool_label_${colorIndex}`] }),
      ),
      Html.div({title: _('number of captured cities')},
        Html.span({ id: IDS.citycount(player_id), classes: ['bbl_pb_city', 'bbl_pb_city_label'] }),
      ),
      Html.div({ id: IDS.playerBoardZcards(player_id), classes: 'bbl_pb_zcards' }
      ),
    ];
  }

  private static range(start: number, end: number): number[] {
    return Array.from({length: (end - start + 1)}, (v, k) => k + start);
  }

  private base_html(): HTMLElement {
    return Html.div({},
      Html.div({ id: IDS.MAIN },
        Html.div({ id: "bbl_hand_container" },
          Html.div({ id: IDS.HAND })
        ),
        Html.div({ id: 'bbl_board_container' },
          Html.div({ id: "bbl_available_zcards_container" },
            Html.div({ id: IDS.AVAILABLE_ZCARDS })
          ),
          Html.div({ id: 'bbl_column_headers'},
            ... View.range('A'.charCodeAt(0), 'Q'.charCodeAt(0)).map(c => Html.span({ text: String.fromCharCode(c)})),
          ),
          Html.div({ id: 'bbl_row_headers'},
            ... View.range(1, 23).map(c => Html.span({ text: String(c)})),
          ),
          Html.div({ id: IDS.BOARD },
          )
        )
      ),
      Html.div({ id: IDS.OFF_BOARD })
    );
  }

  private playersInPlayerNoOrder(): BblPlayer[] {
    return this.bga.gameui.gamedatas.playerorder.map(
      pid => this.bga.players.getPlayerById(Number(pid))!
    );
  }

  private scoringHover(rc: number): HTMLElement {
    const scores = this.bga.gameui.gamedatas.potentialCityScoring[String(rc)]!;
    return Html.div({ classes: 'bbl_city_scoring_hover' },
      Html.span({ text: _("Current points") }),
      Html.div({ classes: 'bbl_city_scoring_hover_details' },
        ... this.playersInPlayerNoOrder().map(
          p => Html.div({ attrs: Attrs.piece("hidden", p), text: String(scores[String(p.player_id)] ?? 0) }))
      )
    )
  }

  public createPieceDiv(piece: PieceType, player_id: number): HTMLElement {
    return Html.div({ attrs: Attrs.piece(piece, this.bga.players.getPlayerById(player_id)) });
  }

  public hexDiv(rc: number): HTMLElement {
    return $(IDS.hexDiv(rc));
  }

  public handPosDiv(i: number): HTMLElement {
    const hand = $(IDS.HAND);
    while (i >= hand.childElementCount) {
      hand.appendChild(Html.div({}));
    }
    return $(IDS.HAND).childNodes.item(i)! as HTMLElement;
  }

  public markHexScored(rc: number): void {
    this.hexDiv(rc).firstElementChild?.classList.add(CSS.SCORED);
  }

  public markHexPlayable(rc: number): void {
    this.hexDiv(rc).classList.add(CSS.PLAYABLE);
  }

  public unmarkHexPlayable(rc: number): void {
    this.hexDiv(rc).classList.remove(CSS.PLAYABLE);
  }

  public markAllHexesUnplayable(): void {
    $(IDS.BOARD).querySelectorAll('.' + CSS.PLAYABLE)
      .forEach(div => div.classList.remove(CSS.PLAYABLE));
  }

  public markHexSelectable(rc: number): void {
    this.hexDiv(rc).classList.add(CSS.SELECTABLE);
  }

  public markHexesSelectable(hexes: number[]): void {
    hexes.forEach((hex) => this.markHexSelectable(hex));
  }

  public unmarkHexSelectable(rc: number): void {
    this.hexDiv(rc).classList.remove(CSS.SELECTABLE);
  }

  public markAllHexesUnselectable(): void {
    $(IDS.BOARD).querySelectorAll('.' + CSS.SELECTABLE)
      .forEach(div => div.classList.remove(CSS.SELECTABLE));
  }

  public markHexesPlayable(hexes: number[]): void {
    hexes.forEach((hex) => this.markHexPlayable(hex));
  }

  public markHexSelected(rc: number): void {
    this.hexDiv(rc).classList.add(CSS.SELECTED);
  }

  public unmarkHexSelected(rc: number): void {
    this.hexDiv(rc).classList.remove(CSS.SELECTED);
  }

  private translatedPiece(piece: string): string {
    return this.translatedPieces[piece] ?? '';
  }

  public renderedPiece(piece: PieceType, player_id: number = 0): HTMLElement {
    return Html.span({ title: this.translatedPiece(piece), attrs: Attrs.piece(piece, this.bga.players.getPlayerById(player_id)) });
  }

  public renderedZcard(zcard: string): HTMLElement {
    return Html.span({
      title: this.zcardTooltips.get(zcard) ?? '',
      attrs: Attrs.ztype(zcard)
    });
  }
}