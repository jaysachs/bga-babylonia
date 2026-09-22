import { BblPlayer, PieceType } from "./bdata";
import { AttrLike, Html } from "./html";

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

    static createDiv(piece: PieceType, player?: BblPlayer, id?: string, text?: string): HTMLElement {
        return Html.div({ attrs: Piece.attr(piece, player), id: id, text: text });
    }

    static attr(piece: PieceType, player?: BblPlayer): AttrLike {
        return {
            bbl_piece: Piece.pieceVal(piece, player)
        };
    }
    private static readonly ATTR: string = 'bbl_piece';

}

