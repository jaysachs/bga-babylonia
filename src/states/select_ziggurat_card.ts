import { Css } from "../css";
import { BabyloniaState } from "./base";

type StateArgs = {
    hex: number;
    available_cards: string[];
}

export class SelectZigguratCardState extends BabyloniaState {

    override onEnteringState(args: StateArgs, isCurrentPlayerActive: boolean) {
        this.boardManager.markHexSelected(args.hex);
        if (isCurrentPlayerActive) {
            this.zcardManager.startSelecting();
            this.zcardManager.addHandler(this.handler);
        }
    }

    override onLeavingState(args: StateArgs, isCurrentPlayerActive: boolean) {
        this.boardManager.unmarkHexSelected(args.hex);
        this.zcardManager.removeHandler(this.handler);
        this.zcardManager.stopSelecting();
    }

    private xhandler = async (zcardType?: string) => { 
        if (!zcardType) {
            this.zcardManager.unselectAll();
            this.bga.states.restoreServerGameState();
            return;
        }
        this.bga.statusBar.removeActionButtons();
        // TODO: add tooltip
        this.bga.statusBar.setTitle(_('Select ziggurat card ${zcard}?'), { zcard: zcardType });

        this.bga.statusBar.addActionButton(_('Confirm'),
            () => this.bga.actions.performAction('actSelectZigguratCard', { zctype: zcardType }),
            { autoclick: this.autoConfirmEnabled() }
        );

        this.bga.statusBar.addActionButton(
            _('Cancel'),
            () => {
                // e.classList.toggle(Css.SELECTED);
                this.zcardManager.unselectAll();
                this.bga.states.restoreServerGameState();
            },
            { color: "secondary" });
    };

    private handler = this.xhandler.bind(this);

    async notif_zigguratCardSelection(
        args: {
            zcard: string;
            player_id: number;
            cardused: boolean;
            points: number;
        }
    ) {
        const dest = this.playerPanelManager.zcardsElement(args.player_id);
        const zelem = this.zcardManager.getZCardElement(args.zcard);

        zelem.classList.remove(Css.SELECTED);
        await this.animationManager.slideAndAttach(zelem, dest, { toPlaceholder: 'off' })
        this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points);
        if (args.cardused) {
            this.zcardManager.setUsed(zelem, true);
        }
    }
}
