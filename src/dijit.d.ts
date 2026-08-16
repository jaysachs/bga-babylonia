declare namespace dijit {
  class TooltipDialog {
    constructor(args: {id: string, content: string});
    destroy(): void;
  }
  class Popup {}
  namespace popup {
    function open(args: { popup: TooltipDialog,
        around: HTMLElement,
        closable: boolean }): Popup;
    function close(p: Popup): void;
  }
  class Tooltip { 
    constructor(args: {connectId: string[], getContent: (x: string) => string });
  }
}
