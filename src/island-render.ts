import * as THREE from 'three';

/** One sun/moon direction defines every outdoor shadow. Fill follows that direction. */
export function createIslandLighting(scene: THREE.Scene, coarse: boolean) {
  const sun = new THREE.DirectionalLight(0xffe4b8, 3);
  sun.name = 'HarborSunMoon'; sun.position.set(-8, 16, 8); sun.castShadow = true;
  sun.shadow.mapSize.setScalar(coarse ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, far: 50 });
  sun.shadow.normalBias = .035; sun.shadow.bias = -.0002;
  const ambient = new THREE.HemisphereLight(0xfff6de, 0x8d927c, 1.5);
  const fill = new THREE.DirectionalLight(0xb8d6d0, .45);
  fill.name = 'HarborSoftFill'; fill.position.copy(sun.position); fill.castShadow = false;
  scene.add(sun, ambient, fill);
  const dayAmbient = new THREE.Color(0xfff6de), nightAmbient = new THREE.Color(0xadc5ff);
  return {
    sun,
    update(night: number) {
      sun.intensity = THREE.MathUtils.lerp(3, .35, night);
      sun.color.setRGB(1 - night * .42, .86 - night * .16, .68 + night * .32);
      ambient.intensity = THREE.MathUtils.lerp(1.5, .48, night);
      ambient.color.copy(dayAmbient).lerp(nightAmbient, night);
      fill.intensity = THREE.MathUtils.lerp(.45, .15, night);
    },
    dispose() { sun.shadow.dispose(); },
  };
}

type FrameRenderer = Pick<THREE.WebGLRenderer, 'shadowMap' | 'render'>;

/** Call after all animation. The optional reflection consumes this same fresh shadow map. */
export function renderIslandFrame(renderer: FrameRenderer, scene: THREE.Scene, camera: THREE.Camera, capture?: () => void) {
  scene.updateMatrixWorld(true); camera.updateMatrixWorld();
  // No separate shadow timer: a visible pose and its shadow must share a frame.
  renderer.shadowMap.needsUpdate = true;
  capture?.();
  renderer.render(scene, camera);
}
