import { BblPlayer, BGamedatas, Hex, PieceType } from "./bdata";
import { Css } from "./css";
import { Html } from "./html";
import { IDS } from "./ids";
import { Piece } from "./piece";
import { TooltipManager } from "./tooltips";

export class BoardManager {

    public constructor(private bga: Bga<BblPlayer, BGamedatas>, private readonly tooltipManager: TooltipManager) {
        const boardData = this.bga.gameui.gamedatas.board;
        const boardDiv = $(IDS.BOARD);
        for (const hex of boardData) {
            const hexDiv = this.makeHexDiv(hex);
            boardDiv.appendChild(hexDiv);
            if (Piece.isNonEmpty(hex.piece)) {
                let pieceDiv = Piece.createDiv(hex.piece, this.bga.players.getPlayerById(hex.board_player));
                if (hex.scored) {
                    pieceDiv.classList.add(Css.SCORED);
                }
                hexDiv.appendChild(pieceDiv);
                if (Piece.isCity(hex.piece)) {
                    pieceDiv.id = `bbl_city_${hex.rc}`;
                    this.tooltipManager.add(pieceDiv.id, () => this.cityScoringHover(hex.rc));
                } else if (Piece.isField(hex.piece)) {
                    pieceDiv.id = `bbl_field_${hex.rc}`;
                    this.tooltipManager.add(pieceDiv.id, () => this.fieldScoringHover(hex.rc, hex.piece));
                }
            }
        }
    }

    static readonly hstart = 56.0; // this the (negative) offset on left of board
    static readonly vstart = 63.0; // this is the offset on the top of the board
    static readonly hdelta = 190; // this.height / 2.0 * 2.0 * (2.0 / 1.732) + 2.0;
    static readonly vdelta = 216; // 1.0 * this.height + 2.0;

    // Returns the hex (row,col) clicked on, or null if not a playable hex
    public selectedHexIfPlayable(target: EventTarget): number | null {
        let hexDiv = target as Element;
        while (hexDiv.parentElement != null && hexDiv.parentElement.id != IDS.BOARD) {
            hexDiv = hexDiv.parentElement;
        }
        if (hexDiv.parentElement == null) {
            return null;
        }
        // now check if it's allowed
        if (!hexDiv.classList.contains(Css.PLAYABLE) && !hexDiv.classList.contains(Css.SELECTABLE)) {
            return null;
        }
        const id = hexDiv.id.split('_');
        return Number(id[2]);
    }



    private makeHexDiv(hex: Hex): HTMLElement {
        const row = Math.trunc(hex.rc / 100);
        const col = Math.trunc(hex.rc % 100);
        const top = 100 * (BoardManager.vstart + row * BoardManager.vdelta / 2) / 2709.0;
        const left = 100 * (BoardManager.hstart + col * BoardManager.hdelta) / 3385.0;
        return Html.div({ id: IDS.hexDiv(hex.rc), style: [`top:${top}%`, `left:${left}%`] });
    }

    private playersInPlayerNoOrder(): BblPlayer[] {
        return this.bga.gameui.gamedatas.playerorder.map(
            pid => this.bga.players.getPlayerById(Number(pid))!
        );
    }


    private cityScoringHover(rc: number): HTMLElement {
        const scores = this.bga.gameui.gamedatas.potential_city_scoring[String(rc)]!;
        return Html.div({ classes: 'bbl_city_scoring_hover' },
            Html.span({ text: _("Current points") }),
            Html.div({ classes: 'bbl_city_scoring_hover_details' },
                ... this.playersInPlayerNoOrder().map(
                    p => Piece.createDiv("hidden", p, undefined, String(scores[String(p.player_id)] ?? 0)))
            )
        )
    }

    private fieldScoringHover(rc: number, piece: PieceType): HTMLElement {
        return Html.div({ classes: 'bbl_field_scoring_hover' },
            Html.span({ text: _("Field points") }),
            Html.div({ classes: 'bbl_field_scoring_hover_details' },
                Piece.createDiv(piece, undefined, "bbl_field_scoring_hover_piece"),
                Html.div({ id: "bbl_field_scoring_hover_points", text: `${this.fieldPoints(piece)}` })
            )
        )
    }

    private fieldPoints(piece: PieceType): number {
        switch (piece) {
            case 'field_5': return 5;
            case 'field_6': return 6;
            case 'field_7': return 7;
            case 'field_x': return this.bga.gameui.gamedatas.captured_city_count;
            default:
                console.error("asking field points for non-field: ", piece);
                return 0;
        }
    }

    // FIXME: create a BoardManager
    public hexDiv(rc: number): HTMLElement {
        return $(IDS.hexDiv(rc));
    }

    public markHexScored(rc: number): void {
        this.hexDiv(rc).firstElementChild?.classList.add(Css.SCORED);
    }

    public markHexPlayable(rc: number): void {
        this.hexDiv(rc).classList.add(Css.PLAYABLE);
    }

    public unmarkHexPlayable(rc: number): void {
        this.hexDiv(rc).classList.remove(Css.PLAYABLE);
    }

    public markAllHexesUnplayable(): void {
        $(IDS.BOARD).querySelectorAll('.' + Css.PLAYABLE)
            .forEach(div => div.classList.remove(Css.PLAYABLE));
    }

    public markHexSelectable(rc: number): void {
        this.hexDiv(rc).classList.add(Css.SELECTABLE);
    }

    public markHexesSelectable(hexes: number[]): void {
        hexes.forEach((hex) => this.markHexSelectable(hex));
    }

    public unmarkHexSelectable(rc: number): void {
        this.hexDiv(rc).classList.remove(Css.SELECTABLE);
    }

    public markAllHexesUnselectable(): void {
        $(IDS.BOARD).querySelectorAll('.' + Css.SELECTABLE)
            .forEach(div => div.classList.remove(Css.SELECTABLE));
    }

    public markHexesPlayable(hexes: number[]): void {
        hexes.forEach((hex) => this.markHexPlayable(hex));
    }

    public markHexSelected(rc: number): void {
        this.hexDiv(rc).classList.add(Css.SELECTED);
    }

    public unmarkHexSelected(rc: number): void {
        this.hexDiv(rc).classList.remove(Css.SELECTED);
    }
}