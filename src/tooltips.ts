import { BblPlayer, BGamedatas } from "./bdata";

export class TooltipManager {
    constructor(private bga: Bga<BblPlayer, BGamedatas>) { }

    public setup(): void { }

    public add(elem: HTMLElement, content: HTMLElement | (() => (HTMLElement))) {
        var tooltip: any;
        let id = elem.id;
        if (content instanceof HTMLElement) {
            this.bga.gameui.addTooltipHtml(id, content.outerHTML);
            tooltip = (this.bga.gameui as any).tooltips[id];
        } else {
            this.bga.gameui.addTooltipHtml(id, "placeholder");
            tooltip = (this.bga.gameui as any).tooltips[id];
            tooltip.getContent = () => content().outerHTML;
        }
        tooltip.removeTarget(id);

        let timeoutId: null | number = null;
        elem.addEventListener('pointerenter', (e) => {
            timeoutId = setTimeout(() => { timeoutId = null; tooltip.open(id) }, 300);
        });
        elem.addEventListener('pointerleave', (e) => {
            if (timeoutId == null) {
                tooltip.close();
            } else {
                clearTimeout(timeoutId);
            }
        })
    }
}