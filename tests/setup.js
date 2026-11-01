// jsdom has no PointerEvent; a MouseEvent subclass is enough for clientX/clientY-based handlers.
if (typeof globalThis.PointerEvent === 'undefined') {
  globalThis.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.pointerType = init.pointerType ?? ''; }
  };
}
