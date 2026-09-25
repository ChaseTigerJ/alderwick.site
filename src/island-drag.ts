/** Keep a mouse orbit captured without allowing a drag to select nearby page text. */
export function attachIslandDrag(canvas: HTMLCanvasElement, onDrag: (dx: number, dy: number) => void) {
  let active: { id: number; x: number; y: number } | null = null;
  const clear = () => { active = null; document.documentElement.classList.remove('island-dragging'); };
  const down = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    event.preventDefault();
    active = { id: event.pointerId, x: event.clientX, y: event.clientY };
    document.documentElement.classList.add('island-dragging');
  };
  const move = (event: PointerEvent) => {
    if (!active || event.pointerId !== active.id) return;
    if (!event.buttons) { clear(); return; }
    const dx = event.clientX - active.x, dy = event.clientY - active.y;
    active.x = event.clientX; active.y = event.clientY;
    onDrag(dx * .008, dy * .006);
  };
  const up = (event: PointerEvent) => { if (active?.id === event.pointerId) clear(); };
  const selection = (event: Event) => { if (active) event.preventDefault(); };
  canvas.addEventListener('pointerdown', down, true);
  canvas.addEventListener('pointermove', move, true);
  canvas.addEventListener('lostpointercapture', up);
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  window.addEventListener('blur', clear); document.addEventListener('selectstart', selection);
  return () => {
    clear(); canvas.removeEventListener('pointerdown', down, true); canvas.removeEventListener('pointermove', move, true);
    canvas.removeEventListener('lostpointercapture', up); window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up); window.removeEventListener('blur', clear); document.removeEventListener('selectstart', selection);
  };
}
