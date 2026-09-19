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
        const handDiv = $(IDS.HAND);
        hand?.forEach((piece, i) => {
            const hpd = handDiv.appendChild(Html.div({}));
            if (Piece.isNonEmpty(piece)) {
                const pieceDiv = Piece.createDiv(piece, this.player)
                hpd.appendChild(pieceDiv);
            }
        });
        // FIXME: why does this fail?
        // if (hand) {
        //     this.refill(hand);
        // }
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
        const handDiv = $(IDS.HAND);
        let handPosDiv = handDiv.firstElementChild;
        for (let newPiece of hand) {
            if (!handPosDiv) {
                // dynamically expand hand if 7 size hand is chosen
                handPosDiv = Html.div({});
                handDiv.appendChild(handPosDiv);
            }
            let pieceDiv = handPosDiv!.firstElementChild as HTMLElement;
            if (!pieceDiv) {
                if (Piece.isNonEmpty(newPiece)) {
                    let destDiv = handPosDiv! as HTMLElement;
                    anims.push(() => {
                        pieceDiv = Piece.createDiv(newPiece, this.player);
                        this.playerPanelManger.poolcountElement(pid).appendChild(pieceDiv);
                        return this.animationManager.slideAndAttach(pieceDiv, destDiv, { fromPlaceholder: 'off' })
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
            handPosDiv = handPosDiv!.nextElementSibling as (HTMLElement | null);
        }
        return this.animationManager.playParallel(anims);
    }
}
