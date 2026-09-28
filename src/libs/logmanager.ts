import { Html } from "./html";

export class LogManager {
    private processors: { selector:string, processor: (e:HTMLElement) => void}[] = [];
    private logsElem: HTMLElement;
    public constructor() {
        this.logsElem = Html.div({}); // dummy
    }

    public registerProcessor(selectorFragment: string, processor: (e:HTMLElement) => void): void {
        this.processors.push({selector: selectorFragment, processor: processor });
    }

    private static readonly PROCESSED = 'bbl_processed';

    public processLogs(): void {
        this.processors.forEach(p => {
            // FIXME: this concatenation is fragile
            const item_elements = this.logsElem.querySelectorAll(p.selector + `:not([${LogManager.PROCESSED}="1"])`);
            Array.from(item_elements).forEach(el => {
                el.setAttribute(LogManager.PROCESSED,'0');
                p.processor(el as HTMLElement);
            });
        });
        Array.from(this.logsElem.querySelectorAll(`[${LogManager.PROCESSED}="0"]`))
            .forEach(el => el.setAttribute(LogManager.PROCESSED, '1'));
    }

    public setup() : void {
        this.logsElem = document.querySelector('#logs') as HTMLElement;
    }
}