import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

async function character() {
  const bytes = await readFile(new URL('../public/models/alderwick-island.glb', import.meta.url));
  const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const dog = asset.scene.getObjectByName('Khloe')!;
  assert.ok(dog, 'export includes the path root');
  const skins: THREE.SkinnedMesh[] = [];
  dog.traverse(object => { if (object instanceof THREE.SkinnedMesh) skins.push(object); });
  return { ...asset, dog, skins };
}

test('the shipping character retains a weighted skeleton and complete authored performances', async () => {
  const { dog, skins, animations } = await character();
  assert.ok(skins.length > 0, 'the exported dog must remain skinned after island batching');
  for (const skin of skins) {
    assert.ok(skin.skeleton.bones.length >= 20, 'ears, neck, legs and tail retain articulated joints');
    const weights = skin.geometry.getAttribute('skinWeight');
    assert.ok(weights);
    for (let i = 0; i < weights.count; i++) {
      const total = weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i);
      assert.ok(Math.abs(total - 1) < .001, `unbound or unnormalized vertex ${i}`);
    }
    for (const bone of skin.skeleton.bones) {
      let parent: THREE.Object3D | null = bone;
      while (parent && parent !== dog) parent = parent.parent;
      assert.equal(parent, dog, 'all joints follow the roaming character root');
    }
  }
  for (const name of ['KhloeIdle', 'KhloeWalk', 'KhloeSniff', 'KhloePlay', 'KhloeSitCurious']) {
    const clip = THREE.AnimationClip.findByName(animations, name);
    assert.ok(clip && clip.tracks.length > 0, `${name} is exported and animated`);
    assert.ok(clip.duration > 0);
    for (const track of clip.tracks) {
      const { nodeName } = THREE.PropertyBinding.parseTrackName(track.name);
      assert.ok(THREE.PropertyBinding.findNode(dog, nodeName), `${track.name} resolves within Khloé`);
      for (const value of track.values) assert.ok(Number.isFinite(value));
    }
  }
  assert.ok(Math.abs(THREE.AnimationClip.findByName(animations, 'KhloePlay')!.duration - 4.7) < .05, 'clip length matches the bounded discovery clock');
});

test('all character poses remain finite and at island scale, with no detached or exploding skin', async () => {
  const { dog, skins, animations } = await character();
  dog.position.set(0, 0, 0); dog.rotation.set(0, 0, 0);
  assert.ok(dog.scale.toArray().every(value => Math.abs(value - .86 * .6) < 1e-6), '40% smaller on the island');
  assert.equal(dog.userData.locomotionScale, .6);
  dog.scale.setScalar(.86); // Check skin integrity at the established reference size.
  const mixer = new THREE.AnimationMixer(dog), vertex = new THREE.Vector3();
  const bounds = new THREE.Box3();
  for (const clip of animations.filter(clip => clip.name.startsWith('Khloe'))) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    for (let step = 0; step <= 12; step++) {
      action.time = clip.duration * step / 12; mixer.update(0); dog.updateMatrixWorld(true); bounds.makeEmpty();
      for (const skin of skins) {
        for (let i = 0; i < skin.geometry.getAttribute('position').count; i++) {
          skin.getVertexPosition(i, vertex).applyMatrix4(skin.matrixWorld);
          assert.ok(vertex.toArray().every(Number.isFinite), `${clip.name}: invalid skin vertex`);
          bounds.expandByPoint(vertex);
        }
      }
      const size = bounds.getSize(new THREE.Vector3());
      assert.ok(size.x < 1.8 && size.y < 1.8 && size.z < 2.4, `${clip.name} escaped character bounds: ${size.toArray()}`);
      assert.ok(size.y > .35, `${clip.name} collapsed the dog`);
      assert.ok(bounds.min.y > -.07, `${clip.name} sinks through the ground: ${bounds.min.y}`);
    }
  }
  mixer.stopAllAction(); mixer.uncacheRoot(dog);
});

test('brow expressions deform the original face in every clip without added eyes or collar', async () => {
  const { dog, skins, animations } = await character();
  assert.equal(skins.length, 7, 'five original material meshes plus two fitted brow markings');
  dog.traverse(node => assert.ok(!/eye|collar|tag/i.test(node.name), `unexpected face or neck accessory: ${node.name}`));
  const mixer = new THREE.AnimationMixer(dog);
  let largestChange = 0;
  for (const skin of skins) {
    assert.deepEqual(Object.keys(skin.morphTargetDictionary ?? {}).sort(), ['KhloeBrowLeft', 'KhloeBrowRight']);
    const base = skin.geometry.getAttribute('position');
    for (const morph of skin.geometry.morphAttributes.position) {
      for (let i = 0; i < base.count; i++) {
        const delta = new THREE.Vector3().fromBufferAttribute(morph, i);
        if (!skin.geometry.morphTargetsRelative) delta.sub(new THREE.Vector3().fromBufferAttribute(base, i));
        assert.ok(delta.toArray().every(Number.isFinite), 'morph cannot break skin geometry');
        largestChange = Math.max(largestChange, delta.length());
      }
    }
  }
  assert.ok(largestChange > 0, 'brows actually deform existing geometry');
  for (const clip of animations.filter(clip => clip.name.startsWith('Khloe'))) {
    const weights = clip.tracks.filter(track => track.name.endsWith('.morphTargetInfluences'));
    assert.equal(weights.length, skins.length, `${clip.name} includes every original material seam`);
    for (const track of weights) {
      assert.ok([...track.values].every(value => Number.isFinite(value) && value >= 0 && value <= 1), 'bounded expression weights');
      assert.ok(Math.max(...track.values) - Math.min(...track.values) > .01, 'expression changes during playback');
    }
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    let expressed = false;
    for (let frame = 0; frame <= 12; frame++) {
      action.time = clip.duration * frame / 12; mixer.update(0);
      expressed ||= skins.some(skin => skin.morphTargetInfluences!.some(value => value > .01));
    }
    assert.ok(expressed, `${clip.name} drives the shipped morphs`);
  }
  mixer.stopAllAction(); mixer.uncacheRoot(dog);
});

// Check actual deformed surfaces: shared morph names alone do not prove attachment.
test('visible brows remain on the forehead through every exported performance', async () => {
  const { dog, skins, animations } = await character();
  const brows = skins.filter(skin => skin.userData.faceFittedBrow);
  const coat = skins.filter(skin => !skin.userData.faceFittedBrow);
  assert.equal(brows.length, 2);
  for (const brow of brows) {
    const material = brow.material as THREE.MeshStandardMaterial;
    assert.ok(material.color.getHex() < 0x555555, 'brows contrast against the tan forehead');
    assert.ok(material.roughness > .8, 'matte character style');
  }
  const mixer = new THREE.AnimationMixer(dog), point = new THREE.Vector3(), closest = new THREE.Vector3();
  for (const clip of animations.filter(clip => clip.name.startsWith('Khloe'))) {
    mixer.stopAllAction();
    const action = mixer.clipAction(clip).setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play();
    for (let frame = 0; frame <= 12; frame++) {
      action.time = clip.duration * frame / 12; mixer.update(0); dog.updateMatrixWorld(true);
      const triangles: THREE.Triangle[] = [];
      for (const skin of coat) {
        const vertices = Array.from({ length: skin.geometry.getAttribute('position').count }, (_, index) =>
          skin.getVertexPosition(index, new THREE.Vector3()).applyMatrix4(skin.matrixWorld));
        const indices = skin.geometry.index;
        for (let i = 0; i < (indices?.count ?? vertices.length); i += 3) {
          triangles.push(new THREE.Triangle(...[0, 1, 2].map(j => vertices[indices ? indices.getX(i + j) : i + j]) as [THREE.Vector3, THREE.Vector3, THREE.Vector3]));
        }
      }
      for (const brow of brows) {
        for (let vertex = 0; vertex < brow.geometry.getAttribute('position').count; vertex += 3) {
          brow.getVertexPosition(vertex, point).applyMatrix4(brow.matrixWorld);
          let distance = Infinity;
          for (const triangle of triangles) distance = Math.min(distance, triangle.closestPointToPoint(point, closest).distanceToSquared(point));
          assert.ok(distance < .007 ** 2, `${clip.name}: brow separates from forehead by ${Math.sqrt(distance)}`);
        }
      }
    }
  }
  // Freeze the skeleton, then isolate the marking's actual expression travel.
  mixer.stopAllAction(); mixer.clipAction(THREE.AnimationClip.findByName(animations, 'KhloeIdle')!).play(); mixer.update(0); dog.updateMatrixWorld(true);
  let travel = 0;
  for (const brow of brows) {
    const original = [...brow.morphTargetInfluences!];
    brow.morphTargetInfluences!.fill(0);
    const resting = Array.from({length:brow.geometry.getAttribute('position').count}, (_,i) => brow.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(brow.matrixWorld));
    brow.morphTargetInfluences!.fill(1);
    resting.forEach((v,i) => {travel=Math.max(travel,v.distanceTo(brow.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(brow.matrixWorld)));});
    brow.morphTargetInfluences = original;
  }
  assert.ok(travel > .01 && travel < .035, `readable brow lift at island scale: ${travel}`);
  mixer.stopAllAction(); mixer.uncacheRoot(dog);
});
