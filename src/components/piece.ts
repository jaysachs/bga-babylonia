import { BblPlayer, BGamedatas, PieceType } from "../model/data";
import { AttrLike, Html } from "../libs/html";
import { TextFormatter } from "../libs/textformatter";
import { BaseComponent } from "../libs/basecomponent";

export class PieceManager {
    public constructor(private bga: Bga<BblPlayer, BGamedatas>, private textFormatter: TextFormatter) { }

    isNonEmpty(p: PieceType | null): boolean { return p !== null && p !== undefined && p != 'empty' }
    isCity(p: PieceType): boolean { return p?.startsWith('city_') }
    isField(p: PieceType): boolean { return p?.startsWith('field_') }

    pieceVal(p: PieceType, pl?: BblPlayer): string {
        return (pl && this.isNonEmpty(p))
            ? p + '_' + pl.color_index
            : p;
    }

    get(el: Element | null): PieceType | null {
        if (!el) { return null; }
        return el.getAttribute(PieceManager.ATTR) as PieceType;
    }

    set(el: Element, p: PieceType, pl?: BblPlayer) {
        el.setAttribute(PieceManager.ATTR, this.pieceVal(p, pl));
    }

    createDiv(piece: PieceType, player?: BblPlayer, text?: string): HTMLElement {
        return Html.div({ attrs: this.attr(piece, player), text: text });
    }

    attr(piece: PieceType, player?: BblPlayer): AttrLike {
        return {
            bbl_piece: this.pieceVal(piece, player)
        };
    }
    private static readonly ATTR: string = 'bbl_piece';

    private renderPieceForLog(piece: PieceType, player_id?: number): HTMLElement {
        const tp = this.bga.gameui.gamedatas.translated_pieces[piece];
        const translated = tp ? _(tp) : '';
        return Html.span({ title: translated, attrs: this.attr(piece, this.bga.players.getPlayerById(player_id ?? 0)) });
    }

    public setup(): void {
        this.textFormatter.registerFormatter('piece', (args: any) => this.renderPieceForLog(args.piece, args.player_id));
        this.textFormatter.registerFormatter('original_piece', (args: any) => this.renderPieceForLog(args.original_piece, args.player_id));
        this.textFormatter.registerFormatter('captured_piece', (args: any ) => this.renderPieceForLog(args.captured_piece, args.player_id));
    }
}

