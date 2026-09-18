import { BabyloniaState } from "./base";

export class ScoreHexState extends BabyloniaState {
    override onEnteringState(args: { current_scoring_hex: number }, isCurrentPlayerActive: boolean) {
        this.boardManager.unmarkHexPlayable(args.current_scoring_hex);
        this.boardManager.markHexSelected(args.current_scoring_hex);
    }

    override onLeavingState(args: { current_scoring_hex: number }, isCurrentPlayerActive: boolean) {
        this.boardManager.unmarkHexSelected(args.current_scoring_hex);
    }
}
