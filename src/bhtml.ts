import { Hex } from "./bdata";
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

export class BblHtml {
  static readonly hstart = 38.0; // this the (negative) offset on left of board
  static readonly vstart = 9.0; // this is the offset on the top of the board
  static readonly height = 768 / 12.59; // 61 -- why? hexes on image seem to be 204px
  static readonly width = this.height * 1.155;
  static readonly hdelta = 0.75 * this.width + 2.0;
  static readonly vdelta = 1.0 * this.height + 2.0;

  public static makeHexDiv(hex: Hex): HTMLElement {
    const row = Math.trunc(hex.rc / 100);
    const col = Math.trunc(hex.rc % 100);
    let top = 100 * (this.vstart + row * this.vdelta / 2) / this.height;
    let left = 100 * (this.hstart + col * this.hdelta) / this.width;
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
}
