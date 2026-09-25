const IDLE_DELAY = 3;
const TURN_SPEED = Math.PI / 360; // Half a degree per second once gently up to speed.

/** Camera-only drift: no simulation time or zoom is changed by idle movement. */
export function createIslandIdleMotion(normalPolarAngle: number, now = 0) {
  const held = new Set<string | number>();
  let lastActivity = now, speed = 0;
  const activity = (time: number) => { lastActivity = time; speed = 0; };
  return {
    begin(id: string | number, time: number) { held.add(id); activity(time); },
    end(id: string | number, time: number) { if (held.delete(id)) activity(time); },
    activity,
    cancel(time: number) { held.clear(); activity(time); },
    suspend(time: number) { activity(time); },
    step(time: number, delta: number, polarAngle: number, enabled: boolean) {
      if (!enabled) activity(time);
      if (!enabled || held.size || time - lastActivity < IDLE_DELAY) return { azimuth: 0, polar: polarAngle };
      // Clamp here as well as at the render loop: returning from a hidden tab
      // must never spend the intervening minutes on a single camera movement.
      const dt = Math.min(Math.max(delta, 0), .05);
      speed += (TURN_SPEED - speed) * (1 - Math.exp(-dt / 2));
      const blend = speed / TURN_SPEED;
      return {
        azimuth: speed * dt,
        polar: polarAngle + (normalPolarAngle - polarAngle) * (1 - Math.exp(-dt * .2 * blend)),
      };
    },
  };
}
