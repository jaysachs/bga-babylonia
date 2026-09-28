export class TextFormatter {
    private readonly formatters = new Map<string, (x: any) => HTMLElement>();

    public registerFormatter(argName: string, xform: (x: any) => HTMLElement): void {
        this.formatters.set(argName, xform);
    }

    public formatArgs(args: any): any {
        try {
            const shadowParent = document.createElement('span');
            this.formatters.forEach((xform, key) => {
                if (key in args) {
                    const e = xform(args);
                    shadowParent.appendChild(e);
                    args[key] = shadowParent.getHTML();
                    e.remove();
                    shadowParent.remove();
                }
            });
        } catch (e: any) {
            console.error(args, 'Exception thrown', e.stack);
        }
        return args;
    }
}