import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Season } from './Island';

const TAU = Math.PI * 2;
const WATER_Y = -.925;
const fallbackTrees = [
  [-4.4, .75, 1.15], [-4.7, -.5, 1.03], [-4.6, 1.8, .95], [-2.5, 2.9, 1.07],
  [-1, 3.02, 1.2], [1.8, 3, 1.05], [3.2, 2.43, 1.2], [4.28, 1.43, 1.08],
  [4.7, -.18, 1.02], [3.67, -1.3, .78], [-4, -2, .74], [-1.8, -2.9, .77],
];

/** All effects advance only from the caller's visible, unpaused scene delta. */
export function createIslandAtmosphere(scene: THREE.Scene, model: THREE.Object3D, options: { random?: () => number } = {}) {
  let seed = 5371;
  const random = options.random ?? (() => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; });
  const between = (min: number, max: number) => min + random() * (max - min);
  const root = new THREE.Group(); root.name = 'IslandAtmosphere'; scene.add(root);
  const matrixObject = new THREE.Object3D();
  function instance(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) {
    matrixObject.position.set(x, y, z); matrixObject.rotation.set(rx, ry, rz); matrixObject.scale.set(sx, sy, sz); matrixObject.updateMatrix(); mesh.setMatrixAt(index, matrixObject.matrix);
  }
  function pool(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, count: number) {
    const mesh = new THREE.InstancedMesh(geometry, material, count); mesh.name = name; mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(mesh); return mesh;
  }
  model.updateMatrixWorld(true);
  const trees: THREE.Vector3[] = [];
  model.traverse(object => { if (object.name.startsWith('TreeCanopy_')) trees.push(object.getWorldPosition(new THREE.Vector3())); });
  if (!trees.length) trees.push(...fallbackTrees.map(([x, y, scale]) => new THREE.Vector3(x, 1.9 * scale, -y)));

  // Read the authored meadow's irregular perimeter, preserving the source shape.
  // The cliff narrows to ~96% at the waterline; foam rests just outside that lip.
  const coastVertices = new Map<string, THREE.Vector3>();
  const vertex = new THREE.Vector3();
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (!materials.some(material => material.name === 'grass_ground')) return;
    const positions = object.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
      if (vertex.x * vertex.x + vertex.z * vertex.z > 4) coastVertices.set(`${vertex.x.toFixed(3)},${vertex.z.toFixed(3)}`, vertex.clone());
    }
  });
  let perimeter = [...coastVertices.values()].sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
  if (perimeter.length < 12) perimeter = Array.from({ length: 52 }, (_, i) => {
    const a = i * TAU / 52, wave = 1 + .032 * Math.sin(5 * a) + .033 * Math.cos(9 * a);
    return new THREE.Vector3(5.7 * Math.cos(a) * wave, 0, -4.15 * Math.sin(a) * wave);
  }).sort((a, b) => Math.atan2(a.z, a.x) - Math.atan2(b.z, b.x));
  const shoreSamples = perimeter.flatMap((point, i) => [0, .5].map(fraction => {
    const p = point.clone().lerp(perimeter[(i + 1) % perimeter.length], fraction).multiplyScalar(.969);
    const outward = new THREE.Vector3(p.x / (5.7 * 5.7), 0, p.z / (4.15 * 4.15)).normalize();
    p.addScaledVector(outward, .055); p.y = WATER_Y;
    return { p, outward, phase: random(), length: between(.25, .45), present: random() > .34, rotation: Math.atan2(outward.x, outward.z) };
  }));
  const foamMaterial = new THREE.MeshBasicMaterial({ color: 0xe0f3e4, transparent: true, opacity: .42, depthWrite: false, side: THREE.DoubleSide });
  const foamGeometry = new THREE.PlaneGeometry(1, 1); foamGeometry.rotateX(-Math.PI / 2);
  // Separate rounded flecks leave small holes and broken scalloped edges in each crest.
  const foamFlecks = [[-.39, .04, .10, .29], [-.16, -.08, .085, .35], [.075, .05, .12, .27], [.36, -.055, .075, .31]].map(([x, z, width, depth]) => {
    const fleck = new THREE.CircleGeometry(1, 7); fleck.rotateX(-Math.PI / 2); fleck.scale(width, 1, depth); fleck.translate(x, 0, z); return fleck;
  });
  const shoreFoamGeometry = mergeGeometries(foamFlecks); foamFlecks.forEach(fleck => fleck.dispose());
  const shoreFoam = pool('IrregularShoreFoam', shoreFoamGeometry, foamMaterial, shoreSamples.length); shoreFoam.renderOrder = 1;
  const waveMaterial = new THREE.MeshBasicMaterial({ color: 0xb5e6de, transparent: true, opacity: .34, depthWrite: false, side: THREE.DoubleSide });
  const wavelets = pool('CoastalWavelets', foamGeometry, waveMaterial, shoreSamples.length);
  const postGeometry = new THREE.RingGeometry(.105, .135, 20); postGeometry.rotateX(-Math.PI / 2);
  const postFoam = pool('DockPostFoam', postGeometry, foamMaterial, 6);
  const posts = [.15, 1.15].flatMap(x => [3.78, 4.85, 6.04].map(z => ({ x, z, phase: random() })));
  const splashGeometry = new THREE.IcosahedronGeometry(1, 0);
  const splashMaterial = new THREE.MeshBasicMaterial({ color: 0xe4f5ee, transparent: true, opacity: .6, depthWrite: false });
  const splashes = pool('ShoreSplashes', splashGeometry, splashMaterial, 18);
  const splashPhases = Array.from({ length: 18 }, () => ({ phase: random(), shore: Math.floor(random() * shoreSamples.length), speed: between(.18, .26) }));
  const ship = model.getObjectByName('MerchantShip');
  const shipFoam = pool('MerchantShipWaterlineFoam', foamGeometry, foamMaterial, 22);
  const shipPoint = new THREE.Vector3(), shipTangent = new THREE.Vector3(), shipMatrix = new THREE.Matrix4();
  const shipStations = [[-1.38, .035], [-1.12, .29], [-.62, .43], [.25, .46], [.85, .39], [1.12, .28]];
  const hull = [-1, 1].flatMap(side => Array.from({ length: 11 }, (_, i) => {
    const segment = Math.min(4, Math.floor(i / 2)), f = (i / 2) - segment;
    return new THREE.Vector3(THREE.MathUtils.lerp(shipStations[segment][1], shipStations[segment + 1][1], f) * side, .06, -THREE.MathUtils.lerp(shipStations[segment][0], shipStations[segment + 1][0], f));
  }));

  // A single transparent Fresnel shell: only a soft rim, never an opaque sphere.
  const globe = new THREE.Group(); globe.name = 'WinterSnowglobe'; root.add(globe);
  const glassMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.FrontSide,
    uniforms: { tint: { value: new THREE.Color(0xc9eced) }, strength: { value: .12 } },
    vertexShader: 'varying vec3 normalView; varying vec3 eye; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);normalView=normalize(normalMatrix*normal);eye=-p.xyz;gl_Position=projectionMatrix*p;}',
    fragmentShader: 'uniform vec3 tint; uniform float strength; varying vec3 normalView; varying vec3 eye; void main(){float rim=pow(1.0-abs(dot(normalize(normalView),normalize(eye))),4.0);gl_FragColor=vec4(tint,.003+rim*strength);}',
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(7.9, 48, 24, 0, TAU, 0, Math.PI / 2), glassMaterial); shell.name = 'SnowglobeGlassDome'; shell.position.y = -.94; shell.renderOrder = 4; globe.add(shell);
  const rimGeometry = new THREE.RingGeometry(7.88, 7.9, 96); rimGeometry.rotateX(-Math.PI / 2);
  const rim = new THREE.Mesh(rimGeometry, new THREE.MeshBasicMaterial({ color: 0xc9e6e5, transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide })); rim.position.y = -.918; globe.add(rim);
  const snowCount = 420, snowPositions = new Float32Array(snowCount * 3);
  const snowSeeds = Array.from({ length: snowCount }, () => {
    const a = random() * TAU, radius = Math.sqrt(random()) * 7.2;
    return { x: Math.cos(a) * radius, z: Math.sin(a) * radius, top: Math.sqrt(7.9 * 7.9 - (radius + .17) ** 2) - 1.15, phase: random(), speed: between(.16, .32) };
  });
  const snowGeometry = new THREE.BufferGeometry(); snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3).setUsage(THREE.DynamicDrawUsage));
  const snowMaterial = new THREE.PointsMaterial({ color: 0xf6fffc, size: .037, transparent: true, opacity: .78, depthWrite: false });
  const snow = new THREE.Points(snowGeometry, snowMaterial); snow.name = 'SnowInsideGlobe'; snow.frustumCulled = false; globe.add(snow);

  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, .075, 0, -.035, 0, 0, 0, -.055, 0, .035, 0, 0, 0, 0, .012], 3));
  leafGeometry.setIndex([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]); leafGeometry.computeVertexNormals();
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, side: THREE.DoubleSide });
  const groundCount = 128, groundLeaves = pool('AutumnGroundLeaves', leafGeometry, leafMaterial, groundCount);
  const autumnPalette = [new THREE.Color(0xc97639), new THREE.Color(0xcfa34e), new THREE.Color(0x966345), new THREE.Color(0xa85432)];
  const cottageFootprints: { inverse: THREE.Matrix4; halfWidth: number; halfDepth: number }[] = [];
  model.traverse(object => {
    if (!object.name.startsWith('CottageFootprint_')) return;
    const width = Number(object.userData.roofWidth ?? object.userData.wallWidth), depth = Number(object.userData.roofDepth ?? object.userData.wallDepth);
    if (!(width > 0 && depth > 0)) return;
    cottageFootprints.push({ inverse: object.matrixWorld.clone().invert(), halfWidth: width / 2 + .12, halfDepth: depth / 2 + .12 });
  });
  const groundProbe = new THREE.Vector3();
  function clearGround(x: number, z: number) {
    if ((x / 5.2) ** 2 + (z / 3.68) ** 2 > 1) return false;
    if (cottageFootprints.length) {
      for (const footprint of cottageFootprints) {
        groundProbe.set(x, .04, z).applyMatrix4(footprint.inverse);
        if (Math.abs(groundProbe.x) < footprint.halfWidth && Math.abs(groundProbe.z) < footprint.halfDepth) return false;
      }
    } else {
      // Older exports and tiny CPU test fixtures do not carry footprint extras.
      if (Math.abs(x - .65) < 1.25 && Math.abs(z + 1.18) < 1.2) return false;
      if (Math.abs(x + 2.4) < 1 && Math.abs(z + .65) < 1) return false;
      if (Math.abs(x - 2.9) < .95 && Math.abs(z + .85) < 1) return false;
      if (Math.abs(x + 3.45) < .85 && Math.abs(z + 2.18) < .85) return false;
    }
    if (Math.abs(x + 3.14) < .9 && Math.abs(z - 1.8) < .8) return false;
    return Math.hypot(x - .9, z - 1.23) > .7;
  }
  function openLawnPoint() {
    // Re-sample instead of falling back to a fixed point that a moved house could cover.
    for (let attempt = 0; attempt < 300; attempt++) {
      const x = between(-4.8, 4.8), z = between(-3.4, 3.4);
      if (clearGround(x, z)) return { x, z };
    }
    return { x: 0, z: 3.2 };
  }
  const ground = Array.from({ length: groundCount }, (_, i) => {
    const tree = trees[i % trees.length]; let x = 0, z = 2;
    for (let attempt = 0; attempt < 30; attempt++) { const a = random() * TAU, radius = between(.3, 1.35); x = tree.x + Math.cos(a) * radius; z = tree.z + Math.sin(a) * radius; if (clearGround(x, z)) break; }
    if (!clearGround(x, z)) ({ x, z } = openLawnPoint());
    groundLeaves.setColorAt(i, autumnPalette[i % autumnPalette.length]);
    return { x, z, turn: random() * TAU, scale: between(.65, 1.2), present: true };
  });
  const flightCount = 72, flyingLeaves = pool('SeasonalTreeFlurry', leafGeometry, leafMaterial, flightCount);
  type Flight = { active: boolean; start: number; duration: number; kind: 'gust' | 'fall' | 'rustle'; from: THREE.Vector3; to: THREE.Vector3; spin: number; ground: number };
  const flights: Flight[] = Array.from({ length: flightCount }, () => ({ active: false, start: 0, duration: 1, kind: 'rustle', from: new THREE.Vector3(), to: new THREE.Vector3(), spin: 0, ground: -1 }));
  for (let i = 0; i < flightCount; i++) instance(flyingLeaves, i, 0, 0, 0, 0);
  const springPetal = new THREE.Color(0xe8bcb0), summerLeaf = new THREE.Color(0x91b568), snowFlurry = new THREE.Color(0xe9f5ed);
  let flightIndex = 0;
  function launchFlight(kind: Flight['kind'], from: THREE.Vector3, to: THREE.Vector3, duration: number, groundIndex = -1) {
    let index = flights.findIndex(flight => !flight.active);
    if (index < 0) index = flightIndex++ % flightCount;
    const flight = flights[index]; if (flight.active && flight.ground >= 0) ground[flight.ground].present = true;
    Object.assign(flight, { active: true, start: time, duration, kind, ground: groundIndex, spin: between(-3, 3) }); flight.from.copy(from); flight.to.copy(to);
    const color = currentSeason === 'winter' ? snowFlurry : currentSeason === 'spring' ? springPetal : currentSeason === 'summer' ? summerLeaf : autumnPalette[index % autumnPalette.length];
    flyingLeaves.setColorAt(index, color); flyingLeaves.instanceColor!.needsUpdate = true;
  }
  function fallingLeaf(index: number) {
    const leaf = ground[index]; let tree = trees[0], closest = Infinity;
    for (const candidate of trees) { const d = Math.hypot(candidate.x - leaf.x, candidate.z - leaf.z); if (d < closest) { tree = candidate; closest = d; } }
    launchFlight('fall', tree.clone().add(new THREE.Vector3(between(-.35, .35), between(-.1, .4), between(-.35, .35))), new THREE.Vector3(leaf.x, .052, leaf.z), between(3.8, 6), index);
  }

  // Tiny five-petal flowers grow together in lawn patches, each at a different pace.
  const flowerPieces: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = i * TAU / 5, petal = new THREE.SphereGeometry(.035, 5, 3); petal.scale(.8, .32, 1.2); petal.rotateY(a); petal.translate(Math.sin(a) * .03, .14, Math.cos(a) * .03); flowerPieces.push(petal);
  }
  const flowerGeometry = mergeGeometries(flowerPieces); flowerPieces.forEach(piece => piece.dispose());
  const flowerMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9, side: THREE.DoubleSide });
  const flowers = pool('SpringFlowerBlooms', flowerGeometry, flowerMaterial, 96);
  const stemGeometry = new THREE.CylinderGeometry(.008, .009, .14, 4); stemGeometry.translate(0, .07, 0);
  const stems = pool('SpringFlowerStems', stemGeometry, new THREE.MeshStandardMaterial({ color: 0x5f864d, roughness: 1 }), 96);
  const centerGeometry = new THREE.SphereGeometry(.017, 5, 3); centerGeometry.scale(1, .38, 1); centerGeometry.translate(0, .145, 0);
  const centers = pool('SpringFlowerCenters', centerGeometry, new THREE.MeshStandardMaterial({ color: 0xdac260, roughness: .9 }), 96);
  const flowerPatches = [[-1.5, 1.85], [.1, 2.8], [2.4, 1.7], [3.5, -.4], [-3.9, .35], [1.7, -2.65]];
  const flowerColors = [0xe4c2b9, 0xf0e6c9, 0xbabbd4, 0xe4cf86].map(color => new THREE.Color(color));
  const flowerSeeds = Array.from({ length: 96 }, (_, i) => {
    const patch = flowerPatches[i % flowerPatches.length], a = random() * TAU, radius = Math.sqrt(random()) * .46;
    let x = patch[0] + Math.cos(a) * radius, z = patch[1] + Math.sin(a) * radius;
    if (!clearGround(x, z)) ({ x, z } = openLawnPoint());
    flowers.setColorAt(i, flowerColors[i % flowerColors.length]);
    return { x, z, size: between(.55, 1.05), delay: random() * 2, turn: random() * TAU };
  });

  const gullMaterial = new THREE.MeshStandardMaterial({ color: 0xf4eee0, roughness: .9, side: THREE.DoubleSide });
  const gullBeakMaterial = new THREE.MeshStandardMaterial({ color: 0xc98e4b, roughness: .9 });
  const gullWingShape = new THREE.Shape(); gullWingShape.moveTo(0, 0); gullWingShape.lineTo(.3, .02); gullWingShape.lineTo(.59, -.18); gullWingShape.lineTo(.23, -.11); gullWingShape.lineTo(0, -.11); gullWingShape.closePath();
  const gullWingGeometry = new THREE.ShapeGeometry(gullWingShape); gullWingGeometry.rotateX(-Math.PI / 2);
  const gulls = Array.from({ length: 2 }, (_, i) => {
    const group = new THREE.Group(); group.name = `SummerSeagull_${i}`; root.add(group); group.visible = false;
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 5), gullMaterial); body.scale.set(.07, .067, .21); group.add(body);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.025, .11, 5), gullBeakMaterial); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0, .24); group.add(beak);
    const left = new THREE.Group(), right = new THREE.Group(); group.add(left, right);
    left.add(new THREE.Mesh(gullWingGeometry, gullMaterial)); const rightWing = new THREE.Mesh(gullWingGeometry, gullMaterial); rightWing.scale.x = -1; right.add(rightWing);
    return { group, left, right, active: false, start: 0, duration: 14, from: new THREE.Vector3(), to: new THREE.Vector3(), phase: i * 1.2 };
  });
  let time = 0, seasonStart = 0, currentSeason: Season | '' = '', nextGust = between(20, 45), nextGull = between(12, 22), staticSpring = false;
  let pendingRustle: THREE.Vector3 | true | null = null;
  const flightPosition = new THREE.Vector3();
  function rustleTrees(center?: THREE.Vector3) { pendingRustle = center?.clone() ?? true; }
  function update(delta: number, motion: boolean, season: Season, night: boolean | number) {
    if (motion) time += Math.min(Math.max(delta, 0), .1);
    if (season !== currentSeason) {
      currentSeason = season; seasonStart = time; staticSpring = !motion; nextGust = time + between(20, 45); nextGull = time + between(12, 22);
      ground.forEach(leaf => { leaf.present = true; }); flights.forEach(flight => { flight.active = false; }); gulls.forEach(gull => { gull.active = false; gull.group.visible = false; });
    }
    globe.visible = season === 'winter'; groundLeaves.visible = season === 'autumn';
    flowers.visible = stems.visible = centers.visible = season === 'spring';
    const nightMix = typeof night === 'number' ? night : night ? 1 : 0;
    foamMaterial.opacity = .42 - nightMix * .12; waveMaterial.opacity = .34 - nightMix * .1; glassMaterial.uniforms.strength.value = .1 + nightMix * .045;
    // The narrow surf bands follow every bend instead of forming an artificial circle.
    shoreSamples.forEach(({ p, outward, phase, length, present, rotation }, i) => {
      const cycle = (time * .15 + phase) % 1, pulse = .55 + Math.sin(cycle * Math.PI) * .45;
      instance(shoreFoam, i, p.x + outward.x * cycle * .11, p.y + .008, p.z + outward.z * cycle * .11, present ? length * pulse : 0, 1, .04 + .036 * pulse, 0, rotation);
      const waveCycle = (time * .10 + phase) % 1, distance = .38 + (1 - waveCycle) * .5;
      instance(wavelets, i, p.x + outward.x * distance, p.y, p.z + outward.z * distance, length * (.7 + .4 * Math.sin(waveCycle * Math.PI)), 1, .014 + .013 * Math.sin(waveCycle * Math.PI), 0, rotation);
    });
    shoreFoam.instanceMatrix.needsUpdate = wavelets.instanceMatrix.needsUpdate = true;
    posts.forEach(({ x, z, phase }, i) => { const scale = 1 + ((time * .28 + phase) % 1) * .7; instance(postFoam, i, x, WATER_Y + .012, z, scale, 1, scale); }); postFoam.instanceMatrix.needsUpdate = true;
    splashPhases.forEach(({ phase, shore, speed }, i) => {
      const age = (time * speed + phase) % 1, sample = shoreSamples[shore], active = age < .15;
      const arc = active ? Math.sin(age / .15 * Math.PI) : 0;
      instance(splashes, i, sample.p.x + sample.outward.x * age * .7, WATER_Y + arc * .18, sample.p.z + sample.outward.z * age * .7, active ? .018 * (1 - age / .15) : 0);
    }); splashes.instanceMatrix.needsUpdate = true;
    if (ship) {
      ship.updateWorldMatrix(true, false); shipMatrix.copy(ship.matrixWorld);
      hull.forEach((point, i) => {
        shipPoint.copy(point).applyMatrix4(shipMatrix);
        const next = hull[i % 11 === 10 ? i - 1 : i + 1]; shipTangent.copy(next).applyMatrix4(shipMatrix).sub(shipPoint);
        const heading = Math.atan2(shipTangent.x, shipTangent.z) + Math.PI / 2;
        instance(shipFoam, i, shipPoint.x, WATER_Y + .016, shipPoint.z, .18 + Math.sin(time * 1.8 + i) * .025, 1, .027, 0, heading);
      }); shipFoam.instanceMatrix.needsUpdate = true;
    } else shipFoam.visible = false;
    if (season === 'winter') {
      snowSeeds.forEach((flake, i) => {
        const height = flake.top + .8, y = -.8 + ((flake.phase - time * flake.speed / height) % 1 + 1) % 1 * height;
        snowPositions[i * 3] = flake.x + Math.sin(time * .38 + i) * .1; snowPositions[i * 3 + 1] = y; snowPositions[i * 3 + 2] = flake.z + Math.cos(time * .31 + i) * .1;
      }); snowGeometry.attributes.position.needsUpdate = true;
    }
    if (pendingRustle) {
      if (motion) {
        let tree = trees[Math.floor(random() * trees.length)];
        if (pendingRustle !== true) tree = trees.reduce((nearest, candidate) => candidate.distanceToSquared(pendingRustle as THREE.Vector3) < nearest.distanceToSquared(pendingRustle as THREE.Vector3) ? candidate : nearest, trees[0]);
        for (let i = 0; i < 24; i++) {
          const from = tree.clone().add(new THREE.Vector3(between(-.5, .5), between(-.2, .35), between(-.5, .5)));
          launchFlight('rustle', from, new THREE.Vector3(from.x + between(-.9, .9), .04, from.z + between(-.9, .9)), between(3, 5));
        }
      }
      pendingRustle = null;
    }
    if (season === 'autumn' && motion && time >= nextGust) {
      nextGust = time + between(20, 45);
      const direction = random() < .5 ? -1 : 1;
      for (let i = 0; i < 30; i++) {
        const index = Math.floor(random() * groundCount), leaf = ground[index]; if (!leaf.present) continue;
        leaf.present = false;
        launchFlight('gust', new THREE.Vector3(leaf.x, .06, leaf.z), new THREE.Vector3(direction * between(9.2, 11.5), between(.25, 1.2), leaf.z + between(.5, 2)), between(4, 6), index);
      }
    }
    flights.forEach((flight, i) => {
      if (!flight.active) { instance(flyingLeaves, i, 0, 0, 0, 0); return; }
      let age = (time - flight.start) / flight.duration;
      if (age >= 1) {
        const index = flight.ground;
        if (flight.kind === 'gust' && season === 'autumn' && index >= 0) { flight.active = false; fallingLeaf(index); }
        else { if (index >= 0) ground[index].present = true; flight.active = false; }
        instance(flyingLeaves, i, 0, 0, 0, 0); return;
      }
      age = Math.max(age, 0); flightPosition.copy(flight.from).lerp(flight.to, age);
      flightPosition.x += Math.sin(age * 10 + i) * .12 * Math.sin(age * Math.PI);
      flightPosition.z += Math.cos(age * 8 + i) * .12 * Math.sin(age * Math.PI);
      if (flight.kind === 'gust') flightPosition.y += Math.sin(age * Math.PI) * 1.15;
      const scale = (season === 'winter' ? .38 : .8) * Math.min(1, (1 - age) * 6);
      instance(flyingLeaves, i, flightPosition.x, flightPosition.y, flightPosition.z, scale, scale, scale, age * flight.spin * 4, age * flight.spin * 5, age * 8);
    }); flyingLeaves.instanceMatrix.needsUpdate = true;
    ground.forEach((leaf, i) => { instance(groundLeaves, i, leaf.x, .052, leaf.z, leaf.present ? leaf.scale : 0, leaf.scale, leaf.scale, -Math.PI / 2, 0, leaf.turn); }); groundLeaves.instanceMatrix.needsUpdate = true;
    if (season === 'spring') {
      flowerSeeds.forEach((flower, i) => {
        const progress = staticSpring ? 1 : THREE.MathUtils.smoothstep((time - seasonStart - flower.delay) / 3, 0, 1), scale = flower.size * progress;
        instance(stems, i, flower.x, .035, flower.z, scale, scale, scale, 0, flower.turn);
        const bloom = THREE.MathUtils.smoothstep(progress, .3, 1);
        instance(flowers, i, flower.x, .035, flower.z, scale * bloom, scale, scale * bloom, 0, flower.turn);
        instance(centers, i, flower.x, .035, flower.z, scale * bloom, scale, scale * bloom, 0, flower.turn);
      }); flowers.instanceMatrix.needsUpdate = stems.instanceMatrix.needsUpdate = centers.instanceMatrix.needsUpdate = true;
    }
    if (season === 'summer') {
      if (motion && time >= nextGull) {
        nextGull = time + between(25, 48);
        const count = random() < .55 ? 1 : 2, direction = random() < .5 ? -1 : 1, z = random() < .5 ? between(5.8, 7.3) : between(-7, -5.6);
        gulls.forEach((gull, i) => {
          if (i >= count) return; gull.active = true; gull.start = time + i * .8; gull.duration = between(12, 17);
          gull.from.set(direction * -12, between(3, 4.3), z + i * .4); gull.to.set(direction * 12, between(3.5, 5), z - i * .3);
        });
      }
      gulls.forEach(gull => {
        const age = (time - gull.start) / gull.duration;
        gull.group.visible = gull.active && age >= 0 && age <= 1;
        if (!gull.group.visible) return;
        gull.group.position.copy(gull.from).lerp(gull.to, age); gull.group.position.y += Math.sin(age * Math.PI) * .45;
        gull.group.rotation.y = Math.atan2(gull.to.x - gull.from.x, gull.to.z - gull.from.z);
        const flap = Math.sin(time * 6 + gull.phase) * .35; gull.left.rotation.z = flap; gull.right.rotation.z = -flap;
      });
    }
  }
  return { update, rustleTrees };
}
