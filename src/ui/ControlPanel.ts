export interface ControlPanelActions {
  regenerate(): void;
  generateSeed(seed: string): void;
  copySeed(): void;
  setAutoRotate(enabled: boolean): void;
  setAutoRotateSpeed(speed: number): void;
  setWireframe(enabled: boolean): void;
  setCeilingVisible(visible: boolean): void;
  setCutaway(enabled: boolean): void;
  setPostProcessing(enabled: boolean): void;
  focusSelection(): void;
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element as T;
}

export class ControlPanel {
  private readonly seedInput: HTMLInputElement;
  private readonly speedValue: HTMLOutputElement;
  private readonly toast: HTMLElement;
  private readonly postProcessInput: HTMLInputElement;

  constructor(
    root: HTMLElement,
    actions: ControlPanelActions,
  ) {
    root.innerHTML = `
      <section class="panel control-panel" aria-label="地牢控制台">
        <header class="brand">
          <span class="brand-mark">LL</span>
          <div>
            <p class="eyebrow">PROCEDURAL ARCHITECTURE</p>
            <h1>迷宫织机</h1>
          </div>
        </header>
        <div class="rule"></div>
        <label class="field-label" for="seed-input">世界种子</label>
        <div class="seed-row">
          <input id="seed-input" class="text-input" type="text" spellcheck="false" autocomplete="off" />
          <button id="seed-submit" class="icon-button" title="按种子生成" aria-label="按种子生成">↵</button>
          <button id="copy-seed" class="icon-button" title="复制种子" aria-label="复制当前种子">⧉</button>
        </div>
        <button id="refresh-dungeon" class="primary-button">
          <span>刷新未知地牢</span><span class="key-hint">R</span>
        </button>

        <div class="section-heading"><span>视角与渲染</span><span>VIEW</span></div>
        <div class="toggle-list">
          <label class="toggle-row"><span>自动旋转</span><input id="auto-rotate" type="checkbox" checked /><i></i></label>
          <label class="toggle-row"><span>线框模式</span><input id="wireframe" type="checkbox" /><i></i></label>
          <label class="toggle-row"><span>显示天花板</span><input id="ceiling" type="checkbox" checked /><i></i></label>
          <label class="toggle-row"><span>动态剖切</span><input id="cutaway" type="checkbox" /><i></i></label>
          <label class="toggle-row"><span>辉光后处理</span><input id="post-process" type="checkbox" /><i></i></label>
        </div>

        <div class="range-heading">
          <span>旋转速度</span><output id="speed-value">0.42</output>
        </div>
        <input id="rotate-speed" class="range-input" type="range" min="0" max="2" step="0.05" value="0.42" />
        <button id="focus-selection" class="secondary-button">聚焦选中 / 随机石室</button>
        <p class="status-line"><span class="status-dot"></span><span id="render-status">生成完毕，等待探索</span></p>
      </section>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
    `;

    this.seedInput = query<HTMLInputElement>(root, '#seed-input');
    this.speedValue = query<HTMLOutputElement>(root, '#speed-value');
    this.toast = query<HTMLElement>(root, '#toast');
    this.postProcessInput = query<HTMLInputElement>(root, '#post-process');

    query<HTMLButtonElement>(root, '#seed-submit').addEventListener('click', () => {
      const seed = this.seedInput.value.trim();
      if (seed) actions.generateSeed(seed);
    });
    this.seedInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const seed = this.seedInput.value.trim();
      if (seed) actions.generateSeed(seed);
    });
    query<HTMLButtonElement>(root, '#copy-seed').addEventListener('click', () => actions.copySeed());
    query<HTMLButtonElement>(root, '#refresh-dungeon').addEventListener('click', () => actions.regenerate());
    query<HTMLButtonElement>(root, '#focus-selection').addEventListener('click', () => actions.focusSelection());

    query<HTMLInputElement>(root, '#auto-rotate').addEventListener('change', (event) => {
      actions.setAutoRotate((event.currentTarget as HTMLInputElement).checked);
    });
    query<HTMLInputElement>(root, '#wireframe').addEventListener('change', (event) => {
      actions.setWireframe((event.currentTarget as HTMLInputElement).checked);
    });
    query<HTMLInputElement>(root, '#ceiling').addEventListener('change', (event) => {
      actions.setCeilingVisible((event.currentTarget as HTMLInputElement).checked);
    });
    query<HTMLInputElement>(root, '#cutaway').addEventListener('change', (event) => {
      actions.setCutaway((event.currentTarget as HTMLInputElement).checked);
    });
    query<HTMLInputElement>(root, '#post-process').addEventListener('change', (event) => {
      actions.setPostProcessing((event.currentTarget as HTMLInputElement).checked);
    });
    query<HTMLInputElement>(root, '#rotate-speed').addEventListener('input', (event) => {
      const speed = Number((event.currentTarget as HTMLInputElement).value);
      this.speedValue.value = speed.toFixed(2);
      this.speedValue.textContent = speed.toFixed(2);
      actions.setAutoRotateSpeed(speed);
    });
  }

  setPostProcessing(enabled: boolean): void {
    this.postProcessInput.checked = enabled;
  }

  setSeed(seed: string): void {
    this.seedInput.value = seed;
  }

  setStatus(message: string): void {
    const status = document.querySelector<HTMLElement>('#render-status');
    if (status) status.textContent = message;
  }

  showToast(message: string): void {
    this.toast.textContent = message;
    this.toast.classList.add('visible');
    window.setTimeout(() => this.toast.classList.remove('visible'), 1800);
  }
}


