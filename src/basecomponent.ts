
type Handler<T> = (t : T) => void;

export abstract class BaseComponent<T> {
    private handlers: Handler<T>[] = [];

    public addHandler(h: Handler<T>): void {
        if (this.handlers.indexOf(h) < 0) {
            this.handlers.push(h);
        }
    }

    public removeHandler(h: Handler<T>): void {
        const i = this.handlers.indexOf(h);
        if (i > 0) {
            this.handlers.splice(i, 1);
        }
    }    

    protected async dispatch(t: T) {
        await Promise.all(this.handlers.map(async h => h(t)));
    }
}