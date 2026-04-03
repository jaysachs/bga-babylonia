export interface AttrLike {
    toRecord(): Record<string, string>;
}

export class Html {
  public static makeElem(ty: string, args: {id?: string, text?: string, title?: string, attrs?: Record<string, string> | AttrLike , classes?: (string | string[]), style?: (string | string[])}, ...children: (HTMLElement | undefined) []): HTMLElement  {
    const e = document.createElement(ty);
    if (args.id) { e.id = args.id; }
    if (args.classes) {
      if (typeof(args.classes) == "string") { args.classes = [args.classes]; }
      args.classes.forEach(c => { if (c) e.classList.add(c) });
    }
    if (args.title) {
        e.title = args.title;
    }
    if (args.style) {
      if (typeof(args.style) == "string") { args.style = [args.style]; }
      e.style = args.style.join(';');
    }
    if (args.text) {
      e.innerText = args.text;
    }
    if (args.attrs) {
      var r = args.attrs;
      if (typeof ((args.attrs) as any).toRecord == "function") {
        r = (args.attrs as AttrLike).toRecord();
      }
      Object.keys(r).forEach(k => e.setAttribute(k, r![k]!));
    }
    children.forEach(c => c && e.appendChild(c));
    return e;
  }

  public static div(args: {id?: string, text?: string, title?: string, attrs?: Record<string, string> | AttrLike, classes?: (string | string[])}, ...children: (HTMLElement | undefined) []) {
    return this.makeElem('div', args, ...children);
  }

  public static span(args: {id?: string, text?: string, title?: string, attrs?: Record<string, string> | AttrLike, classes?: (string | string[]), style?: (string | string[])}, ...children: (HTMLElement | undefined) []) {
    return this.makeElem('span', args, ...children);
  }

  public static p(args: {id?: string, text?: string, title?: string, attrs?: Record<string, string> | AttrLike, classes?: (string | string[]), style?: (string | string[])}, ...children: (HTMLElement | undefined) []) {
      return this.makeElem('p', args, ...children);
  }
}

/**
* Returns the index of the given element among its parent's child elements or -1 if no parent.
*/
export function indexInParent(el: Element): number {
  return Array.from(el.parentElement?.children ?? []).findIndex(e => e == el);
}

