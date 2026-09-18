export function observeChanges(): (() => void) {
    var targetNode = document.body;

    // Callback function to execute when mutations are observed
    const callback = function(mutationsList: MutationRecord[]) {
        for(let mutation of mutationsList) {
            if (mutation.type == 'childList') {
                if (mutation.addedNodes.length > 0) {
                  console.log('ADDED', (mutation.target as any).id, mutation.addedNodes);
                }
                if (mutation.removedNodes.length > 0) {
                  console.log('REMOVED', (mutation.target as any).id, mutation.removedNodes);
                }
            }
            else if (mutation.type == 'attributes') {
              const el = mutation.target as Element;
              console.log('CHANGED', el.id, mutation.attributeName, mutation.oldValue, ' to ', el.getAttribute(mutation.attributeName!));
            }
        }
    };

    // Create an observer instance linked to the callback function
    const observer = new MutationObserver(callback);

    // Start observing the target node for configured mutations
    observer.observe(targetNode, { attributes: true, attributeOldValue: true, childList: true, subtree: true });
    return () => { observer.disconnect() };
}
