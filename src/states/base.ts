import { BblPlayer, BGamedatas } from "../bdata";
import { AnimationManager } from "../bga-animations";
import { BoardManager } from "../board";
import { Css } from "../css";
import { HandManager } from "../hand";
import { IDS } from "../ids";
import { PlayerPanelManager } from "../player_panel";
import { TooltipManager } from "../tooltips";
import { ZCardManager } from "../zcards";

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
