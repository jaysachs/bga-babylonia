import { Css } from "../css";
import { IDS } from "../ids";
import { BabyloniaState } from "./base";

export class EndOfTurnScoringState extends BabyloniaState {
    override onEnteringState(args: any, isCurrentPlayerActive: boolean) {
        if (isCurrentPlayerActive) {
            this.boardManager.markAllHexesUnplayable();
        }
    }

    private async indicateNeighbors(
        winnerHexes: number[],
        otherHexes: number[]) {
        if (this.animationManager.animationsActive()) {
            for (const rc of otherHexes) {
                this.boardManager.hexDiv(rc).classList.add(Css.IN_NETWORK);
                this.boardManager.hexDiv(rc).classList.add(Css.UNIMPORTANT);
            }
            for (let i = 0; i < 3; i++) {
                for (const rc of winnerHexes) {
                    this.boardManager.hexDiv(rc).classList.add(Css.IN_NETWORK);
                }
                await this.bga.gameui.wait(250);
                for (const rc of winnerHexes) {
                    this.boardManager.hexDiv(rc).classList.remove(Css.IN_NETWORK);
                }
                await this.bga.gameui.wait(250);
            }
            for (const rc of otherHexes) {
                this.boardManager.hexDiv(rc).classList.remove(Css.IN_NETWORK);
                this.boardManager.hexDiv(rc).classList.remove(Css.UNIMPORTANT);
            }
        }
    }

    async notif_zigguratScored(
        args: {
            rc: number;
            player_name: string;
            player_id: number;
            winner_hexes: number[];
            other_hexes: number[];
        }) {
        // slight subtlety here; if there is a winner, leave the hex selected until after the cards is selected
        await this.indicateNeighbors(args.winner_hexes, args.other_hexes)
        if (!args.player_id) {
            this.boardManager.unmarkHexSelected(args.rc)
        };
        this.boardManager.markHexScored(args.rc);
        // TODO: consider better visual treatments
    }

    async notif_cityScored(
        args: {
            rc: number;
            city: string;
            player_id: number;
            winner_hexes: number[];
            other_hexes: number[];
            details: {
                player_id: number;
                captured_city_count: number;
                network_locations: number[];
                scored_locations: number[];
                network_points: number;
                capture_points: number;
            }[];
        }
    ) {
        const hex = this.boardManager.hexDiv(args.rc);

        let aa = this.animationManager.animationsActive();
        for (const details of args.details) {
            // const details = args.details[playerId]!;
            if (aa) {
                for (const nh of details.network_locations) {
                    let cl = this.boardManager.hexDiv(nh).classList;
                    cl.add(Css.IN_NETWORK);
                    if (!details.scored_locations.some(sh => (nh == sh))) {
                        cl.add(Css.UNIMPORTANT);
                    }
                }
                await this.animationManager.displayScoring(
                    hex,
                    details.network_points,
                    this.bga.gameui.gamedatas.players[details.player_id]!.color,
                    { extraClass: 'bbl_city_scoring' });
                details.network_locations.forEach(
                    (rc: number) => {
                        let cl = this.boardManager.hexDiv(rc).classList;
                        cl.remove(Css.IN_NETWORK);
                        cl.remove(Css.UNIMPORTANT);
                    });
            }
            this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.network_points);
        }

        await this.indicateNeighbors(args.winner_hexes, args.other_hexes);

        let dest = (args.player_id != 0)
            ? this.playerPanelManager.citycountElement(args.player_id)
            : $(IDS.OFF_BOARD);

        await this.animationManager.slideOutAndDestroy(
            hex.firstElementChild as HTMLElement, dest, {})
        this.boardManager.unmarkHexSelected(args.rc);
        for (const details of args.details) {
            this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.capture_points);
            this.playerPanelManager.updateCapturedCityCount(details);
        }
        this.boardManager.unmarkHexSelected(args.rc);
        if (args.player_id) {
            this.bga.gameui.gamedatas.captured_city_count++;
        }
    }

}
