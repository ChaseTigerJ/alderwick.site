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

export type AtmosphereSettings = { effectsEnabled: boolean; snowAmount: number; shakeEnabled: boolean };

/** All effects advance only from the caller's visible, unpaused scene delta. */
export function createIslandAtmosphere(scene: THREE.Scene, model: THREE.Object3D, options: { random?: () => number } & Partial<AtmosphereSettings> = {}) {
  const settings: AtmosphereSettings = { effectsEnabled: options.effectsEnabled ?? true, snowAmount: THREE.MathUtils.clamp(options.snowAmount ?? 1, .5, 2), shakeEnabled: options.shakeEnabled ?? true };
  let lastMotion = false;
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
  // One bounded point draw call, with actual velocity, fluid drag and settling.
  // The pool is allocated once; snowAmount changes only its active draw range.
  const snowDefault = 4500, snowCapacity = 9000, snowRadius = 7.78;
  const snowPositions = new Float32Array(snowCapacity * 3), snowVelocities = new Float32Array(snowCapacity * 3);
  const snowSizes = new Float32Array(snowCapacity), snowMass = new Float32Array(snowCapacity), snowRest = new Float32Array(snowCapacity);
  let snowReady = false, snowEnergy = 0;
  const snowFlow = new THREE.Vector3(), pendingImpulse = new THREE.Vector3(); let pendingAgitation = 0;
  for (let i = 0; i < snowCapacity; i++) { snowSizes[i] = between(.055, .135); snowMass[i] = between(.7, 1.3); }
  const snowGeometry = new THREE.BufferGeometry(); snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3).setUsage(THREE.DynamicDrawUsage));
  snowGeometry.setAttribute('flakeSize', new THREE.BufferAttribute(snowSizes, 1)); snowGeometry.setDrawRange(0, Math.round(snowDefault * settings.snowAmount));
  const snowMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { tint: { value: new THREE.Color(0xf2fbfc) } },
    vertexShader: 'attribute float flakeSize; varying float alpha; void main(){vec4 p=modelViewMatrix*vec4(position,1.0); gl_Position=projectionMatrix*p; gl_PointSize=clamp(flakeSize*320.0/max(1.0,-p.z),1.15,5.5); alpha=.56+flakeSize*2.0;}',
    fragmentShader: 'uniform vec3 tint; varying float alpha; void main(){float radius=length(gl_PointCoord-.5); if(radius>.5)discard; float soft=1.0-smoothstep(.16,.5,radius); gl_FragColor=vec4(tint,soft*alpha);}',
  });
  const snow = new THREE.Points(snowGeometry, snowMaterial); snow.name = 'SnowInsideGlobe'; snow.frustumCulled = false; globe.add(snow);
  function snowFloor(x: number, z: number) {
    // Use the actual meadow polygon and authored roof footprints, not a bounding circle.
    let inside = false;
    for (let i = 0, j = perimeter.length - 1; i < perimeter.length; j = i++) {
      const a = perimeter[i], b = perimeter[j];
      if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
    }
    let floor = inside ? .045 : -.84;
    if (inside) for (const footprint of cottageFootprints) {
      const e = footprint.inverse.elements, localX = e[0] * x + e[8] * z + e[12], localZ = e[2] * x + e[10] * z + e[14];
      if (Math.abs(localX) < footprint.halfWidth - .12 && Math.abs(localZ) < footprint.halfDepth - .12) {
        const roof = footprint.roofTop - Math.abs(localX) / (footprint.halfWidth - .12) * (footprint.roofTop - footprint.eave);
        floor = Math.max(floor, footprint.baseY + roof + .035);
      }
    }
    return floor;
  }
  function seedSnow(index: number, atTop: boolean) {
    const n = index * 3;
    let x = 0, y = 5, z = 0;
    if (atTop) {
      // Re-enter across a broad upper layer, not the glass rim where columns converge.
      const a = random() * TAU, radius = Math.sqrt(random()) * 6.65;
      x = Math.cos(a) * radius; z = Math.sin(a) * radius;
      const floor = snowFloor(x, z), ceiling = Math.sqrt(snowRadius ** 2 - radius ** 2) - .94;
      y = Math.max(floor + .06, ceiling - between(.12, 1.05));
    } else {
      // Uniform volume sampling avoids overpopulating the shallow outer edge of the dome.
      for (let attempt = 0; attempt < 40; attempt++) {
        const a = random() * TAU, vertical = random(), radius = Math.cbrt(random()) * (snowRadius - .1), horizontal = radius * Math.sqrt(1 - vertical * vertical);
        x = Math.cos(a) * horizontal; z = Math.sin(a) * horizontal; y = vertical * radius - .94;
        if (y > snowFloor(x, z) + .025) break;
        if (attempt === 39) { x = 0; z = 0; y = 5; }
      }
    }
    snowPositions[n] = x; snowPositions[n + 1] = y; snowPositions[n + 2] = z;
    snowVelocities[n] = 0; snowVelocities[n + 1] = -.17 * snowMass[index]; snowVelocities[n + 2] = 0; snowRest[index] = 0;
  }
  function shake(dx: number, dy: number, strength = 1) {
    if (!settings.effectsEnabled || !settings.shakeEnabled || !lastMotion || currentSeason !== 'winter' || !Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(strength)) return;
    const x = THREE.MathUtils.clamp(dx * strength, -.5, .5), y = THREE.MathUtils.clamp(dy * strength, -.5, .5), force = Math.hypot(x, y);
    pendingImpulse.x += x * 12; pendingImpulse.z += y * 8; pendingImpulse.y -= y * 6;
    pendingImpulse.clampLength(0, 4.5);
    // Rapid back-and-forth movements still stir the water even if their vectors cancel.
    pendingAgitation = Math.min(3.5, pendingAgitation + force * 5);
  }
  function updateSnow(step: number, moving: boolean) {
    if (!snowReady) { for (let i = 0; i < snowCapacity; i++) seedSnow(i, false); snowReady = true; }
    if (moving) {
      const agitation = pendingAgitation, impulseX = pendingImpulse.x, impulseY = pendingImpulse.y, impulseZ = pendingImpulse.z;
      snowFlow.addScaledVector(pendingImpulse, .045).clampLength(0, .4);
      snowEnergy = Math.min(1.35, snowEnergy + agitation * .55); pendingImpulse.set(0, 0, 0); pendingAgitation = 0;
      const active = snowGeometry.drawRange.count;
      for (let i = 0; i < active; i++) {
        const n = i * 3, mass = snowMass[i]; let x = snowPositions[n], y = snowPositions[n + 1], z = snowPositions[n + 2];
        let vx = snowVelocities[n], vy = snowVelocities[n + 1], vz = snowVelocities[n + 2];
        const phase = time * .57, variation = i * 2.39996323;
        // An incompressible 3D eddy field: each component varies along the other axes.
        // Independent rising/descending currents replace one shared upward vortex.
        const curlX = Math.sin(z * .73 + phase + variation) + .68 * Math.sin((y - 2.5) * .86 - phase * .8 + variation * .71);
        const curlY = Math.sin(x * .67 - phase * .7 + variation * .83) + .68 * Math.sin(z * .81 + phase * .6 + variation * .67);
        const curlZ = Math.sin((y - 2.5) * .77 + phase * .9 + variation * .91) + .68 * Math.sin(x * .79 - phase + variation * .79);
        if (agitation > 0) {
          const loose = .64 + .36 * Math.sin(variation) ** 2;
          vx += impulseX * .004 * loose;
          vy += impulseY * .003 * loose;
          vz += impulseZ * .004 * loose;
          if (snowRest[i] > 0) {
            // Lift settled flakes at varied speeds, so they do not rise as a single sheet.
            vy = Math.max(vy, agitation * (.55 + .38 * Math.cos(variation * 1.7) ** 2)); snowRest[i] = 0;
          }
        }
        const stirring = snowEnergy * 1.65;
        let fluidX = snowFlow.x + curlX * stirring + Math.sin(time * .65 + variation) * .06;
        let fluidY = snowFlow.y + curlY * stirring + snowEnergy * .16 - .20 * mass;
        let fluidZ = snowFlow.z + curlZ * stirring + Math.cos(time * .57 + variation) * .06;
        const floorBefore = snowFloor(x, z), bottom = 1 - THREE.MathUtils.smoothstep(y - floorBefore, 0, .85);
        fluidY += (Math.max(0, -fluidY) + snowEnergy * .7) * bottom * THREE.MathUtils.smoothstep(snowEnergy, .035, .3);
        const relativeY = y + .94, radius = Math.sqrt(x * x + relativeY * relativeY + z * z);
        if (radius > 6.45) {
          const nx = x / radius, ny = relativeY / radius, nz = z / radius;
          const edge = THREE.MathUtils.smoothstep(radius, 6.45, snowRadius), outward = fluidX * nx + fluidY * ny + fluidZ * nz;
          // Water turns along the glass before contact, rather than pressing flakes into it.
          const deflect = Math.max(0, outward) * edge + snowEnergy * 1.55 * edge;
          fluidX -= nx * deflect; fluidY -= ny * deflect; fluidZ -= nz * deflect;
        }
        const drag = Math.exp(-step * (2.15 / mass));
        vx = vx * drag + fluidX * (1 - drag); vy = vy * drag + fluidY * (1 - drag); vz = vz * drag + fluidZ * (1 - drag);
        const speed = Math.hypot(vx, vy, vz);
        if (speed > 5.5) { const scale = 5.5 / speed; vx *= scale; vy *= scale; vz *= scale; }
        x += vx * step; y += vy * step; z += vz * step;
        const nextRadius = Math.sqrt(x * x + (y + .94) ** 2 + z * z);
        if (nextRadius > snowRadius) {
          const nx = x / nextRadius, ny = (y + .94) / nextRadius, nz = z / nextRadius, outward = vx * nx + vy * ny + vz * nz;
          const inset = snowRadius - .025 - .035 * (mass - .7);
          x = nx * inset; y = ny * inset - .94; z = nz * inset;
          if (outward > 0) { vx -= nx * outward * 1.55; vy -= ny * outward * 1.55; vz -= nz * outward * 1.55; }
        }
        const floor = snowFloor(x, z);
        if (y <= floor) {
          y = floor; vy = Math.max(0, vy); vx *= .86; vz *= .86; snowRest[i] += step;
          // Active eddies pick snow back up throughout the bowl, without a shared updraft.
          if (snowEnergy > .15 && fluidY > .08) { vy = Math.max(vy, fluidY * .55); snowRest[i] = 0; }
          else if (snowRest[i] > 8 + (i % 43) * .31) { seedSnow(i, true); continue; }
        } else snowRest[i] = 0;
        snowPositions[n] = x; snowPositions[n + 1] = y; snowPositions[n + 2] = z;
        snowVelocities[n] = vx; snowVelocities[n + 1] = vy; snowVelocities[n + 2] = vz;
      }
      snowFlow.multiplyScalar(Math.exp(-step * 1.6)); snowEnergy *= Math.exp(-step * .48);
    } else { pendingImpulse.set(0, 0, 0); pendingAgitation = 0; }
    snowGeometry.attributes.position.needsUpdate = true;
  }

  const leafGeometry = new THREE.BufferGeometry();
  leafGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, .075, 0, -.035, 0, 0, 0, -.055, 0, .035, 0, 0, 0, 0, .012], 3));
  leafGeometry.setIndex([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]); leafGeometry.computeVertexNormals();
  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85, side: THREE.DoubleSide });
  const groundCount = 128, groundLeaves = pool('AutumnGroundLeaves', leafGeometry, leafMaterial, groundCount);
  const autumnPalette = [new THREE.Color(0xc97639), new THREE.Color(0xcfa34e), new THREE.Color(0x966345), new THREE.Color(0xa85432)];
  const cottageFootprints: { inverse: THREE.Matrix4; halfWidth: number; halfDepth: number; roofTop: number; eave: number; baseY: number }[] = [];
  model.traverse(object => {
    if (!object.name.startsWith('CottageFootprint_')) return;
    const width = Number(object.userData.roofWidth ?? object.userData.wallWidth), depth = Number(object.userData.roofDepth ?? object.userData.wallDepth);
    if (!(width > 0 && depth > 0)) return;
    cottageFootprints.push({ inverse: object.matrixWorld.clone().invert(), halfWidth: width / 2 + .12, halfDepth: depth / 2 + .12, roofTop: Number(object.userData.roofTop) || 2.7, eave: Number(object.userData.wallHeight) || 1.5, baseY: object.getWorldPosition(new THREE.Vector3()).y });
  });
  // Sand also exists in the cliffs. Accept only near-horizontal triangles at path elevation.
  const pathTriangles: { ax: number; az: number; bx: number; bz: number; cx: number; cz: number; minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  model.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material], position = object.geometry.getAttribute('position'), index = object.geometry.index;
    if (!materials.some(material => material.name === 'sand') || !position) return;
    const groups = object.geometry.groups.length ? object.geometry.groups : [{ start: 0, count: index?.count ?? position.count, materialIndex: 0 }];
    for (const group of groups) {
      if (materials[group.materialIndex ?? 0]?.name !== 'sand') continue;
      for (let i = group.start; i + 2 < group.start + group.count; i += 3) {
        const points = [i, i + 1, i + 2].map(n => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(n) : n).applyMatrix4(object.matrixWorld));
        if (points.some(p => p.y < -.005 || p.y > .16) || Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)) > .025) continue;
        const [a, b, c] = points;
        if (Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) < .00001) continue;
        pathTriangles.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, cx: c.x, cz: c.z, minX: Math.min(a.x, b.x, c.x) - .12, maxX: Math.max(a.x, b.x, c.x) + .12, minZ: Math.min(a.z, b.z, c.z) - .12, maxZ: Math.max(a.z, b.z, c.z) + .12 });
      }
    }
  });
  function pathClear(x: number, z: number) {
    const edgeDistance = (ax: number, az: number, bx: number, bz: number) => {
      const dx = bx - ax, dz = bz - az, t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
      return (x - ax - t * dx) ** 2 + (z - az - t * dz) ** 2;
    };
    for (const t of pathTriangles) {
      if (x < t.minX || x > t.maxX || z < t.minZ || z > t.maxZ) continue;
      const a = (x - t.ax) * (t.bz - t.az) - (z - t.az) * (t.bx - t.ax), b = (x - t.bx) * (t.cz - t.bz) - (z - t.bz) * (t.cx - t.bx), c = (x - t.cx) * (t.az - t.cz) - (z - t.cz) * (t.ax - t.cx);
      if (!((a < 0 || b < 0 || c < 0) && (a > 0 || b > 0 || c > 0))) return false;
      if (Math.min(edgeDistance(t.ax, t.az, t.bx, t.bz), edgeDistance(t.bx, t.bz, t.cx, t.cz), edgeDistance(t.cx, t.cz, t.ax, t.az)) < .12 ** 2) return false;
    }
    return true;
  }
  const gardenAnchor = (() => { let anchor: THREE.Object3D | undefined; model.traverse(object => { if (object.name === 'GardenPlot' || object.name.startsWith('GardenPlot_')) anchor = object; }); return anchor; })();
  const gardenOrigin = gardenAnchor?.getWorldPosition(new THREE.Vector3()) ?? new THREE.Vector3(-3.14, 0, 1.8);
  const gardenWidth = Number(gardenAnchor?.userData.width) || 1.22, gardenDepth = Number(gardenAnchor?.userData.depth) || .98;
  const gardenInverse = gardenAnchor?.matrixWorld.clone().invert() ?? new THREE.Matrix4().makeTranslation(-gardenOrigin.x, -gardenOrigin.y, -gardenOrigin.z);
  const groundProbe = new THREE.Vector3();
  const wellPosition = model.getObjectByName('WishingWell')?.getWorldPosition(new THREE.Vector3());
  function clearGround(x: number, z: number, avoidPaths = false) {
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
    groundProbe.set(x, .04, z).applyMatrix4(gardenInverse);
    if (Math.abs(groundProbe.x) < gardenWidth / 2 + .18 && Math.abs(groundProbe.z) < gardenDepth / 2 + .18) return false;
    return (!wellPosition || Math.hypot(x - wellPosition.x, z - wellPosition.z) > .76) && (!avoidPaths || pathClear(x, z));
  }
  function openLawnPoint(avoidPaths = false) {
    // Re-sample instead of falling back to a fixed point that a moved house could cover.
    for (let attempt = 0; attempt < 300; attempt++) {
      const x = between(-4.8, 4.8), z = between(-3.4, 3.4);
      if (clearGround(x, z, avoidPaths)) return { x, z, valid: true };
    }
    // Never force a flower onto a path when an export leaves no plantable lawn.
    return { x: 0, z: 0, valid: false };
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
    let valid = clearGround(x, z, true);
    if (!valid) ({ x, z, valid } = openLawnPoint(true));
    flowers.setColorAt(i, flowerColors[i % flowerColors.length]);
    return { x, z, valid, size: between(.55, 1.05), delay: random() * 2, turn: random() * TAU };
  });

  // The plot is one place with four seasonal uses. Its authored anchor owns position.
  const garden = new THREE.Group(); garden.name = 'GardenSeasonalProps'; garden.position.copy(gardenOrigin);
  if (gardenAnchor) gardenAnchor.getWorldQuaternion(garden.quaternion);
  garden.scale.set(gardenWidth / 1.22, 1, gardenDepth / .98); root.add(garden); garden.updateMatrixWorld(true);
  const gardenGroups = {
    spring: new THREE.Group(), summer: new THREE.Group(), autumn: new THREE.Group(), winter: new THREE.Group(),
  };
  for (const [season, group] of Object.entries(gardenGroups)) { group.name = `Garden${season[0].toUpperCase()}${season.slice(1)}`; garden.add(group); }
  function prop(group: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, name: string) {
    const mesh = new THREE.Mesh(geometry, material); mesh.name = name; mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  const gardenWood = new THREE.MeshStandardMaterial({ color: 0x8c6947, roughness: .94 });
  const gardenEarth = new THREE.MeshStandardMaterial({ color: 0x796043, roughness: 1 });
  const bedRails: THREE.BufferGeometry[] = [], bedSoil: THREE.BufferGeometry[] = [];
  for (const x of [-.285, .285]) {
    for (const side of [-1, 1]) {
      const long = new THREE.BoxGeometry(.035, .105, .79); long.translate(x + side * .21, .075, 0); bedRails.push(long);
      const end = new THREE.BoxGeometry(.45, .105, .035); end.translate(x, .075, side * .38); bedRails.push(end);
    }
    const soil = new THREE.BoxGeometry(.39, .035, .73); soil.translate(x, .065, 0); bedSoil.push(soil);
  }
  prop(gardenGroups.spring, mergeGeometries(bedRails), gardenWood, 0, 0, 0, 'RaisedFlowerbedTimbers'); bedRails.forEach(part => part.dispose());
  prop(gardenGroups.spring, mergeGeometries(bedSoil), gardenEarth, 0, 0, 0, 'RaisedFlowerbedSoil'); bedSoil.forEach(part => part.dispose());
  const bedFlowers = pool('GardenSpringBlooms', flowerGeometry, flowerMaterial, 36), bedStems = pool('GardenSpringStems', stemGeometry, stems.material, 36), bedCenters = pool('GardenSpringCenters', centerGeometry, centers.material, 36);
  gardenGroups.spring.add(bedFlowers, bedStems, bedCenters);
  const bedSeeds = Array.from({ length: 36 }, (_, i) => {
    const x = (i < 18 ? -.285 : .285) + (i % 3 - 1) * .115, z = -.29 + Math.floor(i % 18 / 3) * .115;
    const point = new THREE.Vector3(x, .075, z).applyMatrix4(garden.matrixWorld);
    bedFlowers.setColorAt(i, flowerColors[i % flowerColors.length]);
    return { x, z, valid: pathClear(point.x, point.z), size: between(.8, 1.2), turn: random() * TAU, delay: random() };
  });

  const fireStone = new THREE.MeshStandardMaterial({ color: 0x929383, roughness: 1 }), char = new THREE.MeshStandardMaterial({ color: 0x4f3b2c, roughness: .95 });
  const ringStones = pool('CampfireStoneRing', new THREE.IcosahedronGeometry(1, 1), fireStone, 12); gardenGroups.summer.add(ringStones);
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; instance(ringStones, i, Math.cos(a) * .28, .07, Math.sin(a) * .28, .076, .055, .061, 0, a); }
  const fireLogs = pool('CampfireLogs', new THREE.CylinderGeometry(.039, .045, .44, 7), char, 3); gardenGroups.summer.add(fireLogs);
  for (let i = 0; i < 3; i++) instance(fireLogs, i, 0, .087 + i * .024, 0, 1, 1, 1, Math.PI / 2, 0, i * Math.PI / 3);
  const coalMaterial = new THREE.MeshStandardMaterial({ color: 0xb04e23, emissive: 0xe85f20, emissiveIntensity: .55, roughness: 1 });
  prop(gardenGroups.summer, new THREE.CylinderGeometry(.205, .19, .03, 12), coalMaterial, 0, .068, 0, 'CampfireEmbers');
  const outerFire = new THREE.MeshBasicMaterial({ color: 0xe9913f, transparent: true, opacity: .77, depthWrite: false }), innerFire = new THREE.MeshBasicMaterial({ color: 0xffd478, transparent: true, opacity: .9, depthWrite: false });
  const fireFlames = Array.from({ length: 3 }, (_, i) => {
    const flame = prop(gardenGroups.summer, new THREE.ConeGeometry(i === 1 ? .065 : .085, i === 1 ? .27 : .34, 6, 2), i === 1 ? innerFire : outerFire, (i - 1) * .08, .24, (i % 2) * .045, `CampfireFlame_${i}`);
    flame.castShadow = false; return flame;
  });
  const fireLight = new THREE.PointLight(0xffaf64, 1.5, 2.4, 2); fireLight.position.set(0, .35, 0); fireLight.name = 'CampfireWarmLight'; gardenGroups.summer.add(fireLight);
  const emberPositions = new Float32Array(10 * 3), emberGeometry = new THREE.BufferGeometry(); emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3).setUsage(THREE.DynamicDrawUsage));
  const emberPoints = new THREE.Points(emberGeometry, new THREE.PointsMaterial({ color: 0xf7bd65, size: .018, transparent: true, opacity: .72, depthWrite: false })); emberPoints.name = 'CampfireDriftingEmbers'; gardenGroups.summer.add(emberPoints);

  const pumpkinGeometry = new THREE.SphereGeometry(.15, 20, 12), pumpkinPositions = pumpkinGeometry.attributes.position;
  for (let i = 0; i < pumpkinPositions.count; i++) { const x = pumpkinPositions.getX(i), y = pumpkinPositions.getY(i), z = pumpkinPositions.getZ(i), rib = 1 + .055 * Math.cos(Math.atan2(z, x) * 9); pumpkinPositions.setXYZ(i, x * rib, y * .8, z * rib); } pumpkinGeometry.computeVertexNormals();
  const pumpkinMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .86 });
  const pumpkins = pool('GardenAutumnPumpkins', pumpkinGeometry, pumpkinMaterial, 7), pumpkinStems = pool('PumpkinCurvedStems', new THREE.CylinderGeometry(.011, .02, .075, 5), gardenWood, 7);
  const pumpkinLeaves = pool('PumpkinVineLeaves', leafGeometry, new THREE.MeshStandardMaterial({ color: 0x61784a, roughness: .95, side: THREE.DoubleSide }), 10);
  gardenGroups.autumn.add(pumpkins, pumpkinStems, pumpkinLeaves);
  const pumpkinColors = [0xc97938, 0xd58b42, 0xb86e31].map(color => new THREE.Color(color));
  for (let i = 0; i < 7; i++) {
    const x = (i % 3 - 1) * .34 + (i > 5 ? .08 : 0), z = -.28 + Math.floor(i / 3) * .26, size = between(.76, 1.1);
    instance(pumpkins, i, x, .055 + .12 * size, z, size, size, size, 0, random() * TAU); pumpkins.setColorAt(i, pumpkinColors[i % 3]);
    instance(pumpkinStems, i, x + .006, .055 + .265 * size, z, size, size, size, .24, 0, -.18);
  }
  for (let i = 0; i < 10; i++) instance(pumpkinLeaves, i, between(-.48, .48), .055, between(-.35, .35), 1.2, 1.2, 1.2, -Math.PI / 2, 0, random() * TAU);

  const snowmanWhite = new THREE.MeshStandardMaterial({ color: 0xe9efe4, roughness: .95 }), snowmanCoal = new THREE.MeshStandardMaterial({ color: 0x39382f, roughness: .9 }), snowmanScarf = new THREE.MeshStandardMaterial({ color: 0xa85043, roughness: .9 });
  for (const [radius, y] of [[.24, .235], [.178, .535], [.125, .777]]) prop(gardenGroups.winter, new THREE.IcosahedronGeometry(radius, 2), snowmanWhite, 0, y + .04, 0, 'SnowmanSnowball');
  const scarf = prop(gardenGroups.winter, new THREE.TorusGeometry(.14, .03, 6, 16), snowmanScarf, 0, .696, 0, 'SnowmanScarf'); scarf.rotation.x = Math.PI / 2;
  prop(gardenGroups.winter, new THREE.BoxGeometry(.061, .19, .035), snowmanScarf, .095, .602, .152, 'SnowmanScarfTail');
  const carrot = prop(gardenGroups.winter, new THREE.ConeGeometry(.024, .14, 7), new THREE.MeshStandardMaterial({ color: 0xd88b3f, roughness: .9 }), 0, .812, .159, 'SnowmanCarrot'); carrot.rotation.x = Math.PI / 2;
  for (const x of [-.045, .045]) prop(gardenGroups.winter, new THREE.IcosahedronGeometry(.013, 1), snowmanCoal, x, .85, .104, 'SnowmanEye');
  for (const y of [.5, .58, .645]) prop(gardenGroups.winter, new THREE.IcosahedronGeometry(.017, 1), snowmanCoal, 0, y, .172, 'SnowmanButton');
  const hat = prop(gardenGroups.winter, new THREE.CylinderGeometry(.084, .097, .11, 12), snowmanScarf, 0, .937, 0, 'SnowmanWoolHat'); hat.rotation.z = -.08;
  prop(gardenGroups.winter, new THREE.IcosahedronGeometry(.029, 1), snowmanWhite, .004, 1.011, 0, 'SnowmanHatBobble');
  function twig(a: THREE.Vector3, b: THREE.Vector3) { const direction = b.clone().sub(a), mesh = prop(gardenGroups.winter, new THREE.CylinderGeometry(.012, .017, direction.length(), 5), char, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, 'SnowmanTwigArm'); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); }
  for (const side of [-1, 1]) { twig(new THREE.Vector3(side * .13, .57, 0), new THREE.Vector3(side * .43, .72, .025)); twig(new THREE.Vector3(side * .35, .68, .02), new THREE.Vector3(side * .39, .79, .035)); }

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
    motion = motion && settings.effectsEnabled; lastMotion = motion;
    const step = Math.min(Math.max(delta, 0), .1);
    if (motion) time += step;
    if (season !== currentSeason) {
      currentSeason = season; seasonStart = time; staticSpring = !motion; nextGust = time + between(20, 45); nextGull = time + between(12, 22);
      ground.forEach(leaf => { leaf.present = true; }); flights.forEach(flight => { flight.active = false; }); gulls.forEach(gull => { gull.active = false; gull.group.visible = false; });
    }
    globe.visible = season === 'winter' && settings.effectsEnabled; groundLeaves.visible = season === 'autumn' && settings.effectsEnabled;
    flyingLeaves.visible = shoreFoam.visible = wavelets.visible = postFoam.visible = splashes.visible = settings.effectsEnabled; shipFoam.visible = !!ship && settings.effectsEnabled;
    if (!settings.effectsEnabled) gulls.forEach(gull => { gull.group.visible = false; });
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
    if (season === 'winter') updateSnow(step, motion);
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
        const progress = staticSpring ? 1 : THREE.MathUtils.smoothstep((time - seasonStart - flower.delay) / 3, 0, 1), scale = flower.valid ? flower.size * progress : 0;
        instance(stems, i, flower.x, .035, flower.z, scale, scale, scale, 0, flower.turn);
        const bloom = THREE.MathUtils.smoothstep(progress, .3, 1);
        instance(flowers, i, flower.x, .035, flower.z, scale * bloom, scale, scale * bloom, 0, flower.turn);
        instance(centers, i, flower.x, .035, flower.z, scale * bloom, scale, scale * bloom, 0, flower.turn);
      }); flowers.instanceMatrix.needsUpdate = stems.instanceMatrix.needsUpdate = centers.instanceMatrix.needsUpdate = true;
    }
    for (const [gardenSeason, group] of Object.entries(gardenGroups)) group.visible = gardenSeason === season;
    if (season === 'spring') {
      bedSeeds.forEach((flower, i) => {
        const growth = staticSpring ? 1 : THREE.MathUtils.smoothstep((time - seasonStart - flower.delay) / 2.5, 0, 1), scale = flower.valid ? flower.size * growth : 0;
        instance(bedFlowers, i, flower.x, .083, flower.z, scale, scale, scale, 0, flower.turn); instance(bedStems, i, flower.x, .083, flower.z, scale, scale, scale, 0, flower.turn); instance(bedCenters, i, flower.x, .083, flower.z, scale, scale, scale, 0, flower.turn);
      }); bedFlowers.instanceMatrix.needsUpdate = bedStems.instanceMatrix.needsUpdate = bedCenters.instanceMatrix.needsUpdate = true;
    }
    if (season === 'summer') {
      fireFlames.forEach((flame, i) => { flame.scale.set(1 + Math.sin(time * 6 + i) * .10, .85 + Math.sin(time * 7.1 + i * 2) * .15, 1); flame.rotation.z = Math.sin(time * 5.2 + i) * .13; });
      coalMaterial.emissiveIntensity = .5 + Math.sin(time * 4.3) * .06; fireLight.intensity = (1.1 + nightMix * .7) * (1 + Math.sin(time * 7.3) * .055);
      emberPoints.visible = settings.effectsEnabled;
      for (let i = 0; i < 10; i++) { const age = (time * .35 + i / 10) % 1; emberPositions[i * 3] = Math.sin(i * 2.3 + age * 3) * .06 + age * .09; emberPositions[i * 3 + 1] = .14 + age * .66; emberPositions[i * 3 + 2] = Math.cos(i * 1.4 + age * 2) * .07; } emberGeometry.attributes.position.needsUpdate = true;
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
        gull.group.visible = settings.effectsEnabled && gull.active && age >= 0 && age <= 1;
        if (!gull.group.visible) return;
        gull.group.position.copy(gull.from).lerp(gull.to, age); gull.group.position.y += Math.sin(age * Math.PI) * .45;
        gull.group.rotation.y = Math.atan2(gull.to.x - gull.from.x, gull.to.z - gull.from.z);
        const flap = Math.sin(time * 6 + gull.phase) * .35; gull.left.rotation.z = flap; gull.right.rotation.z = -flap;
      });
    }
  }
  function configure(next: Partial<AtmosphereSettings>) {
    if (typeof next.effectsEnabled === 'boolean') settings.effectsEnabled = next.effectsEnabled;
    if (typeof next.shakeEnabled === 'boolean') settings.shakeEnabled = next.shakeEnabled;
    if (typeof next.snowAmount === 'number' && Number.isFinite(next.snowAmount)) settings.snowAmount = THREE.MathUtils.clamp(next.snowAmount, .5, 2);
    snowGeometry.setDrawRange(0, Math.round(snowDefault * settings.snowAmount));
    if (!settings.shakeEnabled || !settings.effectsEnabled) { pendingImpulse.set(0, 0, 0); pendingAgitation = 0; }
  }
  return { update, rustleTrees, shake, configure };
}
