import * as THREE from 'three';

/** Deform only cloth. Every hoist vertex stays fixed to its mast. */
export function createIslandFlags(model: THREE.Object3D) {
  const flags: { mesh: THREE.Mesh; rest: Float32Array; flyLength: number; phase: number }[] = [];
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !object.name.startsWith('FlagCloth')) return;
    object.geometry = object.geometry.clone();
    object.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
    flags.push({ mesh: object, rest: new Float32Array(object.geometry.attributes.position.array), flyLength: Number(object.userData.flyLength) || .4, phase: flags.length * 1.73 });
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.side = THREE.DoubleSide;
    object.frustumCulled = false;
  });
  function update(time: number) {
    for (const { mesh, rest, flyLength, phase } of flags) {
      const position = mesh.geometry.attributes.position;
      for (let i = 0; i < position.count; i++) {
        const n = i * 3, u = THREE.MathUtils.clamp(rest[n] / flyLength, 0, 1);
        // A travelling ripple fades into the fixed hoist; a slower gust adds a little lift.
        const ripple = Math.sin(u * 7 - time * 3.2 + phase) * .045 + Math.sin(u * 12 - time * 4.8 + phase) * .012;
        position.setXYZ(i, rest[n], rest[n + 1] + Math.sin(time * 1.3 + phase + u * 3) * .012 * u, rest[n + 2] + ripple * u);
      }
      position.needsUpdate = true; mesh.geometry.computeVertexNormals();
    }
  }
  return { update };
}
