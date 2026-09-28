import { BblPlayer, BGamedatas } from "../bdata";
import { AnimationManager } from "../bgalibs/bga-animations";
import { BoardManager } from "../components/board";
import { HandManager } from "../components/hand";
import { PlayerPanelManager } from "../components/player_panel";
import { ZCardManager } from "../components/zcards";

export abstract class BabyloniaState {
    constructor(protected bga: Bga<BblPlayer, BGamedatas>,
        protected readonly animationManager: AnimationManager,
        protected readonly boardManager: BoardManager,
        protected readonly handManager: HandManager,
        protected readonly zcardManager: ZCardManager,
        protected readonly playerPanelManager: PlayerPanelManager) {
    }

    public onEnteringState(args: any, isCurrentPlayerActive: boolean) { }

    public onLeavingState(args: any, isCurrentPlayerActive: boolean) { }

    protected autoConfirmEnabled(): boolean {
        let p = this.bga.userPreferences.get(100);
        if (p == 0) {
            return this.bga.gameui.bRealtime;
        }
        return p == 2;
    }
}
