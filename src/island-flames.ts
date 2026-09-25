import * as THREE from 'three';

/** Candle-sized pools of light. Parenting to authored anchors keeps ship lights aboard. */
export function createIslandFlames(model: THREE.Object3D) {
  const flames: { light: THREE.PointLight; base: number; phase: number }[] = [];
  const anchors: THREE.Object3D[] = [];
  model.traverse(object => {
    const window = object.name.startsWith('WindowLight_');
    if ((window && Number(object.name.split('_').pop()) % 4 < 2) || /^(LanternLight_|ShipLanternLight_)/.test(object.name)) anchors.push(object);
  });
  for (const anchor of anchors) {
    const ship = anchor.name.startsWith('ShipLanternLight_'), window = anchor.name.startsWith('WindowLight_');
    const light = new THREE.PointLight(0xffb368, 0, ship ? 1.9 : window ? 2.15 : 2.4, 2);
    light.name = `Flame_${anchor.name}`; anchor.add(light);
    flames.push({ light, base: ship ? 1.15 : window ? .82 : 1.5, phase: flames.length * 2.17 });
  }
  function update(time: number, night: number, strength: number, flicker = true) {
    for (const { light, base, phase } of flames) {
      const variation = flicker ? 1 + Math.sin(time * 7.1 + phase) * .045 + Math.sin(time * 12.8 + phase * 2) * .025 : 1;
      light.intensity = night * base * THREE.MathUtils.clamp(strength, 0, 1) * variation;
    }
  }
  return { update };
}
