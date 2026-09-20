import type { DungeonData } from '../core/dungeonTypes';
import type { DungeonPickTarget } from '../render/DungeonBuilder';

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`Missing UI element: ${selector}`);
  return element as T;
}

export class InfoPanel {
  private readonly seedValue: HTMLElement;
  private readonly roomValue: HTMLElement;
  private readonly corridorValue: HTMLElement;
  private readonly doorValue: HTMLElement;
  private readonly torchValue: HTMLElement;
  private readonly chestValue: HTMLElement;
  private readonly timeValue: HTMLElement;
  private readonly fpsValue: HTMLElement;
  private readonly selectionTitle: HTMLElement;
  private readonly selectionDetails: HTMLElement;

  constructor(root: HTMLElement) {
    root.innerHTML = `
      <aside class="panel info-panel" aria-label="地牢统计与对象信息">
        <div class="info-heading">
          <div>
            <p class="eyebrow">LIVE TELEMETRY</p>
            <h2>地牢档案</h2>
          </div>
          <span class="live-badge"><i></i>LIVE</span>
        </div>
        <div class="stats-grid">
          <div class="stat-card wide"><span>当前种子</span><strong id="stat-seed">—</strong></div>
          <div class="stat-card"><span>房间</span><strong id="stat-rooms">0</strong></div>
          <div class="stat-card"><span>走廊</span><strong id="stat-corridors">0</strong></div>
          <div class="stat-card"><span>门框</span><strong id="stat-doors">0</strong></div>
          <div class="stat-card"><span>火把</span><strong id="stat-torches">0</strong></div>
          <div class="stat-card"><span>宝箱</span><strong id="stat-chests">0</strong></div>
          <div class="stat-card"><span>生成耗时</span><strong id="stat-time">0 ms</strong></div>
          <div class="stat-card"><span>实时 FPS</span><strong id="stat-fps">60</strong></div>
        </div>
        <div class="section-heading"><span>对象检视</span><span>INSPECTOR</span></div>
        <div id="selection-empty" class="selection-empty">
          <span class="selection-rune">◇</span>
          <p>点击房间、门框、火把、宝箱或装饰物以检视其数据。</p>
        </div>
        <div id="selection-content" class="selection-content" hidden>
          <p id="selection-kind" class="selection-kind">未选择</p>
          <h3 id="selection-title">—</h3>
          <ul id="selection-details"></ul>
        </div>
      </aside>
    `;

    this.seedValue = query(root, '#stat-seed');
    this.roomValue = query(root, '#stat-rooms');
    this.corridorValue = query(root, '#stat-corridors');
    this.doorValue = query(root, '#stat-doors');
    this.torchValue = query(root, '#stat-torches');
    this.chestValue = query(root, '#stat-chests');
    this.timeValue = query(root, '#stat-time');
    this.fpsValue = query(root, '#stat-fps');
    this.selectionTitle = query(root, '#selection-title');
    this.selectionDetails = query(root, '#selection-details');
  }

  updateStats(data: DungeonData, fps: number): void {
    this.seedValue.textContent = data.seed;
    this.seedValue.title = data.seed;
    this.roomValue.textContent = String(data.stats.roomCount);
    this.corridorValue.textContent = String(data.stats.corridorCount);
    this.doorValue.textContent = String(data.stats.doorCount);
    this.torchValue.textContent = String(data.stats.torchCount);
    this.chestValue.textContent = String(data.stats.chestCount);
    this.timeValue.textContent = `${data.generationTimeMs.toFixed(1)} ms`;
    this.fpsValue.textContent = String(Math.round(fps));
  }

  updateSelection(target: DungeonPickTarget | null): void {
    const empty = document.querySelector<HTMLElement>('#selection-empty');
    const content = document.querySelector<HTMLElement>('#selection-content');
    if (!empty || !content) return;

    if (!target) {
      empty.hidden = false;
      content.hidden = true;
      return;
    }

    empty.hidden = true;
    content.hidden = false;
    this.selectionTitle.textContent = target.title;
    this.selectionDetails.replaceChildren(
      ...target.details.map((detail) => {
        const item = document.createElement('li');
        item.textContent = detail;
        return item;
      }),
    );
    const kind = document.querySelector<HTMLElement>('#selection-kind');
    if (kind) kind.textContent = target.kind.toUpperCase();
  }
}
