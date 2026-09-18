import { BblPlayer, BGamedatas, Zcard } from "./bdata";
import { Html } from "./html";
import { IDS } from "./ids";
import { TooltipManager } from "./tooltips";

export type ZType = string;

export class ZCardManager {

    private zcardTooltips = new Map<string, string>();

    constructor(private bga: Bga<BblPlayer, BGamedatas>,  private tooltipManager: TooltipManager) {
        const zcards = this.bga.gameui.gamedatas.ziggurat_cards;

        const available = $(IDS.AVAILABLE_ZCARDS);
        for (let zcard of zcards) {
            const zcont = Html.div({});
            available.appendChild(zcont);
            const zelem = this.createDiv(zcard.type, zcard.used, IDS.zcard(zcard.type));

            if (zcard.owning_player_id != 0) {
                $(IDS.playerBoardZcards(zcard.owning_player_id)).appendChild(zelem);
            } else {
                zcont.appendChild(zelem);
            }

            this.zcardTooltips.set(zcard.type, _(zcard.tooltip));
            this.tooltipManager.add(zelem.id, this.zcardTooltip(zcard));

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

    get(el: Element): ZType | undefined {
        return el.getAttribute(ZCardManager.ATTR) as ZType;
    }

    setUsed(el: Element, used: boolean) {
        el.setAttribute(ZCardManager.USED_ATTR, String(used));
    }

    createDiv(z: ZType, used: boolean = false, id?: string, text?: string): HTMLElement {
        return Html.div({ attrs: this.attr(z, used), id: id, text: text });
    }

    attr(z: ZType, used: boolean = false): { bbl_ztype: ZType, bbl_zused?: string } {
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