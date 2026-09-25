type Activity = { begin: (id: number) => void; end: (id: number) => void; cancel: () => void };

/** Follow captured mouse/touch motion for snow impulses and idle timing.
 * OrbitControls owns the actual orbit and pinch; this observer never consumes touch events. */
export function attachIslandDrag(canvas: HTMLCanvasElement, onDrag: (dx: number, dy: number) => void, activity?: Activity) {
  const pointers = new Map<number, { x: number; y: number; touch: boolean; rotates: boolean }>();
  const setSelection = () => document.documentElement.classList.toggle('island-dragging', [...pointers.values()].some(p => !p.touch && p.rotates));
  const clear = () => { pointers.clear(); setSelection(); activity?.cancel(); };
  const down = (event: PointerEvent) => {
    const touch = event.pointerType === 'touch';
    if (!touch && event.button === 0) event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, touch, rotates: touch || event.button === 0 });
    setSelection(); activity?.begin(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    const active = pointers.get(event.pointerId);
    if (!active) return;
    if (!active.touch && !event.buttons) { up(event); return; }
    const dx = event.clientX - active.x, dy = event.clientY - active.y;
    active.x = event.clientX; active.y = event.clientY;
    // Dividing each finger's movement yields the two-finger centroid delta,
    // keeping a two-finger drag's snow impulse comparable to a one-finger drag.
    const count = active.touch ? [...pointers.values()].filter(p => p.touch).length : 1;
    if (active.rotates) onDrag(dx * .008 / count, dy * .006 / count);
  };
  const up = (event: PointerEvent) => { if (pointers.delete(event.pointerId)) { setSelection(); activity?.end(event.pointerId); } };
  const selection = (event: Event) => { if ([...pointers.values()].some(p => !p.touch && p.rotates)) event.preventDefault(); };
  canvas.addEventListener('pointerdown', down, true);
  window.addEventListener('pointermove', move, true);
  canvas.addEventListener('lostpointercapture', up);
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  window.addEventListener('blur', clear); document.addEventListener('selectstart', selection);
  return () => {
    clear(); canvas.removeEventListener('pointerdown', down, true); window.removeEventListener('pointermove', move, true);
    canvas.removeEventListener('lostpointercapture', up); window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up); window.removeEventListener('blur', clear); document.removeEventListener('selectstart', selection);
  };
}
