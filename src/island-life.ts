import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createVillageVisitor } from './village-visitor.ts';
import { createKhloeAnimation } from './khloe-animation.ts';

export const PAWPRINT_LIFETIME = 5;

/** Small, bounded performances. Everything shares the scene clock and stops offscreen. */
export function createIslandLife(scene: THREE.Scene, model: THREE.Object3D, clips: THREE.AnimationClip[] = []) {
  const visitor = createVillageVisitor(scene, model);
  const dog = model.getObjectByName('Khloe');
  const character = dog ? createKhloeAnimation(dog, clips) : undefined;
  const boat = model.getObjectByName('MerchantShip');
  const boatBase = boat?.position.clone();
  const boatRotation = boat?.rotation.clone();
  const dogBase = dog?.position.clone();
  const bell = model.getObjectByName('ChurchBell'), bellBase = bell?.rotation.clone();
  const mailboxDoor = model.getObjectByName('MailboxDoor'), doorBase = mailboxDoor?.rotation.clone();
  const bucket = model.getObjectByName('WellBucket'), bucketBase = bucket?.position.clone();
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.8, .015, 1.65), new THREE.Vector3(-1.25, .015, 2.05),
    new THREE.Vector3(-.95, .015, 2.62), new THREE.Vector3(-.3, .015, 2.94),
    new THREE.Vector3(.46, .015, 2.86), new THREE.Vector3(.61, .015, 2.18),
    new THREE.Vector3(-.05, .015, 1.75),
  ], true, 'centripetal');
  const pathLength = path.getLength();
  const position = new THREE.Vector3(), tangent = new THREE.Vector3();
  let time = 0, distance = 0, lastPrintDistance = 0, printNumber = 0;
  let dogAction = -100, boatAction = -100, letterAction = -100, bellAction = -100, wellAction = -100, activeSeason = '';
  let firstPose = true;

  // One draw call for a pool of fading four-toed paw impressions.
  const pieces: THREE.BufferGeometry[] = [];
  const pad = new THREE.CircleGeometry(.034, 7); pad.rotateX(-Math.PI / 2); pad.scale(1, 1, .9); pieces.push(pad);
  for (const [x, z] of [[-.036, .033], [-.013, .052], [.013, .052], [.036, .033]]) {
    const toe = new THREE.CircleGeometry(.015, 6); toe.rotateX(-Math.PI / 2); toe.translate(x, 0, z); pieces.push(toe);
  }
  const pawGeometry = mergeGeometries(pieces); pieces.forEach(piece => piece.dispose());
  const pawMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const pawCount = 64;
  const paws = new THREE.InstancedMesh(pawGeometry, pawMaterial, pawCount);
  paws.name = 'KhloeSnowPawprints'; paws.frustumCulled = false; paws.renderOrder = 2;
  paws.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(paws);
  const stamps = Array.from({ length: pawCount }, () => ({ time: -100, x: 0, z: 0, angle: 0 }));
  const stamp = new THREE.Object3D(), printColor = new THREE.Color(), snowColor = new THREE.Color(0xdce7df), pawColor = new THREE.Color(0x879aab);
  for (let i = 0; i < pawCount; i++) { stamp.scale.setScalar(0); stamp.updateMatrix(); paws.setMatrixAt(i, stamp.matrix); paws.setColorAt(i, pawColor); }
  function addPrint(x: number, z: number, angle: number) {
    const p = stamps[printNumber++ % pawCount]; Object.assign(p, { x, z, angle, time });
  }

  // Pip's envelope unfolds into a warm welcome, with a tiny wax seal and paper trail.
  const letter = new THREE.Group(); letter.name = 'PipsLetter'; scene.add(letter);
  const paper = new THREE.MeshStandardMaterial({ color: 0xf4e2b9, emissive: 0xe9c889, emissiveIntensity: .22, roughness: .9, side: THREE.DoubleSide });
  const foldMaterial = new THREE.MeshStandardMaterial({ color: 0xd9bf90, roughness: .9, side: THREE.DoubleSide });
  const sealMaterial = new THREE.MeshStandardMaterial({ color: 0xb65c43, roughness: .7 });
  const envelope = new THREE.Mesh(new THREE.BoxGeometry(.6, .38, .028), paper); letter.add(envelope);
  const flap = new THREE.Group(); flap.position.set(0, .19, .018); letter.add(flap);
  const triangle = new THREE.Shape(); triangle.moveTo(-.3, 0); triangle.lineTo(.3, 0); triangle.lineTo(0, -.22); triangle.closePath();
  flap.add(new THREE.Mesh(new THREE.ShapeGeometry(triangle), foldMaterial));
  const note = new THREE.Mesh(new THREE.PlaneGeometry(.47, .29), paper); note.position.set(0, 0, -.021); letter.add(note);
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(.047, .047, .014, 12), sealMaterial); seal.rotation.x = Math.PI / 2; seal.position.set(0, -.028, .038); letter.add(seal);
  const ink = new THREE.MeshBasicMaterial({ color: 0x395d4c });
  for (let i = 0; i < 3; i++) { const line = new THREE.Mesh(new THREE.PlaneGeometry(i === 2 ? .15 : .31, .009), ink); line.position.set(i === 2 ? -.08 : 0, .065 - i * .047, .001); note.add(line); }
  const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffd897, transparent: true, opacity: .85, depthWrite: false });
  const sparkles = Array.from({ length: 7 }, () => { const spark = new THREE.Mesh(new THREE.IcosahedronGeometry(.034, 0), sparkMaterial); scene.add(spark); return spark; });
  const letterOrigin = new THREE.Vector3(-.15, 1.05, .4);
  model.getObjectByName('PipLetterAnchor')?.getWorldPosition(letterOrigin);
  const dogPin = new THREE.Vector3(), shipPin = new THREE.Vector3();

  const wellOrigin = new THREE.Vector3(.9, .45, 1.23);
  model.getObjectByName('WellWishAnchor')?.getWorldPosition(wellOrigin);
  const tossOrigin = wellOrigin.clone().add(new THREE.Vector3(.2, .18, .75));
  model.getObjectByName('WellTossAnchor')?.getWorldPosition(tossOrigin);
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(.052, .052, .014, 12), new THREE.MeshStandardMaterial({ color: 0xf1cd79, metalness: .65, roughness: .3, emissive: 0xd19b39, emissiveIntensity: .15 }));
  coin.name = 'WishingCoin'; scene.add(coin);
  const wishMaterial = new THREE.MeshBasicMaterial({ color: 0xc7e4d8, transparent: true, opacity: .6, depthWrite: false });
  const wishes = Array.from({ length: 8 }, () => { const wish = new THREE.Mesh(new THREE.IcosahedronGeometry(.015, 0), wishMaterial); scene.add(wish); return wish; });
  const rippleMaterial = wishMaterial.clone();
  const wishRipple = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 32), rippleMaterial);
  wishRipple.name = 'WishingWellRipple'; wishRipple.rotation.x = -Math.PI / 2; scene.add(wishRipple);
  const coinFlight = .95;

  function isActive(id: number) {
    if (id === 6) return visitor.active(time);
    if (id === 0) return time - letterAction < 7;
    if (id === 1) return time - dogAction < 4.7;
    if (id === 2) return time - boatAction < 5;
    if (id === 3) return time - bellAction < 4.2;
    if (id === 4) return time - wellAction < 4.8;
    return false;
  }

  function trigger(id: number, staticMotion: boolean) {
    if (id === 6) return visitor.trigger(time, staticMotion);
    // Rapid repeat clicks never restart or stack a performance.
    if (!staticMotion && isActive(id)) return false;
    if (id === 0) letterAction = time - (staticMotion ? 2.8 : 0);
    if (id === 1) { dogAction = time - (staticMotion ? .7 : 0); if (staticMotion) firstPose = true; }
    if (id === 2) boatAction = time - (staticMotion ? .7 : 0);
    if (id === 3) bellAction = time - (staticMotion ? .35 : 0);
    if (id === 4) wellAction = time - (staticMotion ? 2.1 : 0);
    return true;
  }

  function update(delta: number, motion: boolean, winter: boolean, camera: THREE.Camera) {
    if (motion) time += delta;
    visitor.update(time, motion, camera);
    const dogElapsed = time - dogAction, playing = dogElapsed < 4.7;
    const routine = time % 18;
    const walking = !playing && (routine < 10 || routine > 15.5);
    const sniffing = !playing && routine >= 10 && routine < 13;
    if (motion && walking) distance += delta * .38;
    if (dog) {
      position.copy(path.getPointAt(((distance / pathLength) % 1 + 1) % 1));
      tangent.copy(path.getTangentAt(((distance / pathLength) % 1 + 1) % 1));
      const pathHeading = Math.atan2(tangent.x, tangent.z);
      const heading = playing ? Math.atan2(camera.position.x - position.x, camera.position.z - position.z) : pathHeading;
      const headingDelta = Math.atan2(Math.sin(heading - dog.rotation.y), Math.cos(heading - dog.rotation.y));
      dog.rotation.y += headingDelta * (firstPose ? 1 : motion ? Math.min(delta * 6, 1) : 0);
      dog.position.copy(position);
      character?.update(delta, motion, { walking, sniffing, playing, dogElapsed });
      if (winter && walking && motion && distance - lastPrintDistance > .16) {
        const side = printNumber % 4 < 2 ? -1 : 1;
        // Match the new rig's narrower forepaws and slightly wider rear stance.
        for (const [forward, spread] of [[.245, .08], [-.24, .10]]) addPrint(dog.position.x + Math.cos(heading) * side * spread + Math.sin(heading) * forward, dog.position.z - Math.sin(heading) * side * spread + Math.cos(heading) * forward, heading);
        lastPrintDistance = distance;
      }
      dogPin.copy(dog.position).add(new THREE.Vector3(0, 1.05, 0));
      firstPose = false;
    } else dogPin.set(-.8, 1, 1.65);

    const newSeason = winter ? 'winter' : 'other';
    if (activeSeason !== newSeason) { stamps.forEach(p => { p.time = -100; }); activeSeason = newSeason; lastPrintDistance = distance; }
    paws.visible = winter;
    if (winter) {
      for (let i = 0; i < pawCount; i++) {
        const p = stamps[i], age = time - p.time;
        stamp.position.set(p.x, .043, p.z); stamp.rotation.set(0, p.angle, 0); stamp.scale.setScalar(age < PAWPRINT_LIFETIME ? 1 : 0); stamp.updateMatrix(); paws.setMatrixAt(i, stamp.matrix);
        printColor.copy(pawColor).lerp(snowColor, THREE.MathUtils.clamp(age - (PAWPRINT_LIFETIME - 1), 0, 1)); paws.setColorAt(i, printColor);
      }
      paws.instanceMatrix.needsUpdate = true; if (paws.instanceColor) paws.instanceColor.needsUpdate = true;
    }
    if (boat && boatBase && boatRotation) {
      const elapsed = time - boatAction;
      const flourish = elapsed < 5 ? Math.sin(Math.min(elapsed / .6, 1) * Math.PI / 2) * Math.exp(-elapsed * .52) : 0;
      boat.position.copy(boatBase); boat.rotation.copy(boatRotation);
      boat.position.y += Math.sin(time * 1.2) * .019 + Math.sin(elapsed * 4.8) * .075 * flourish;
      boat.rotation.z += Math.sin(time * .9) * .012 + Math.sin(elapsed * 5.5) * .16 * flourish;
      boat.rotation.x += Math.cos(time * .8) * .007 + Math.sin(elapsed * 3.5) * .055 * flourish;
      boat.getWorldPosition(shipPin); shipPin.y += 1.5;
    } else shipPin.set(3.2, .7, 4.7);

    const letterElapsed = time - letterAction;
    const showLetter = letterElapsed >= 0 && letterElapsed < 7;
    const opening = THREE.MathUtils.smoothstep(letterElapsed, 0, .8) * (1 - THREE.MathUtils.smoothstep(letterElapsed, 5.5, 7));
    if (mailboxDoor && doorBase) { mailboxDoor.rotation.copy(doorBase); mailboxDoor.rotation.x += opening * 1.3; }
    letter.visible = showLetter; sparkles.forEach(spark => { spark.visible = showLetter; });
    if (showLetter) {
      const entrance = THREE.MathUtils.smoothstep(letterElapsed, 0, 1.2), exit = 1 - THREE.MathUtils.smoothstep(letterElapsed, 5.3, 7);
      const amount = entrance * exit;
      letter.position.copy(letterOrigin).add(new THREE.Vector3(Math.sin(letterElapsed * 1.5) * .45 * amount, (1.0 + Math.sin(letterElapsed * 2) * .15) * amount, .45 * amount));
      letter.quaternion.copy(camera.quaternion); letter.rotateZ(Math.sin(letterElapsed * 2) * .15);
      letter.scale.setScalar(Math.max(.001, amount * 1.4));
      const unfold = THREE.MathUtils.smoothstep(letterElapsed, 1.1, 2.4) * exit;
      flap.rotation.x = -Math.PI * unfold; note.position.y = unfold * .29; note.position.z = THREE.MathUtils.lerp(-.021, .04, unfold); seal.visible = unfold < .4;
      sparkles.forEach((spark, i) => { const phase = letterElapsed * 2 + i; spark.position.copy(letter.position).add(new THREE.Vector3(Math.sin(phase) * (.25 + i * .045), -.18 - i * .11, Math.cos(phase) * .22)); spark.scale.setScalar(amount * (1 - i * .09)); });
    }
    const bellElapsed = time - bellAction;
    if (bell && bellBase) {
      bell.rotation.copy(bellBase);
      if (bellElapsed < 4.2) bell.rotation.x += Math.sin(bellElapsed * 10) * Math.exp(-bellElapsed * .75) * .62;
    }
    const wellElapsed = time - wellAction, wishing = wellElapsed >= 0 && wellElapsed < 4.8;
    if (bucket && bucketBase) { bucket.position.copy(bucketBase); if (wishing) bucket.position.y += Math.sin(wellElapsed / 4.8 * Math.PI) * .075; }
    coin.visible = wishing && wellElapsed < coinFlight;
    if (coin.visible) {
      const progress = wellElapsed / coinFlight;
      // A short underhand arc enters through the open front, beneath the roof.
      coin.position.lerpVectors(tossOrigin, wellOrigin, progress);
      coin.position.y += .8 * progress * (1 - progress);
      coin.rotation.set(progress * 9, progress * 3, .4);
    }
    const rippleAge = wellElapsed - coinFlight;
    wishRipple.visible = wishing && rippleAge >= 0 && rippleAge < 1.25;
    if (wishRipple.visible) {
      wishRipple.position.copy(wellOrigin); wishRipple.position.y += .008;
      wishRipple.scale.setScalar(.035 + rippleAge * .028);
      rippleMaterial.opacity = .48 * (1 - rippleAge / 1.25);
    }
    wishes.forEach((wish, i) => {
      const age = wellElapsed - coinFlight - i * .009;
      wish.visible = wishing && age >= 0 && age < .5;
      if (!wish.visible) return;
      const a = i * Math.PI / 4;
      wish.position.set(wellOrigin.x + Math.cos(a) * age * .18, wellOrigin.y + .8 * age - 1.6 * age * age, wellOrigin.z + Math.sin(a) * age * .18);
      wish.scale.setScalar(1 - age * 2);
    });
    return { dogPin, shipPin, active: playing || showLetter || time - boatAction < 5 || bellElapsed < 4.2 || wishing };
  }
  return { update, trigger, isActive, dog, boat, dogBase, dispose: () => character?.dispose() };
}
