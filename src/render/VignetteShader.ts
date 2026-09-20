export function createVignetteShader(): {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
} {
  return {
    uniforms: {
      tDiffuse: { value: null },
      offset: { value: 1.04 },
      darkness: { value: 1.18 },
    },
    vertexShader: [
      'varying vec2 vUv;',
      'void main() {',
      '  vUv = uv;',
      '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
      '}',
    ].join('\n'),
    fragmentShader: [
      'uniform sampler2D tDiffuse;',
      'uniform float offset;',
      'uniform float darkness;',
      'varying vec2 vUv;',
      'void main() {',
      '  vec4 texel = texture2D(tDiffuse, vUv);',
      '  vec2 centered = vUv - 0.5;',
      '  float vignette = smoothstep(0.82, 0.22, length(centered) * 1.42);',
      '  float amount = mix(1.0, vignette, darkness * 0.62);',
      '  gl_FragColor = vec4(texel.rgb * amount, texel.a);',
      '}',
    ].join('\n'),
  };
}
