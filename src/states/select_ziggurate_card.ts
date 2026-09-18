import { Css } from "../css";
import { IDS } from "../ids";
import { BabyloniaState } from "./base";

type StateArgs = {
    hex: number;
    available_cards: string[];
}

export class SelectZigguratCardState extends BabyloniaState {
    private controller = new AbortController();

    override onEnteringState(args: StateArgs, isCurrentPlayerActive: boolean) {
        this.boardManager.markHexSelected(args.hex);
        if (isCurrentPlayerActive) {
            const div = $(IDS.AVAILABLE_ZCARDS) as HTMLElement;
            div.classList.add(Css.SELECTING);
            this.attachHandler();
        }
    }

    override onLeavingState(args: StateArgs, isCurrentPlayerActive: boolean) {
        this.boardManager.unmarkHexSelected(args.hex);
        if (isCurrentPlayerActive) {
            const div = $(IDS.AVAILABLE_ZCARDS) as HTMLElement;
            div.classList.remove(Css.SELECTING);
            this.controller.abort();
        }
    }

    private attachHandler() {
        this.controller.abort();
        this.controller = new AbortController();
        $(IDS.AVAILABLE_ZCARDS).addEventListener('click', e => this.onZcardClicked(e), { signal: this.controller.signal });
    }

    private confirmSelection(e: Element) {
        e.classList.toggle(Css.SELECTED);
        this.controller.abort();
        const zt = this.zcardManager.get(e)!;
        this.bga.statusBar.removeActionButtons();
        // TODO: add tooltip
        this.bga.statusBar.setTitle(_('Select ziggurat card ${zcard}?'), { zcard: zt });

        this.bga.statusBar.addActionButton(_('Confirm'),
            () => this.bga.actions.performAction('actSelectZigguratCard', { zctype: zt }),
            { autoclick: this.autoConfirmEnabled() }
        );

        this.bga.statusBar.addActionButton(
            _('Cancel'),
            () => {
                e.classList.toggle(Css.SELECTED);
                this.bga.states.restoreServerGameState();
            },
            { color: "secondary" });
    }

    private onZcardClicked(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        let e = event.target as HTMLElement;
        let z = this.zcardManager.get(e);
        if (!z) { return false; }
        this.confirmSelection(e);
        return false;
    }

    async notif_zigguratCardSelection(
        args: {
            zcard: string;
            player_id: number;
            cardused: boolean;
            points: number;
        }
    ) {
        const dest = $(IDS.playerBoardZcards(args.player_id));
        const zelem = $(IDS.zcard(args.zcard));

        zelem.classList.remove(Css.SELECTED);
        await this.animationManager.slideAndAttach(zelem, dest, { toPlaceholder: 'off' })
        this.bga.playerPanels.getScoreCounter(args.player_id).incValue(args.points);
        if (args.cardused) {
            this.zcardManager.setUsed(zelem, true);
        }
    }
}
