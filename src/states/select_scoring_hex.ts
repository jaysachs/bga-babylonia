import { IDS } from "../ids";
import { Piece } from "../piece";
import { BabyloniaState } from "./base";

export class SelectScoringHexState extends BabyloniaState {
    private handler = (e: Event) => this.onBoardClicked(e)
    private hexes: string[] = [];

    override onEnteringState(args: { hexes: string[] }, isCurrentPlayerActive: boolean) {
        this.hexes = args.hexes;
        if (isCurrentPlayerActive) {
            const rcs = Object.keys(args.hexes).map(Number);
            this.boardManager.markHexesSelectable(rcs);
            $(IDS.BOARD).addEventListener('click', this.handler);
        }
    }
    override onLeavingState(args: any, isCurrentPlayerActive: boolean) {
        if (isCurrentPlayerActive) {
            $(IDS.BOARD).removeEventListener('click', this.handler);
        }
    }

    private onBoardClicked(event: Event) {
        event.preventDefault();
        event.stopPropagation();

        const hex = this.boardManager.selectedHexIfPlayable(event.target!);
        if (hex === null) {
            return;
        }
        let piece = Piece.get(this.boardManager.hexDiv(hex).firstElementChild!);
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
    }

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
