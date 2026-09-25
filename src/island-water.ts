import * as THREE from 'three';

export type IslandWaterOptions = {
  height?: number;
  radius?: number;
  /** Water, foam and the glass dome must not appear in their own reflection. */
  excluded?: readonly THREE.Object3D[];
};

/** A bounded, transparent planar reflection of the actual animated harbor. */
export function createIslandWater(scene: THREE.Scene, options: IslandWaterOptions = {}) {
  const height = options.height ?? -.954, radius = options.radius ?? 8.33;
  const target = new THREE.WebGLRenderTarget(256, 256, {
    type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    generateMipmaps: false, samples: 0,
  });
  target.texture.name = 'HarborReflection';
  const textureMatrix = new THREE.Matrix4();
  const material = new THREE.ShaderMaterial({
    name: 'SubtleHarborWater', transparent: true, depthWrite: false,
    uniforms: {
      reflection: { value: target.texture }, textureMatrix: { value: textureMatrix },
      time: { value: 0 }, night: { value: 0 }, texel: { value: new THREE.Vector2(1 / 256, 1 / 256) },
      tint: { value: new THREE.Color(0xa1d2c9) }, radius: { value: radius },
    },
    vertexShader: /* glsl */`
      uniform mat4 textureMatrix;
      varying vec4 reflectionUv;
      varying vec2 waterPosition;
      varying float facing;
      void main() {
        reflectionUv = textureMatrix * vec4(position, 1.0);
        waterPosition = position.xz;
        vec4 world = modelMatrix * vec4(position, 1.0);
        facing = abs(dot(normalize(cameraPosition - world.xyz), vec3(0.0, 1.0, 0.0)));
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D reflection;
      uniform float time;
      uniform float night;
      uniform float radius;
      uniform vec2 texel;
      uniform vec3 tint;
      varying vec4 reflectionUv;
      varying vec2 waterPosition;
      varying float facing;
      void main() {
        vec2 uv = reflectionUv.xy / reflectionUv.w;
        vec2 ripple = vec2(
          sin(waterPosition.y * 5.4 + time * 1.15) + .4 * sin(waterPosition.x * 9.2 - time * .65),
          cos(waterPosition.x * 4.8 - time * .85) + .4 * sin(waterPosition.y * 8.1 + time * .9)
        ) * .0012;
        uv += ripple;
        if (reflectionUv.w <= 0.0 || any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) discard;
        // A small cross blur softens the reflection without another render pass.
        vec4 color = texture2D(reflection, uv) * .4;
        color += texture2D(reflection, uv + vec2(texel.x, 0.0)) * .15;
        color += texture2D(reflection, uv - vec2(texel.x, 0.0)) * .15;
        color += texture2D(reflection, uv + vec2(0.0, texel.y)) * .15;
        color += texture2D(reflection, uv - vec2(0.0, texel.y)) * .15;
        if (color.a < .002) discard;
        color.rgb /= max(color.a, .001);
        float edge = 1.0 - smoothstep(radius - .28, radius, length(waterPosition));
        float strength = mix(.20, .26, night) + .075 * pow(1.0 - facing, 3.0);
        gl_FragColor = vec4(color.rgb * tint, color.a * strength * edge);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const geometry = new THREE.CircleGeometry(radius, 96); geometry.rotateX(-Math.PI / 2);
  const surface = new THREE.Mesh(geometry, material); surface.name = 'HarborWaterReflection';
  surface.position.y = height; surface.renderOrder = 0; surface.visible = false; scene.add(surface);
  const reflectedCamera = new THREE.PerspectiveCamera();
  const waterPosition = new THREE.Vector3(), cameraPosition = new THREE.Vector3();
  const rotation = new THREE.Matrix4(), normal = new THREE.Vector3(0, 1, 0);
  const view = new THREE.Vector3(), look = new THREE.Vector3(), aim = new THREE.Vector3();
  const plane = new THREE.Plane(), clip = new THREE.Vector4(), corner = new THREE.Vector4();
  const viewport = new THREE.Vector4(), scissor = new THREE.Vector4(), clearColor = new THREE.Color();
  const dayTint = new THREE.Color(0xa1d2c9), nightTint = new THREE.Color(0x97b7c6);
  let disposed = false;

  function resize(width: number, height: number, pixelRatio = 1, coarse = false) {
    if (disposed || !(width > 0 && height > 0)) return;
    // Half-resolution, capped by the longest side; DPR cannot create a giant target.
    const maxSide = coarse ? 384 : 640;
    const scale = Math.min(.5 * Math.max(1, Math.min(pixelRatio, 2)), maxSide / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    if (target.width !== w || target.height !== h) target.setSize(w, h);
    material.uniforms.texel.value.set(1 / w, 1 / h);
  }

  function update(time: number, night: number, enabled: boolean) {
    surface.visible = enabled && !disposed;
    material.uniforms.time.value = time;
    material.uniforms.night.value = THREE.MathUtils.clamp(night, 0, 1);
    material.uniforms.tint.value.copy(dayTint).lerp(nightTint, material.uniforms.night.value);
  }

  function capture(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
    if (disposed || !surface.visible) return false;
    scene.updateMatrixWorld(true); camera.updateWorldMatrix(true, false);
    waterPosition.setFromMatrixPosition(surface.matrixWorld);
    cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    if (cameraPosition.y <= waterPosition.y) return false;

    // Reflection and oblique near-plane construction follow Three.js's MIT-licensed
    // Reflector. The projection is copied verbatim, including the hero's view offset.
    view.subVectors(waterPosition, cameraPosition).reflect(normal).negate().add(waterPosition);
    rotation.extractRotation(camera.matrixWorld);
    look.set(0, 0, -1).applyMatrix4(rotation).add(cameraPosition);
    aim.subVectors(waterPosition, look).reflect(normal).negate().add(waterPosition);
    reflectedCamera.position.copy(view);
    reflectedCamera.up.set(0, 1, 0).applyMatrix4(rotation).reflect(normal);
    reflectedCamera.lookAt(aim); reflectedCamera.near = camera.near; reflectedCamera.far = camera.far;
    reflectedCamera.layers.mask = camera.layers.mask;
    reflectedCamera.updateMatrixWorld(true);
    reflectedCamera.projectionMatrix.copy(camera.projectionMatrix);
    textureMatrix.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1)
      .multiply(reflectedCamera.projectionMatrix).multiply(reflectedCamera.matrixWorldInverse).multiply(surface.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(normal, waterPosition).applyMatrix4(reflectedCamera.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const projection = reflectedCamera.projectionMatrix.elements;
    corner.set((Math.sign(clip.x) + projection[8]) / projection[0], (Math.sign(clip.y) + projection[9]) / projection[5], -1, (1 + projection[10]) / projection[14]);
    clip.multiplyScalar(2 / clip.dot(corner));
    projection[2] = clip.x; projection[6] = clip.y; projection[10] = clip.z + 1 - .003; projection[14] = clip.w;
    reflectedCamera.projectionMatrixInverse.copy(reflectedCamera.projectionMatrix).invert();

    const hidden = [...new Set([surface, ...(options.excluded ?? [])])].map(object => ({ object, visible: object.visible }));
    const previousTarget = renderer.getRenderTarget(), previousFace = renderer.getActiveCubeFace(), previousMip = renderer.getActiveMipmapLevel();
    renderer.getViewport(viewport); renderer.getScissor(scissor); renderer.getClearColor(clearColor);
    const previousScissorTest = renderer.getScissorTest(), previousAlpha = renderer.getClearAlpha();
    const previousXr = renderer.xr.enabled, previousAutoClear = renderer.autoClear;
    const previousShadowAutoUpdate = renderer.shadowMap.autoUpdate, background = scene.background;
    hidden.forEach(({ object }) => { object.visible = false; }); scene.background = null;
    try {
      renderer.xr.enabled = false; renderer.autoClear = true;
      // The caller requests one fresh shadow map after animation updates. Let this
      // first render consume needsUpdate, then the main view reuses the same map.
      // Never restore the old needsUpdate=true flag or throttle the reflected pose.
      renderer.shadowMap.autoUpdate = false;
      renderer.setClearColor(0x000000, 0);
      // Render-target viewport dimensions are already physical pixels. Calling
      // setViewport here would multiply them by the canvas DPR a second time.
      renderer.setRenderTarget(target); renderer.setScissorTest(false);
      renderer.state.buffers.depth.setMask(true);
      renderer.render(scene, reflectedCamera);
      return true;
    } finally {
      hidden.forEach(({ object, visible }) => { object.visible = visible; }); scene.background = background;
      renderer.xr.enabled = previousXr; renderer.autoClear = previousAutoClear;
      renderer.shadowMap.autoUpdate = previousShadowAutoUpdate;
      renderer.setRenderTarget(previousTarget, previousFace, previousMip);
      renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(previousScissorTest);
      renderer.setClearColor(clearColor, previousAlpha);
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true; surface.visible = false; surface.removeFromParent();
    target.dispose(); geometry.dispose(); material.dispose();
  }
  return { surface, resize, update, capture, dispose };
}
