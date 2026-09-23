import { BblPlayer, BGamedatas, Zcard } from "./bdata";
import { Css } from "./css";
import { Html } from "./html";
import { PlayerPanelManager } from "./player_panel";
import { TooltipManager } from "./tooltips";

export type ZType = string;

export type ZCardHandler = (zcard?: ZType) => void;

export class ZCardManager {

    private zcardTooltips = new Map<string, string>();
    private mainDiv?: HTMLElement;

    private zcardId(type: string): string {
        return `bbl_${type}`;
    }

    public constructor(private bga: Bga<BblPlayer, BGamedatas>,  private playerPanelManager: PlayerPanelManager, private tooltipManager: TooltipManager) {}

    public setup(): HTMLElement {
        const zcards = this.bga.gameui.gamedatas.ziggurat_cards;

        this.mainDiv = Html.div({id: 'bbl_available_zcards'});
        for (let zcard of zcards) {
            const zcont =this.mainDiv.appendChild(Html.div({}));
            const zelem = Html.div({ attrs: this.attr(zcard.type, zcard.used), id: this.zcardId(zcard.type) /* , title: _(zcard.tooltip) */});

            if (zcard.owning_player_id != 0) {
                this.playerPanelManager.addZCard(zcard.owning_player_id, zelem);
            } else {
                zcont.appendChild(zelem);
            }

            this.zcardTooltips.set(zcard.type, _(zcard.tooltip));
            this.tooltipManager.add(zelem, this.zcardTooltip(zcard));
        }
        return this.mainDiv!;
    }

    private controller = new AbortController();

    public startSelecting(): void {
        this.mainDiv!.classList.add(Css.SELECTING); 
        this.controller = new AbortController();       
        this.mainDiv!.addEventListener('click', this.onZCardClicked.bind(this), { signal: this.controller.signal });
    }

    public stopSelecting(): void {
        this.mainDiv!.classList.remove(Css.SELECTING);
        this.controller.abort();
    }

    private async onZCardClicked(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        let e = event.target as HTMLElement;
        var z = this.get(e);
        if (!z) { return false; }
        if (!e.classList.contains(Css.SELECTED)) {
            this.unselectAll();
        }
        if (!e.classList.toggle(Css.SELECTED)) {
            z = undefined;
        }
        await Promise.all(this.handlers.map(async h => h(z)));
        return false;
    }

    private handlers: ZCardHandler[] = [];

    public addHandler(h: ZCardHandler): void {
        if (this.handlers.indexOf(h) < 0) {
            this.handlers.push(h);
        }
    }

    public removeHandler(h: ZCardHandler): void {
        const i = this.handlers.indexOf(h);
        if (i > 0) {
            this.handlers.splice(i, 1);
        }
    }

    public createSpan(zcard: string): HTMLElement {
        return Html.span({
            title: this.zcardTooltips.get(zcard) ?? '',
            attrs: this.attr(zcard)
        });
    }

    private zcardTooltip(zcard: Zcard): HTMLElement {
        return Html.div({ classes: 'bbl_zcard_hover' },
            Html.div({ attrs: this.attr(zcard.type) }),
            Html.div({ classes: 'bbl_zcard_description', text: _(zcard.tooltip) })
        );
    }

    public getZCardElement(ztype: string): HTMLElement {
        return $(this.zcardId(ztype));
    }

    private get(el: Element): ZType | undefined {
        return el.getAttribute(ZCardManager.ATTR) as ZType;
    }

    public unselectAll(): void {
        Array.from(this.mainDiv!.children).forEach(e => e.firstElementChild?.classList.remove(Css.SELECTED));
    }

    public setUsed(el: Element, used: boolean) {
        el.setAttribute(ZCardManager.USED_ATTR, String(used));
    }

    private attr(z: ZType, used: boolean = false): { bbl_ztype: ZType, bbl_zused?: string } {
        if (used) {
            return {
                bbl_ztype: z,
                bbl_zused: 'true'
            }
        }
        return { bbl_ztype: z };
    }
    private static readonly ATTR: string = 'bbl_ztype';
    private static readonly USED_ATTR: string = 'bbl_zused';

}