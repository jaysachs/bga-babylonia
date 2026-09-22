import { PieceType } from "../bdata";
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
    }

    private async handleBoardSelection(hex: number, hexDiv: HTMLElement, piece: PieceType | null, capturedPieceDiv: HTMLElement | undefined | null, terrain: string) {
        this.boardManager.unmarkHexSelectable(hex);
        this.boardManager.markHexSelected(hex);
        // TODO: add tooltip
        this.bga.statusBar.setTitle(_('Score ${city} at ${hex}?'), {
            hex: this.hexes[hex], city: piece,
        });
        this.bga.statusBar.addActionButton(_('Confirm'),
            () => this.bga.actions.performAction('actSelectHexToScore', { rc: hex }).then(() => this.boardManager.unmarkHexPlayable(hex)),
            { autoclick: this.autoConfirmEnabled() });
        this.bga.statusBar.addActionButton(_('Cancel'),
            () => {
                this.boardManager.unmarkHexSelected(hex);
                this.boardManager.markHexSelectable(hex);
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
        this.boardManager.unmarkHexSelectable(args.rc);
        this.boardManager.markHexSelected(args.rc);
    }

}
