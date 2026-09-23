import { PieceType } from "../bdata";
import { HexSelectionData } from "../board";
import { BabyloniaState } from "./base";

export class SelectScoringHexState extends BabyloniaState {
    private hexes: string[] = [];

    override onEnteringState(args: { hexes: string[] }, isCurrentPlayerActive: boolean) {
        this.hexes = args.hexes;
        if (isCurrentPlayerActive) {
            const rcs = Object.keys(args.hexes).map(Number);
            this.boardManager.addHandler(this.boardHandler);
            this.boardManager.markHexesSelectable(rcs);
        }
    }
    override onLeavingState(args: any, isCurrentPlayerActive: boolean) {
        if (isCurrentPlayerActive) {
            this.boardManager.removeHandler(this.boardHandler);
        }
        this.boardManager.unmarkHexesSelectable(Object.keys(args.hexes).map(Number));
    }

    private async handleBoardSelection(data: HexSelectionData) {
        this.boardManager.markHexSelected(data.hex);
        // TODO: add tooltip
        this.bga.statusBar.setTitle(_('Score ${city} at ${hex}?'), {
            hex: this.hexes[data.hex], city: data.piece,
        });
        this.bga.statusBar.removeActionButtons();
        this.bga.statusBar.addActionButton(_('Confirm'),
            () => this.bga.actions.performAction('actSelectHexToScore', { rc: data.hex })
                .then(() => this.boardManager.unmarkHexPlayable(data.hex)),
            { autoclick: this.autoConfirmEnabled() });
        this.bga.statusBar.addActionButton(_('Cancel'),
            () => {
                this.boardManager.unmarkHexSelected(data.hex);
                this.bga.states.restoreServerGameState();
            },
            { color: "secondary" });
    };

    private boardHandler = this.handleBoardSelection.bind(this);

    async notif_scoringSelection(
        args: {
            player_id: number;
            player_name: string;
            rc: number;
            city: string;
        }) {
        this.boardManager.markHexSelected(args.rc);
    }

}
