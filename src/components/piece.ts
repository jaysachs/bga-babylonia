import { BblPlayer, BGamedatas, PieceType } from "../model/data";
import { AttrLike, Html } from "../libs/html";
import { TextFormatter } from "../libs/textformatter";

export class Piece {
    static isNonEmpty(p: PieceType | null): boolean { return p !== null && p !== undefined && p != 'empty' }
    static isCity(p: PieceType): boolean { return p?.startsWith('city_') }
    static isField(p: PieceType): boolean { return p?.startsWith('field_') }

    static pieceVal(p: PieceType, pl?: BblPlayer): string {
        return (pl && Piece.isNonEmpty(p))
            ? p + '_' + pl.color_index
            : p;
    }

    static get(el: Element | null): PieceType | null {
        if (!el) { return null; }
        return el.getAttribute(Piece.ATTR) as PieceType;
    }

    static set(el: Element, p: PieceType, pl?: BblPlayer) {
        el.setAttribute(Piece.ATTR, Piece.pieceVal(p, pl));
    }

    static createDiv(piece: PieceType, player?: BblPlayer, text?: string): HTMLElement {
        return Html.div({ attrs: Piece.attr(piece, player), text: text });
    }

    static attr(piece: PieceType, player?: BblPlayer): AttrLike {
        return {
            bbl_piece: Piece.pieceVal(piece, player)
        };
    }
    private static readonly ATTR: string = 'bbl_piece';

    private static renderPieceForLog(bga: Bga<BblPlayer, BGamedatas>, piece: PieceType, player_id?: number): HTMLElement {
        const tp = /* this. */ bga.gameui.gamedatas.translated_pieces[piece];
        const translated = tp ? _(tp) : '';
        return Html.span({ title: translated, attrs: Piece.attr(piece, /* this. */ bga.players.getPlayerById(player_id ?? 0)) });
    }

    public static setup(bga: Bga<BblPlayer, BGamedatas>, textFormatter: TextFormatter): void {
        /* this. */ textFormatter.registerFormatter('piece', (args: any) => /* this. */ Piece.renderPieceForLog(bga, args.piece, args.player_id));
        /* this. */ textFormatter.registerFormatter('original_piece', (args: any) => /* this. */ Piece.renderPieceForLog(bga, args.original_piece, args.player_id));
        /* this. */ textFormatter.registerFormatter('captured_piece', (args: any ) => /* this. */ Piece.renderPieceForLog(bga, args.captured_piece, args.player_id));

    }
}

