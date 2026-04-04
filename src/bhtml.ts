import { RowCol } from "./bdata";
import { AttrLike } from "./html";

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

export class CSS {
  static readonly IN_NETWORK = 'bbl_in_network';
  static readonly SELECTED = 'bbl_selected';
  static readonly PLAYABLE = 'bbl_playable';
  static readonly UNPLAYABLE = 'bbl_unplayable';
  static readonly UNIMPORTANT = 'bbl_unimportant';
}

export class Html {
  static readonly hstart = 38.0; // this is related to board width but not sure how
  static readonly vstart = 9.0; // depends on board size too
  static readonly height = 768 / 12.59;
  static readonly width = this.height * 1.155;
  static readonly hdelta = 0.75 * this.width + 2.0;
  static readonly vdelta = 1.0 * this.height + 2.0;

  public static makeHexDiv(rc: RowCol): HTMLElement {
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
