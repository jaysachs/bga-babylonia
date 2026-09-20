import { BblPlayer, BGamedatas, PieceType } from "./bdata";
import { AnimationManager } from "./bga-animations";
import { Html } from "./html";
import { IDS } from "./ids";
import { AnimationList } from "./more-animations";
import { Piece } from "./piece";
import { PlayerPanelManager } from "./player_panel";

export class HandManager {

    public constructor(private bga: Bga<BblPlayer, BGamedatas>, private animationManager: AnimationManager, private playerPanelManger: PlayerPanelManager, private player?: BblPlayer) {
        const hand = this.bga.gameui.gamedatas.hand;
        if (true) {
            hand?.forEach((piece, i) => {
                const hpd = this.handPosDiv(i);
                if (Piece.isNonEmpty(piece)) {
                    hpd.appendChild(Piece.createDiv(piece, this.player));
                }
            });
        } else {
            // FIXME: this fails because it has async animations that
            // don't finish by the time play_pieces state starts.
            if (hand) {
                this.refill(hand!);
            }
        }
    }

    public handPosDiv(i: number): HTMLElement {
        const hand = $(IDS.HAND);
        while (i >= hand.childElementCount) {
            hand.appendChild(Html.div({}));
        }
        return $(IDS.HAND).childNodes.item(i)! as HTMLElement;
    }

    public refill(hand: PieceType[]): Promise<any> {
        if (!this.player) {
            console.log("Spectator should not refill hand");
            return Promise.resolve();
        }
        const anims: AnimationList = [];
        const pid = this.player.player_id;
        hand.forEach((newPiece, i) => {
            const handPosDiv = this.handPosDiv(i);
            let pieceDiv = handPosDiv.firstElementChild as HTMLElement;
            if (!pieceDiv) {
                if (Piece.isNonEmpty(newPiece)) {
                    anims.push(() => {
                        pieceDiv = Piece.createDiv(newPiece, this.player);
                        this.playerPanelManger.poolcountElement(pid).appendChild(pieceDiv);
                        return this.animationManager.slideAndAttach(pieceDiv, handPosDiv, { fromPlaceholder: 'off', toPlaceholder: 'off' })
                    });
                }
            } else {
                let pt = Piece.get(pieceDiv);
                if (!pt) {
                    console.error("hand had piece div but no attribute");
                } else if (pt != Piece.pieceVal(newPiece!, this.player)) {
                    console.error("piece from args", newPiece, "not matches hand", pieceDiv);
                }
            }
        })
        return this.animationManager.playParallel(anims);
    }
}
