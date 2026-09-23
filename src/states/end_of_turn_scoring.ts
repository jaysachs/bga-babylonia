import { BabyloniaState } from "./base";

export class EndOfTurnScoringState extends BabyloniaState {
    override onEnteringState(args: any, isCurrentPlayerActive: boolean) {
        if (isCurrentPlayerActive) {
            this.boardManager.markAllHexesUnplayable();
        }
    }

    private static readonly IN_NETWORK = 'bbl_in_network';
    private static readonly UNIMPORTANT = 'bbl_unimportant';

    private async indicateNeighbors(winnerHexes: number[], otherHexes: number[]) {
        const otherCls = otherHexes.map(rc => this.boardManager.hexDiv(rc).classList);
        const winnerCls = winnerHexes.map(rc => this.boardManager.hexDiv(rc).classList);

        if (this.animationManager.animationsActive()) {
            for (const cl of otherCls) {
                cl.add(EndOfTurnScoringState.IN_NETWORK, EndOfTurnScoringState.UNIMPORTANT);
            }
            for (let i = 0; i < 3; i++) {
                for (const cl of winnerCls) {
                    cl.add(EndOfTurnScoringState.IN_NETWORK);
                }
                await this.bga.gameui.wait(250);
                for (const cl of winnerCls) {
                    cl.remove(EndOfTurnScoringState.IN_NETWORK);
                }
                await this.bga.gameui.wait(250);
            }
            for (const cl of otherCls) {
                cl.remove(EndOfTurnScoringState.IN_NETWORK, EndOfTurnScoringState.UNIMPORTANT);
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
                const nlCls = [];
                for (const nh of details.network_locations) {
                    let cl = this.boardManager.hexDiv(nh).classList;
                    nlCls.push(cl);
                    cl.add(EndOfTurnScoringState.IN_NETWORK);
                    if (!details.scored_locations.some(sh => (nh == sh))) {
                        cl.add(EndOfTurnScoringState.UNIMPORTANT);
                    }
                }
                await this.animationManager.displayScoring(
                    hex,
                    details.network_points,
                    this.bga.gameui.gamedatas.players[details.player_id]!.color,
                    { extraClass: 'bbl_city_scoring' });
                nlCls.forEach(cl => cl.remove(EndOfTurnScoringState.IN_NETWORK, EndOfTurnScoringState.UNIMPORTANT));
            }
            this.bga.playerPanels.getScoreCounter(details.player_id).incValue(details.network_points);
        }

        await this.indicateNeighbors(args.winner_hexes, args.other_hexes);

        let dest = (args.player_id != 0)
            ? this.playerPanelManager.citycountElement(args.player_id)
            : undefined;

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
