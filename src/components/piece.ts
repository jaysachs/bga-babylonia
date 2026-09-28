import { BblPlayer, BblGamedatas, PieceType } from "../model/data";
import { AttrLike, Html } from "../libs/html";
import { TextFormatter } from "../libs/textformatter";

export class PieceManager {
    public constructor(private bga: Bga<BblPlayer, BblGamedatas>, private textFormatter: TextFormatter) { }

    public setup(): void {
        this.textFormatter.registerFormatter('piece', (args: any) => this.renderPieceArg(args.piece, args.player_id));
        this.textFormatter.registerFormatter('original_piece', (args: any) => this.renderPieceArg(args.original_piece, args.player_id));
        this.textFormatter.registerFormatter('captured_piece', (args: any ) => this.renderPieceArg(args.captured_piece));
        this.textFormatter.registerFormatter('city', (args) => this.renderPieceArg(args.city));
    }

    public isNonEmpty(p: PieceType | null): boolean { return p !== null && p !== undefined && p != 'empty' }
    public isCity(p: PieceType): boolean { return p?.startsWith('city_') }
    public isField(p: PieceType): boolean { return p?.startsWith('field_') }

    public pieceVal(p: PieceType, pl?: BblPlayer): string {
        return (pl && this.isNonEmpty(p))
            ? p + '_' + pl.color_index
            : p;
    }

    public pieceTypeFrom(el: Element | null): PieceType | null {
        if (!el) { return null; }
        return el.getAttribute(PieceManager.ATTR) as PieceType;
    }

    public setPieceType(el: Element, p: PieceType, pl?: BblPlayer) {
        el.setAttribute(PieceManager.ATTR, this.pieceVal(p, pl));
    }

    createDiv(piece: PieceType, player?: BblPlayer, text?: string): HTMLElement {
        return Html.div({ attrs: this.attr(piece, player), text: text });
    }

    private attr(piece: PieceType, player?: BblPlayer): AttrLike {
        return {
            bbl_piece: this.pieceVal(piece, player)
        };
    }
    private static readonly ATTR: string = 'bbl_piece';

    private renderPieceArg(piece: PieceType, player_id?: number): HTMLElement {
        const tp = this.bga.gameui.gamedatas.translated_pieces[piece];
        const translated = tp ? _(tp) : '';
        return Html.span({ title: translated, attrs: this.attr(piece, this.bga.players.getPlayerById(player_id ?? 0)) });
    }
}

