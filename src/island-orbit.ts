import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createIslandOrbit(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, .7, 0);
  controls.enableDamping = true; controls.dampingFactor = .055; controls.enablePan = false;
  controls.enableZoom = true; controls.zoomSpeed = .7; controls.minDistance = 10; controls.maxDistance = 35;
  controls.minPolarAngle = .55; controls.maxPolarAngle = 1.35; controls.rotateSpeed = .48;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  // Touch gestures belong to this canvas only; the rest of the page scrolls normally.
  canvas.style.touchAction = 'none';
  return controls;
}
