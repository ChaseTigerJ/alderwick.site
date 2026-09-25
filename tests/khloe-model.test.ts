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
