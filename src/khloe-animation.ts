import * as THREE from 'three';

/** Locomotion stays in island-life; these flags select the authored skeletal pose. */
export type KhloeAnimationState = {
  walking: boolean;
  sniffing: boolean;
  playing: boolean;
  /** Seconds into the parent's bounded, debounced 4.7-second performance. */
  dogElapsed: number;
  /** Optional seated presentation, shared by the character's 404 portrait. */
  sitting?: boolean;
};

const FADE_SECONDS = .24;
const CLIPS = ['KhloeIdle', 'KhloeWalk', 'KhloeSniff', 'KhloePlay', 'KhloeSitCurious'] as const;

/** No independent clock: pauses freeze clip time and every in-progress crossfade. */
export function createKhloeAnimation(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map<string, THREE.AnimationAction>();
  for (const name of CLIPS) {
    const clip = THREE.AnimationClip.findByName(clips, name);
    if (!clip) continue;
    const action = mixer.clipAction(clip);
    action.setLoop(name === 'KhloePlay' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = name === 'KhloePlay';
    actions.set(name, action);
  }
  let current: THREE.AnimationAction | undefined;
  let fadeElapsed = FADE_SECONDS, disposed = false;
  const fadeFrom = new Map<THREE.AnimationAction, number>();

  function sample(action: THREE.AnimationAction, elapsed: number, advance = 0) {
    mixer.stopAllAction();
    fadeFrom.clear(); fadeElapsed = FADE_SECONDS;
    action.reset().setEffectiveWeight(1).play();
    action.time = THREE.MathUtils.clamp(elapsed, 0, action.getClip().duration);
    mixer.update(advance);
    root.updateMatrixWorld(true);
  }

  function update(delta: number, motion: boolean, state: KhloeAnimationState) {
    if (disposed) return;
    const name = state.playing ? 'KhloePlay' : state.sitting ? 'KhloeSitCurious' : state.walking ? 'KhloeWalk' : state.sniffing ? 'KhloeSniff' : 'KhloeIdle';
    const next = actions.get(name) ?? actions.get('KhloeIdle');
    if (!next) return;
    const step = motion && Number.isFinite(delta) ? Math.max(0, delta) : 0;
    const elapsed = Number.isFinite(state.dogElapsed) ? THREE.MathUtils.clamp(state.dogElapsed, 0, 4.7) : 0;
    if (next !== current) {
      const previous = current;
      current = next;
      // An explicit discovery under reduced motion still gets one readable pose.
      // Ordinary paused updates never touch mixer time or the sampled skeleton.
      if (!previous || !motion) {
        sample(next, state.playing ? (motion ? elapsed : .7) : 0, state.playing ? 0 : step);
        return;
      }
      // Capture all blended weights so an interrupted transition cannot pop.
      fadeFrom.clear();
      for (const action of actions.values()) fadeFrom.set(action, action.isScheduled() ? action.getEffectiveWeight() : 0);
      const incomingWeight = fadeFrom.get(next) ?? 0;
      // A loop still visible from the previous fade keeps its phase when the
      // transition reverses. A genuine new performance always starts afresh.
      if (!next.isScheduled() || incomingWeight === 0 || state.playing) next.reset();
      next.setEffectiveWeight(incomingWeight).play();
      if (state.playing) next.time = Math.max(0, elapsed - step);
      fadeElapsed = 0;
    }
    if (!motion) return;
    if (fadeElapsed < FADE_SECONDS) {
      fadeElapsed = Math.min(FADE_SECONDS, fadeElapsed + step);
      const blend = fadeElapsed / FADE_SECONDS;
      for (const [action, weight] of fadeFrom) {
        action.setEffectiveWeight(THREE.MathUtils.lerp(weight, action === current ? 1 : 0, blend));
        if (blend === 1 && action !== current) action.stop();
      }
      if (blend === 1) fadeFrom.clear();
    }
    mixer.update(step);
    root.updateMatrixWorld(true);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    mixer.stopAllAction();
    mixer.uncacheRoot(root);
    actions.clear(); fadeFrom.clear(); current = undefined;
  }
  return { update, dispose };
}
