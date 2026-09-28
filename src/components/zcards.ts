import { BaseComponent } from "../libs/basecomponent";
import { BblPlayer, BGamedatas, Zcard, ZType } from "../model/data";
import { Css } from "./css";
import { Html } from "../libs/html";
import { PlayerPanelManager } from "./player_panel";
import { TooltipManager } from "../libs/tooltips";
import { TextFormatter } from "../libs/textformatter";
import { LogManager } from "../libs/logmanager";

export class ZCardManager extends BaseComponent<ZType | undefined> {

    private zcardTooltips = new Map<string, string>();
    private mainDiv?: HTMLElement;
    private static readonly SELECTING = 'bbl_selecting';

    private zcardId(type: string): string {
        return `bbl_${type}`;
    }

    public constructor(private bga: Bga<BblPlayer, BGamedatas>,
            private readonly logManager: LogManager,
            private readonly textFormatter: TextFormatter,
            private readonly playerPanelManager: PlayerPanelManager,
            private readonly tooltipManager: TooltipManager) {
        super();
    }

    public setup(): HTMLElement {
        this.textFormatter.registerFormatter('zcard', (args) => this.renderZCardArg(args.zcard));
        this.logManager.registerProcessor('[bbl_ztype]', (e) => this.addZCardHover(e));
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
        this.mainDiv!.classList.add(ZCardManager.SELECTING);
        this.controller = new AbortController();
        this.mainDiv!.addEventListener('click', this.onZCardClicked.bind(this), { signal: this.controller.signal });
    }

    public stopSelecting(): void {
        this.mainDiv!.classList.remove(ZCardManager.SELECTING);
        this.controller.abort();
    }

    private async onZCardClicked(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        let e = event.target as HTMLElement;
        var z = this.getZType(e);
        if (!z) { return false; }
        if (!e.classList.contains(Css.SELECTED)) {
            this.unselectAll();
        }
        if (!e.classList.toggle(Css.SELECTED)) {
            z = undefined;
        }
        await super.dispatch(z);
        return false;
    }

    private zcardForType(ztype: ZType): Zcard | undefined {
        for (const zc of this.bga.gameui.gamedatas.ziggurat_cards) {
            if (zc.type == ztype) {
                return zc;
            }
        }
        return undefined;
    }

    private renderZCardArg(zt: ZType): HTMLElement {
        const el = Html.span({
            id: `bbl_zc_arg_${zt}`,
            title: this.zcardTooltips.get(zt) ?? '',
            attrs: this.attr(zt)
        });
        const zc = this.zcardForType(zt);
        if (!zc) {
            console.error("Could not find ziggurat card ", zt);
            return el;
        }
        this.tooltipManager.add(el, this.zcardTooltip(zc));
        return el;
    }

    private addZCardHover(el: HTMLElement): void {
        const zt = this.getZType(el);
        if (!zt) {
            console.error("could not find ztype in ", el);
            return;
        }
        const zc = this.zcardForType(zt);
        if (!zc) {
            console.error("Could not find ziggurat card ", zt);
            return;
        }
        this.tooltipManager.add(el, this.zcardTooltip(zc));
    }

    private zcardTooltip(zcard: Zcard): HTMLElement {
        return Html.div({ classes: 'bbl_zcard_hover' },
            Html.div({ attrs: this.attr(zcard.type) }),
            Html.div({ classes: 'bbl_zcard_description', text: _(zcard.tooltip) })
        );
    }

    public getZCardElement(ztype: ZType): HTMLElement {
        return $(this.zcardId(ztype));
    }

    private getZType(el: Element): ZType | undefined {
        return el.getAttribute(ZCardManager.ATTR) as ZType;
    }

    public unselectAll(): void {
        Array.from(this.mainDiv!.children).forEach(e => e.firstElementChild?.classList.remove(Css.SELECTED));
    }

    public setUsed(zcard: ZType, used: boolean) {
        this.getZCardElement(zcard).setAttribute(ZCardManager.USED_ATTR, String(used));
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