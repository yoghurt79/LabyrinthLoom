import {
  AmbientLight,
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Effects } from './Effects';

export class SceneManager {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly controls: OrbitControls;
  readonly effects: Effects;

  private readonly cutawayPlane = new Plane(new Vector3(1, 0, 0), 0);
  private cutawayEnabled = false;
  private readonly cutawayNormal = new Vector3();
  private renderScale = Math.min(window.devicePixelRatio, 1.1);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.1));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.localClippingEnabled = true;

    this.scene.background = new Color('#081323');
    this.scene.fog = new FogExp2(0x17344f, 0.0075);

    this.camera = new PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 240);
    this.camera.position.set(31, 31, 36);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 1.2, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.42;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 125;
    this.controls.minPolarAngle = 0.18;
    this.controls.maxPolarAngle = Math.PI * 0.92;

    const hemisphere = new HemisphereLight(0x8db9e8, 0x0d1727, 0.96);
    const ambient = new AmbientLight(0x45698f, 0.4);
    const directional = new DirectionalLight(0xc9ddff, 1.55);
    directional.position.set(-34, 48, 24);
    directional.castShadow = true;
    directional.shadow.mapSize.set(1024, 1024);
    directional.shadow.camera.left = -68;
    directional.shadow.camera.right = 68;
    directional.shadow.camera.top = 68;
    directional.shadow.camera.bottom = -68;
    directional.shadow.camera.near = 1;
    directional.shadow.camera.far = 140;
    directional.shadow.bias = -0.0004;
    directional.shadow.normalBias = 0.05;
    this.scene.add(hemisphere, ambient, directional);

    this.effects = new Effects(this.renderer, this.scene, this.camera);
  }

  setRenderScale(scale: number): void {
    this.renderScale = Math.max(0.65, Math.min(scale, 1.35));
    this.renderer.setPixelRatio(this.renderScale);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.effects.setSize(window.innerWidth, window.innerHeight);
  }

  invalidateShadows(): void {
    this.renderer.shadowMap.needsUpdate = true;
  }

  setAutoRotate(enabled: boolean): void {
    this.controls.autoRotate = enabled;
  }

  setAutoRotateSpeed(speed: number): void {
    this.controls.autoRotateSpeed = speed;
  }

  setPostProcessing(enabled: boolean): void {
    this.effects.setEnabled(enabled);
  }

  setCutaway(enabled: boolean): void {
    this.cutawayEnabled = enabled;
    this.renderer.clippingPlanes = enabled ? [this.cutawayPlane] : [];
    this.updateCutawayPlane();
  }

  private updateCutawayPlane(): void {
    if (!this.cutawayEnabled) return;
    this.cutawayNormal.copy(this.controls.target).sub(this.camera.position);
    this.cutawayNormal.y = 0;
    if (this.cutawayNormal.lengthSq() < 0.0001) return;
    this.cutawayNormal.normalize();
    this.cutawayPlane.setFromNormalAndCoplanarPoint(this.cutawayNormal, this.controls.target);
  }

  update(): void {
    this.controls.update();
    this.updateCutawayPlane();
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.effects.setSize(width, height);
  }

  render(): void {
    this.effects.render(this.renderer, this.scene, this.camera);
  }

  dispose(): void {
    this.controls.dispose();
    this.effects.dispose();
    this.renderer.dispose();
  }
}



