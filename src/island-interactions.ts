import * as THREE from 'three';
import { createIslandTapTracker } from './island-tap.ts';

const actors = ['Mailbox', 'Khloe', 'MerchantShip', 'ChurchBell', 'WishingWell', null, 'VillageDoor'];

/** Pick the miniature's objects, never a screen-space marker or hidden DOM target. */
export function createIslandPicker(model: THREE.Object3D) {
  const roots = actors.map(name => name ? model.getObjectByName(name) : undefined);
  const skins: THREE.SkinnedMesh[] = [];
  model.traverse(object => { if (object instanceof THREE.SkinnedMesh) skins.push(object); });
  const box = new THREE.Box3(), point = new THREE.Vector3();
  const treeCenters: THREE.Vector3[] = [];
  model.traverse(object => {
    if (object.name.startsWith('TreeCanopy_')) treeCenters.push(object.getWorldPosition(new THREE.Vector3()));
  });
  function actorId(object: THREE.Object3D): number | null {
    for (let current: THREE.Object3D | null = object; current; current = current.parent) {
      const id = roots.indexOf(current);
      if (id >= 0) return id;
    }
    return null;
  }
  return (ray: THREE.Raycaster): number | null => {
    model.updateMatrixWorld(true);
    // Raycasting and forgiving hit bounds must follow the current animated pose.
    for (const skin of skins) {
      skin.computeBoundingBox();
      skin.boundingSphere ??= new THREE.Sphere();
      skin.boundingBox!.getBoundingSphere(skin.boundingSphere);
    }
    const surface = ray.intersectObject(model, true).find(hit => hit.object instanceof THREE.Mesh && hit.object.visible);
    if (surface) {
      const id = actorId(surface.object);
      if (id !== null) return id;
      const mesh = surface.object as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (materials.some(material => /^leaf_(gold|orange|light|green|pine)/.test(material.name)) && treeCenters.some(center => center.distanceTo(surface.point) < 1.7)) return 5;
    }
    // Small objects get forgiving three-dimensional bounds, but cannot be clicked
    // through a nearer house. These volumes track the roaming dog and door leaf.
    let nearest = Infinity, chosen: number | null = null;
    roots.forEach((root, id) => {
      // The ship's bounding box includes large empty spaces between its masts;
      // only its actual hull, sails and rigging count as a ship hit.
      if (!root || !root.visible || id === 2) return;
      box.setFromObject(root).expandByScalar(id === 3 ? .18 : .10);
      if (!ray.ray.intersectBox(box, point)) return;
      const distance = point.distanceTo(ray.ray.origin);
      if (distance < nearest && (!surface || distance <= surface.distance + .12)) { nearest = distance; chosen = id; }
    });
    return chosen;
  };
}

export function attachIslandInteractions(host: HTMLElement, canvas: HTMLCanvasElement, camera: THREE.Camera, model: THREE.Object3D, discover: (id: number, point?: THREE.Vector3) => void) {
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(), pick = createIslandPicker(model);
  const taps = createIslandTapTracker();
  function hit(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld(); ray.setFromCamera(pointer, camera);
    return pick(ray);
  }
  function down(event: PointerEvent) {
    if (event.button !== 0) return;
    taps.down(event, performance.now());
  }
  function move(event: PointerEvent) {
    taps.move(event);
    if (event.pointerType === 'mouse') canvas.style.cursor = event.buttons ? 'grabbing' : hit(event) !== null ? 'pointer' : 'grab';
  }
  function up(event: PointerEvent) {
    if (!taps.up(event, performance.now())) return;
    const id = hit(event); if (id !== null) discover(id, id === 5 ? ray.intersectObject(model, true)[0]?.point : undefined);
  }
  function cancel(event: PointerEvent) { taps.cancel(event); }
  function leave() { canvas.style.cursor = 'grab'; }
  // Capture observes taps before OrbitControls, without blocking native gestures.
  host.addEventListener('pointerdown', down, true); host.addEventListener('pointermove', move, true);
  host.addEventListener('pointerup', up, true); host.addEventListener('pointercancel', cancel, true);
  host.addEventListener('pointerleave', leave);
  // The host handles a successful tap first; this also clears releases outside
  // the canvas, cancelled gestures and a tab/window losing focus.
  window.addEventListener('pointerup', cancel); window.addEventListener('pointercancel', cancel);
  window.addEventListener('blur', taps.clear); canvas.addEventListener('lostpointercapture', cancel);
  canvas.style.cursor = 'grab';
  return () => {
    host.removeEventListener('pointerdown', down, true); host.removeEventListener('pointermove', move, true);
    host.removeEventListener('pointerup', up, true); host.removeEventListener('pointercancel', cancel, true);
    host.removeEventListener('pointerleave', leave);
    window.removeEventListener('pointerup', cancel); window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('blur', taps.clear); canvas.removeEventListener('lostpointercapture', cancel); taps.clear();
  };
}
