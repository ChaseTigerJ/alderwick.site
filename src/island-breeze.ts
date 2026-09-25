import * as THREE from 'three';

// Even the combined gusts stay below these angles; this is a quiet harbor.
export const TREE_BREEZE_MAX_TILT = THREE.MathUtils.degToRad(.24);
export const MAST_BREEZE_MAX_TILT = THREE.MathUtils.degToRad(.09);

type Sway = { object: THREE.Object3D; rest: THREE.Quaternion; inverseRest: THREE.Quaternion; phase: number; amplitude: number };
type Rigging = {
  mesh: THREE.Mesh; mast: Sway; rest: Float32Array; weights: Float32Array;
  toParent: THREE.Matrix4; fromParent: THREE.Matrix4;
};

/** Rooted trees, deck-rooted masts, and cables that keep their lower ties fixed. */
export function createIslandBreeze(model: THREE.Object3D) {
  const sways: Sway[] = [], masts = new Map<string, Sway>(), rigging: Rigging[] = [];
  model.updateMatrixWorld(true);
  model.traverse(object => {
    const mast = /^ShipMast_\d+$/.test(object.name), tree = /^TreeBreeze_\d+$/.test(object.name);
    if (!mast && !tree) return;
    const index = Number(object.name.split('_').at(-1));
    const sway = { object, rest: object.quaternion.clone(), inverseRest: object.quaternion.clone().invert(), phase: index * 1.618, amplitude: mast ? MAST_BREEZE_MAX_TILT : TREE_BREEZE_MAX_TILT };
    sways.push(sway); if (mast) masts.set(object.name, sway);
  });
  const point = new THREE.Vector3(), bent = new THREE.Vector3(), delta = new THREE.Quaternion();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const mast = masts.get(object.userData.mastNode);
    const base = Number(object.userData.breezeBaseHeight), top = Number(object.userData.breezeTopHeight);
    if (!mast?.object.parent || !Number.isFinite(base) || !Number.isFinite(top) || top <= base) return;
    object.geometry = object.geometry.clone();
    const positions = object.geometry.getAttribute('position'); positions.setUsage(THREE.DynamicDrawUsage);
    const toParent = mast.object.parent.matrixWorld.clone().invert().multiply(object.matrixWorld);
    const rest = new Float32Array(positions.array), weights = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      point.fromArray(rest, i * 3).applyMatrix4(toParent);
      weights[i] = THREE.MathUtils.clamp((point.y - base) / (top - base), 0, 1);
    }
    rigging.push({ mesh: object, mast, rest, weights, toParent, fromParent: toParent.clone().invert() });
    // The authored bounding box cannot include the tiny moving upper ties.
    object.frustumCulled = false;
  });
  const windRotation = new THREE.Quaternion(), tilt = new THREE.Euler(0, 0, 0, 'XYZ');
  function update(time: number) {
    // The scene clock freezes for pause, reduced motion, disabled animation,
    // and offscreen tabs. Shared slow waves give each tree a related breeze.
    const wind = Math.sin(time * .31) * .66 + Math.sin(time * .17) * .34;
    const crosswind = Math.sin(time * .23) * .7 + Math.sin(time * .11) * .3;
    for (const sway of sways) {
      const local = (Math.sin(time * .27 + sway.phase) - Math.sin(sway.phase)) * .5;
      const strength = sway.amplitude === MAST_BREEZE_MAX_TILT ? .12 : .26;
      tilt.set(sway.amplitude * .82 * (wind * (1 - strength) + local * strength), 0, sway.amplitude * .52 * crosswind);
      windRotation.setFromEuler(tilt);
      sway.object.quaternion.copy(sway.rest).multiply(windRotation);
    }
    for (const cable of rigging) {
      const positions = cable.mesh.geometry.getAttribute('position');
      delta.copy(cable.mast.object.quaternion).multiply(cable.mast.inverseRest);
      for (let i = 0; i < positions.count; i++) {
        const n = i * 3, weight = cable.weights[i];
        // Copy pinned vertices exactly, avoiding accumulated floating-point drift.
        if (!weight) { positions.setXYZ(i, cable.rest[n], cable.rest[n + 1], cable.rest[n + 2]); continue; }
        point.fromArray(cable.rest, n).applyMatrix4(cable.toParent);
        bent.copy(point).sub(cable.mast.object.position).applyQuaternion(delta).add(cable.mast.object.position);
        point.lerp(bent, weight).applyMatrix4(cable.fromParent);
        positions.setXYZ(i, point.x, point.y, point.z);
      }
      positions.needsUpdate = true;
      cable.mesh.geometry.computeVertexNormals();
    }
  }
  return { update };
}
