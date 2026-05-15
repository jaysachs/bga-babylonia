import { colorIndexMap } from './colormap';
import { BGamedatas, Hex, PlayerData, Zcard } from "./bdata";
import { AttrLike, Html } from "./html";

export class Attrs implements AttrLike {
  toRecord(): Record<string, string> {
    return this.r;
  }
  private r: any = {};

  static readonly ZTYPE : string = 'bbl_ztype';
  static readonly ZUSED : string = 'bbl_zused';
  static readonly PIECE : string = 'bbl_piece';
  static readonly TT_PROCESSED : string = 'bbl_tt_processed';

  private static playerIdToColorIndex: Record<number, number> = {};
  static initializeColorMap(cm: Record<number, number>) {
    Attrs.playerIdToColorIndex = cm;
  }

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

  static piece(p: string, playerId? : number) : Attrs {
    return new Attrs().piece(p, playerId);
  }

  static setPiece(el: Element, p: string, playerId?: number) {
    el.setAttribute(Attrs.PIECE, Attrs.pieceVal(p, playerId));
  }

  /* private */ static pieceVal(p: string, playerId?: number): string {
    return (playerId && p != Piece.EMPTY)
      ? p + '_' + Attrs.playerIdToColorIndex[playerId]
      : p;
  }
  piece(p: string, playerId?: number): Attrs {
    this.r[Attrs.PIECE] = Attrs.pieceVal(p, playerId);
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

export class Piece {
  static readonly EMPTY = 'empty'
}

export class IDS {
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
  static readonly UNPLAYABLE = 'bbl_unplayable';
  static readonly UNIMPORTANT = 'bbl_unimportant';
}

export class View {

    public /* private */ handCounters: Counter[] = [];
    private poolCounters: Counter[] = [];
    private cityCounters: Counter[] = [];
    public /* private */ zcardTooltips = new Map<string, string>();
    private translatedPieces: Record<string,string>;
    private playerIdToColorIndex: Record<number,number> = [];

    constructor(private bga: Bga) {
        this.translatedPieces = {};
    }

    public setup(gamedatas: BGamedatas): void{
        for (const playerId in gamedatas.players) {
            this.playerIdToColorIndex[playerId] = colorIndexMap[gamedatas.players[playerId]!.color]!;
        }
        Attrs.initializeColorMap(this.playerIdToColorIndex);

        this.translatedPieces = gamedatas.translated_pieces;
        this.bga.gameArea.getElement().appendChild(View.base_html());

        console.log('setting up player boards', gamedatas.player_data);
        for (const pid in gamedatas.player_data) {
            this.setupPlayerBoard(gamedatas.player_data[pid]!);
        }

        console.log('setting the the game board');
        this.setupGameBoard(gamedatas.board);

        // FIXME: this doesn't work for spectators!
        console.log('setting up player hand', gamedatas.hand);
        gamedatas.hand.forEach((piece, i) => {
            const hpd = this.handPosDiv(i);
            if (piece && piece != Piece.EMPTY) {
                hpd.appendChild(this.createPieceDiv(piece, this.bga.gameui.player_id));
            }
        });

        console.log('Setting up ziggurat cards', gamedatas.ziggurat_cards);
        this.setupZcards(gamedatas.ziggurat_cards);
    }

    static readonly hstart = 38.0; // this the (negative) offset on left of board
    static readonly vstart = 9.0; // this is the offset on the top of the board
    static readonly height = 768 / 12.59; // 61 -- why? hexes on image seem to be 204px
    static readonly width = this.height * 1.155;
    static readonly hdelta = 0.75 * this.width + 2.0;
    static readonly vdelta = 1.0 * this.height + 2.0;

    private setupGameBoard(boardData: Hex[]) {
        const boardDiv = $(IDS.BOARD);
        for (const hex of boardData) {
            const hexDiv = View.makeHexDiv(hex);
            boardDiv.appendChild(hexDiv);
            if (hex.piece != null && hex.piece != Piece.EMPTY) {
                let pieceDiv = this.createPieceDiv(hex.piece, hex.board_player)
                hexDiv.appendChild(pieceDiv);
            }
        }
    }

    private setupPlayerBoard(player: PlayerData): void {
        const playerId = player.player_id;
        console.log('Setting up board for player ' + playerId);
        this.bga.playerPanels.getElement(playerId)
            .append(...View.player_board_ext(playerId, this.playerIdToColorIndex[playerId]!));
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

    public static makeHexDiv(hex: Hex): HTMLElement {
        const row = Math.trunc(hex.rc / 100);
        const col = Math.trunc(hex.rc % 100);
        let top = 100 * (this.vstart + row * this.vdelta / 2) / 768.0;
        let left = 100 * (this.hstart + col * this.hdelta) / 1024.0;
        return Html.div({ id:  IDS.hexDiv(hex.rc), style: [`top:${top}%`, `left:${left}%`] });
    }

    public static player_board_ext(player_id: number, color_index: number): HTMLElement[] {
        return [
            Html.div({},
                Html.span({classes:`bbl_pb_hand_label_${color_index}`}),
                Html.span({id: IDS.handcount(player_id)}),
            ),
            Html.div({},
                Html.span({classes:`bbl_pb_pool_label_${color_index}`}),
                Html.span({id: IDS.poolcount(player_id)}),
            ),
            Html.div({},
                Html.span({classes:'bbl_pb_city_label'}),
                Html.span({id: IDS.citycount(player_id)}),
            ),
            Html.div({id:IDS.playerBoardZcards(player_id), classes: 'bbl_pb_zcards'},
                Html.span({classes:'bbl_pb_zcard_label'})
            )
        ];
    }

    public static base_html(): HTMLElement {
        return Html.div({id:'bbl_main'},
            Html.div({id:'bbl_hand_container'},
                Html.div({id: IDS.HAND })
            ),
            Html.div({id:'bbl_board_container'},
                Html.div({id:IDS.BOARD})
            ),
            Html.div({id:'bbl_available_zcards_container', classes: "whiteblock"},
                Html.div({}, document.createTextNode(_('Ziggurat Cards'))),
                Html.div({id:IDS.AVAILABLE_ZCARDS})
            )
        );
    }

    public createPieceDiv(piece: string, player_id?: number) : HTMLElement {
        return Html.div({ attrs: Attrs.piece(piece, player_id) } );
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

    public renderedPiece(piece: string, player_id: number = 0): HTMLElement {
        return Html.span({ title: this.translatedPiece(piece), attrs: Attrs.piece(piece, player_id) });
    }

    public renderedZcard(id: string, zcard: string): HTMLElement {
        return Html.span({
            // FIXME: why do we need the ID?
            id: id,
            //      id: `logzcard_${Game.zcardSalt++}`,
            title: this.zcardTooltips.get(zcard) ?? '',
            attrs: Attrs.ztype(zcard)});
    }
}