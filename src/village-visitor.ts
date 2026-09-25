import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const VISITOR_DURATION = 9;

/** Pip's established-game palette and costume, adapted from citizenModel at miniature scale. */
export function createVillageVisitor(scene: THREE.Scene, model: THREE.Object3D) {
  const root = new THREE.Group(); root.name = 'PipThePostman'; root.visible = false; scene.add(root);
  const body = new THREE.Group(); body.name = 'PipBody'; body.scale.setScalar(.35); root.add(body);
  const palette = new Map<string, THREE.MeshStandardMaterial>();
  function material(color: string) {
    if (!palette.has(color)) palette.set(color, new THREE.MeshStandardMaterial({ color, roughness: .86 }));
    return palette.get(color)!;
  }
  function box(parent: THREE.Group, size: number[], at: number[], color: string) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size as [number, number, number]), material(color));
    mesh.position.set(...at as [number, number, number]); parent.add(mesh); return mesh;
  }
  function cylinder(parent: THREE.Group, top: number, bottom: number, height: number, at: number[], color: string) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 10), material(color));
    mesh.position.set(...at as [number, number, number]); parent.add(mesh); return mesh;
  }
  function bake(parent: THREE.Group) {
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    for (const object of [...parent.children]) {
      if (!(object instanceof THREE.Mesh)) continue;
      object.updateMatrix(); const geometry = object.geometry.clone().applyMatrix4(object.matrix);
      if (!batches.has(object.material)) batches.set(object.material, []);
      batches.get(object.material)!.push(geometry); object.geometry.dispose(); parent.remove(object);
    }
    for (const [mat, geometries] of batches) {
      const mesh = new THREE.Mesh(mergeGeometries(geometries), mat); mesh.castShadow = mesh.receiveShadow = true;
      parent.add(mesh); geometries.forEach(geometry => geometry.dispose());
    }
  }
  const coat = '#ce8757', skin = '#efc8a0', hair = '#92644a', cream = '#d8c59c';
  box(body, [.51, .65, .34], [0, 1.05, 0], coat);
  for (const x of [-.16, .16]) box(body, [.17, .45, .36], [x, .68, -.015], coat);
  box(body, [.25, .54, .045], [0, 1.12, .193], cream);
  box(body, [.53, .07, .36], [0, .82, 0], '#624933');
  box(body, [.1, .08, .045], [0, .82, .2], '#cba666');
  for (const x of [-.17, .17]) box(body, [.09, .34, .055], [x, 1.26, .203], coat).rotation.z = x * 1.2;
  for (const y of [.93, 1.07, 1.21]) box(body, [.04, .04, .03], [.04, y, .223], '#e3c278');
  box(body, [.21, .13, .32], [0, 1.43, 0], '#eee1c0');
  box(body, [.11, .2, .04], [0, 1.31, .218], '#f1e6ca');
  box(body, [.48, .43, .42], [0, 1.68, 0], skin);
  box(body, [.49, .105, .435], [0, 1.91, -.012], hair);
  box(body, [.5, .27, .08], [0, 1.8, -.21], hair);
  for (const x of [-.13, .13]) box(body, [.045, .055, .025], [x, 1.68, .223], '#363b30');
  box(body, [.08, .075, .065], [0, 1.6, .244], skin);
  // The Courier's capotain and cross-body postal satchel identify Pip in the game.
  cylinder(body, .43, .43, .06, [0, 1.94, 0], '#584b3b');
  cylinder(body, .24, .3, .31, [0, 2.12, 0], '#584b3b');
  cylinder(body, .298, .307, .055, [0, 2.025, 0], '#896a48');
  box(body, [.27, .31, .18], [-.32, .85, .02], '#9a7448');
  box(body, [.045, .6, .04], [-.14, 1.12, .238], '#8b683f').rotation.z = -.55;
  bake(body);
  function limb(side: number, arm: boolean) {
    const pivot = new THREE.Group(); pivot.name = `Pip${side < 0 ? 'Left' : 'Right'}${arm ? 'Arm' : 'Leg'}`;
    pivot.position.set(side * (arm ? .34 : .14), arm ? 1.31 : .73, 0); body.add(pivot);
    if (arm) {
      box(pivot, [.17, .55, .22], [0, -.265, 0], coat);
      box(pivot, [.19, .07, .23], [0, -.51, 0], cream);
      box(pivot, [.17, .14, .18], [0, -.62, 0], skin);
      if (side < 0) {
        const envelope = box(pivot, [.34, .24, .03], [-.015, -.60, .12], '#f4e7c5'); envelope.rotation.z = -.16;
        const seal = cylinder(pivot, .035, .035, .012, [-.015, -.60, .142], '#9c5140'); seal.rotation.x = Math.PI / 2;
      }
    } else {
      box(pivot, [.195, .34, .22], [0, -.16, 0], '#6b6554');
      box(pivot, [.175, .31, .195], [0, -.475, 0], '#d5caae');
      box(pivot, [.22, .15, .34], [0, -.65, .058], '#424940');
      box(pivot, [.07, .055, .018], [0, -.62, .237], '#af9971');
    }
    bake(pivot); return pivot;
  }
  const leftArm = limb(-1, true), rightArm = limb(1, true), leftLeg = limb(-1, false), rightLeg = limb(1, false);
  const door = model.getObjectByName('VillageDoor'), doorBase = door?.rotation.clone();
  const start = model.getObjectByName('DoorVisitorStart')?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(-2.25, .1, .25);
  const end = model.getObjectByName('DoorVisitorEnd')?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(-2.1, .015, 1.15);
  const direction = end.clone().sub(start); const heading = Math.atan2(direction.x, direction.z);
  let began = -100, lastFacing = heading, firstPose = true;
  const active = (time: number) => time - began >= 0 && time - began < VISITOR_DURATION;
  return {
    root, start, end, active,
    trigger(time: number, staticMotion: boolean) {
      if (!staticMotion && active(time)) return false;
      began = time - (staticMotion ? 3.5 : 0); lastFacing = heading; firstPose = true; return true;
    },
    update(time: number, motion: boolean, camera: THREE.Camera) {
      const elapsed = time - began;
      const open = THREE.MathUtils.smoothstep(elapsed, 0, .6) * (1 - THREE.MathUtils.smoothstep(elapsed, 8.1, 9));
      if (door && doorBase) { door.rotation.copy(doorBase); door.rotation.y += open * Number(door.userData.openAngle ?? -1.55); }
      root.visible = active(time) && elapsed >= .6 && elapsed < 8.1;
      if (!root.visible) return;
      const outward = THREE.MathUtils.smoothstep(elapsed, .6, 2.7), inward = THREE.MathUtils.smoothstep(elapsed, 5.7, 8.1);
      const progress = outward * (1 - inward); root.position.copy(start).lerp(end, progress);
      const walking = elapsed < 2.7 || elapsed >= 5.7;
      const wave = THREE.MathUtils.smoothstep(elapsed, 2.7, 3.1) * (1 - THREE.MathUtils.smoothstep(elapsed, 5, 5.4));
      if (motion || firstPose) {
        const towardCamera = Math.atan2(camera.position.x - end.x, camera.position.z - end.z);
        const desired = elapsed < 2.7 ? heading : elapsed < 5.4 ? towardCamera : heading + Math.PI;
        lastFacing += Math.atan2(Math.sin(desired - lastFacing), Math.cos(desired - lastFacing)) * (firstPose ? 1 : .18);
        firstPose = false;
      }
      root.rotation.y = lastFacing;
      const gait = walking ? Math.sin(elapsed * 13) * .38 : 0;
      leftLeg.rotation.x = gait; rightLeg.rotation.x = -gait;
      leftArm.rotation.x = -gait * .7; rightArm.rotation.x = gait * .7 - wave * .15;
      rightArm.rotation.z = wave * (2.35 + Math.sin(elapsed * 9) * .24);
      body.position.y = walking ? Math.abs(Math.sin(elapsed * 13)) * .008 : 0;
    },
  };
}
