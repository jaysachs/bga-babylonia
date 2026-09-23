import { Css } from "./css";
import { Html } from "./html";
import { IDS } from "./ids";

export class Autosizer {

    constructor(private bga: Bga) {  }
    private mainDiv?: HTMLElement;

    public async setup(mainDiv: HTMLElement) {
        this.mainDiv = mainDiv;
        this.bga.gameui.onScreenWidthChange = () => this.handleResize();

        // FIXME: shouldn't need this but we do.
        window.addEventListener('load', () => this.handleResize());

        // FIXME ^2: and this is needed for iOS ...
        await this.bga.gameui.wait(500).then(() => this.handleResize());
    }

    // This includes spots for cards
    static readonly map_aspect_ratio = 808 / 1082; // 2709 / 3385;

    private handleResize() {
        const pageRect = this.bga.gameui.getBoundingClientRectIgnoreZoom('page-content');
        const vv = window.visualViewport!;

        const availWidth = pageRect.width;
        const availHeight = vv.height * vv.scale - (pageRect.top + vv.pageTop);

        // "horizontal" "default" layout
        var w1 = availWidth * (1082 - 112) / 1082; // 0.889
        // 1082 808
        var h1 = w1 * Autosizer.map_aspect_ratio;
        if (h1 > availHeight) {
            w1 = availHeight / Autosizer.map_aspect_ratio;
            h1 = availHeight;
        }

        // "vertical" "alt" layout
        // 747 101
        // 1494 162
        var h2 = availHeight * 1494 / (1494 + 182); // (882-92)/882;
        var w2 = h2 / Autosizer.map_aspect_ratio;
        if (w2 > availWidth) {
            w2 = availWidth;
        }

        const mainElCl = this.mainDiv!.classList;
        w1 = w1 * (1082 - 112) / 1082;
        w2 = w2 * (1082 - 112) / 1082;
        var width = w1;
        if (w1 >= w2) {
            width = w1;
            mainElCl.remove(Css.LAYOUT_UNDER_BOARD);
        } else {
            width = w2;
            mainElCl.add(Css.LAYOUT_UNDER_BOARD);
        }
        document.body.style.setProperty('--bbl-board-width', `${width}px`);
    }

}
