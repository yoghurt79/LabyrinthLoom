import { Vector2, type PerspectiveCamera, type Scene, type WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createVignetteShader } from './VignetteShader';

export class Effects {
  readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  private enabled = false;

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
  ) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloomPass = new UnrealBloomPass(
      new Vector2(window.innerWidth * 0.5, window.innerHeight * 0.5),
      0.68,
      0.36,
      0.82,
    );
    this.bloomPass.enabled = false;
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(new ShaderPass(createVignetteShader()));
    this.composer.addPass(new OutputPass());
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.bloomPass.enabled = enabled;
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): void {
    if (this.enabled) {
      this.composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  dispose(): void {
    this.composer.dispose();
  }
}


