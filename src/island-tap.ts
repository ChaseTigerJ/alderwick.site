type PointerPosition = { pointerId: number; clientX: number; clientY: number };

/** A tap is one short, stationary pointer gesture; a pinch can never become a tap. */
export function createIslandTapTracker() {
  const pointers = new Set<number>();
  let press: { id: number; x: number; y: number; time: number } | null = null;
  return {
    down(event: PointerPosition, time: number) {
      pointers.add(event.pointerId);
      press = pointers.size === 1 ? { id: event.pointerId, x: event.clientX, y: event.clientY, time } : null;
    },
    move(event: PointerPosition) {
      if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 7) press = null;
    },
    up(event: PointerPosition, time: number) {
      const candidate = press; press = null; pointers.delete(event.pointerId);
      return Boolean(candidate && candidate.id === event.pointerId && !pointers.size && time - candidate.time <= 1000 && Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) <= 7);
    },
    cancel(event: Pick<PointerPosition, 'pointerId'>) { press = null; pointers.delete(event.pointerId); },
    clear() { press = null; pointers.clear(); },
  };
}
