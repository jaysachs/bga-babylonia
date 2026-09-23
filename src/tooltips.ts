import { BblPlayer, BGamedatas } from "./bdata";

export class TooltipManager {
    constructor(private bga: Bga<BblPlayer, BGamedatas>) { }

    public setup(): void { }

    public add(id: string, content: HTMLElement | (() => (HTMLElement))) {
        var tooltip: any;
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
        $(id).addEventListener('pointerenter', (e) => {
            timeoutId = setTimeout(() => { timeoutId = null; tooltip.open(id) }, 300);
        });
        $(id).addEventListener('pointerleave', (e) => {
            if (timeoutId == null) {
                tooltip.close();
            } else {
                clearTimeout(timeoutId);
            }
        })
    }
}