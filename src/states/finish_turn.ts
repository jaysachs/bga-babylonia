import { HandPiece, PieceType } from "../bdata";
import { BabyloniaState } from "./base";

export class FinishTurnState extends BabyloniaState {
    async notif_turnFinished(
        args: {
            player_id: number;
            hand_size: number;
            pool_size: number;
        }
    ) {
        this.playerPanelManager.updateHandCount(args);
        this.playerPanelManager.updatePoolCount(args);
    }

    async notif_handRefilled(args: { hand: HandPiece[] }) {
        await this.handManager.refill(args.hand);
    }
}