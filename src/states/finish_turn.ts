import { PieceType } from "../bdata";
import { Html } from "../html";
import { AnimationList } from "../more-animations";
import { Attrs, IDS, Piece } from "../view";
import { BabyloniaState } from "./base";

export class FinishTurnState extends BabyloniaState {
  async notif_turnFinished(
    args: {
      player_id: number;
      hand_size: number;
      pool_size: number;
    }
  ) {
    this.view.updateHandCount(args);
    this.view.updatePoolCount(args);
  }

  async notif_handRefilled(args: { hand: PieceType[] }) {
    const anims: AnimationList = [];
    const pid = this.bga.gameui.player_id;
    const hand = $(IDS.HAND);
    let handPosDiv = hand.firstElementChild;
    for (let newPiece of args.hand) {
      if (!handPosDiv) {
        // dynamically expand hand if 7 size hand is chosen
        handPosDiv = Html.div({});
        hand.appendChild(handPosDiv);
      }
      let pieceDiv = handPosDiv!.firstElementChild as HTMLElement;
      if (!pieceDiv) {
        if (newPiece && newPiece != Piece.EMPTY) {
          let destDiv = handPosDiv! as HTMLElement;
          anims.push(() => {
            pieceDiv = this.view.createPieceDiv(newPiece, pid);
            $(IDS.poolcount(pid)).appendChild(pieceDiv);
            return this.animationManager.slideAndAttach(pieceDiv, destDiv, { fromPlaceholder: 'off' })
          });
        }
      } else {
         let pt = pieceDiv.getAttribute(Attrs.PIECE);
         if (!pt) {
           console.error("hand had piece div but no attribute");
         } else if (pt != Attrs.pieceVal(newPiece!, this.bga.players.getPlayerById(pid))) {
           console.error("piece from args", newPiece, "not matches hand", pieceDiv);
         }
      }
      handPosDiv = handPosDiv!.nextElementSibling as (HTMLElement | null);
    }
    await this.animationManager.playParallel(anims);
  }
}