import { BblPlayer, BGamedatas } from "./bdata";
import { Html } from "./html";

export class PlayerPanelManager {
    private handCounters: Counter[] = [];
    private poolCounters: Counter[] = [];
    private cityCounters: Counter[] = [];

    public constructor(private bga: Bga<BblPlayer, BGamedatas>) {}

    public setup(): void {
        const players = this.bga.gameui.gamedatas.players;
        console.debug('setting up player boards');
        for (const pid in players) {
            this.setupPlayerBoard(players[pid]!);
        }
    }

    private setupPlayerBoard(player: BblPlayer): void {
        const playerId = player.player_id;
        console.debug('Setting up board for player ' + playerId);
        this.bga.playerPanels.getElement(playerId).append(...this.player_board_ext(playerId));
        //  create counters per player
        this.handCounters[playerId] = new ebg.counter();
        this.handCounters[playerId]!.create(this.handcountId(playerId));
        this.poolCounters[playerId] = new ebg.counter();
        this.poolCounters[playerId]!.create(this.poolcountId(playerId));
        this.cityCounters[playerId] = new ebg.counter();
        this.cityCounters[playerId]!.create(this.citycountId(playerId));
        this.updateHandCount(player, false);
        this.updatePoolCount(player, false);
        this.updateCapturedCityCount(player, false);
        this.bga.playerPanels.getScoreCounter(playerId).setValue(Number(player.score));
    }

    private handcountId(playerId: number): string {
        return `bbl_handcount_${playerId}`;
    }

    private poolcountId(playerId: number): string {
        return `bbl_poolcount_${playerId}`;
    }

    private citycountId(playerId: number): string {
        return `bbl_citycount_${playerId}`;
    }

    private zcardsId(playerId: number): string {
        return `bbl_zcards_${playerId}`;
    }

    public zcardsElement(player_id: number): HTMLElement {
        return $(this.zcardsId(player_id));
    }

    public handcountElement(player_id: number): HTMLElement {
        return $(this.handcountId(player_id));
    }

    public poolcountElement(player_id: number): HTMLElement {
        return $(this.poolcountId(player_id));
    }

    public citycountElement(player_id: number): HTMLElement {
        return $(this.citycountId(player_id));
        
    }

    private updateCounter(counter: Counter, value: number, animate: boolean) {
        if (animate) {
            counter.toValue(value);
        } else {
            counter.setValue(value);
        }
    }

    public updateHandCount(player: { player_id: number; hand_size: number; }, animate: boolean = true) {
        this.updateCounter(this.handCounters[player.player_id]!,
            player.hand_size,
            animate);
    }

    public updatePoolCount(player: { player_id: number; pool_size: number }, animate: boolean = true) {
        this.updateCounter(this.poolCounters[player.player_id]!,
            player.pool_size,
            animate);
    }

    public updateCapturedCityCount(player: { player_id: number; captured_city_count: number }, animate: boolean = true) {
        this.updateCounter(this.cityCounters[player.player_id]!,
            player.captured_city_count,
            animate);
    }

    public addZCard(player_id: number, zelem: HTMLElement): void {
        $(this.zcardsId(player_id)).appendChild(zelem);        
    }

    private player_board_ext(player_id: number): HTMLElement[] {
        const colorIndex = this.bga.players.getPlayerById(player_id)?.color_index;
        return [
            Html.div({ title: _('number of tiles in hand') },
                Html.span({ id: this.handcountId(player_id), classes: ['bbl_pb_hand', `bbl_pb_hand_label_${colorIndex}`] }),
            ),
            Html.div({ title: _('number of tiles in pool') },
                Html.span({ id: this.poolcountId(player_id), classes: ['bbl_pb_pool', `bbl_pb_pool_label_${colorIndex}`] }),
            ),
            Html.div({ title: _('number of captured cities') },
                Html.span({ id: this.citycountId(player_id), classes: ['bbl_pb_city', 'bbl_pb_city_label'] }),
            ),
            Html.div({ id: this.zcardsId(player_id), classes: 'bbl_pb_zcards' }
            ),
        ];
    }

}