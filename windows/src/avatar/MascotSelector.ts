import { MASCOTS_CATALOG, type MascotInfo } from './mascotCatalog';
import './PageMascotElement';
import { EmbasaAvatarElement } from './EmbasaAvatarElement';

export interface MascotSelectorOptions {
  currentMascot?: string;
  onSelect?: (mascotId: string, info: MascotInfo) => void;
  onClose?: () => void;
}

export class MascotSelector {
  public container: HTMLElement;
  private currentMascot: string;
  private onSelect?: (mascotId: string, info: MascotInfo) => void;
  public onClose?: () => void;

  private activeCategory: 'all' | 'embasa' | 'animals' | 'people' | 'robots' = 'all';
  private searchQuery: string = '';
  private gridEl: HTMLElement;

  constructor(options: MascotSelectorOptions = {}) {
    this.currentMascot = options.currentMascot || 'embasa';
    this.onSelect = options.onSelect;
    this.onClose = options.onClose;

    this.container = document.createElement('div');
    this.container.className = 'mascot-selector-root';

    // Header & Filter Bar
    const header = document.createElement('div');
    header.className = 'ms-header';
    header.innerHTML = `
      <div class="ms-title-row">
        <div>
          <h2 class="ms-title">Seletor de Mascotes & Avatares</h2>
          <p class="ms-subtitle">Escolha entre o mascote oficial Embasa ou os 52 personagens interativos do page-mascot.</p>
        </div>
        <div class="ms-current-badge">
          <span>Ativo:</span>
          <strong id="ms-current-label">${this.currentMascot.toUpperCase()}</strong>
        </div>
      </div>
      <div class="ms-filter-row">
        <div class="ms-tabs" id="ms-tabs">
          <button class="ms-tab active" data-cat="all">Todos (${MASCOTS_CATALOG.length})</button>
          <button class="ms-tab" data-cat="embasa">💧 Oficial Embasa</button>
          <button class="ms-tab" data-cat="animals">🐾 Animais</button>
          <button class="ms-tab" data-cat="people">👤 Personagens</button>
          <button class="ms-tab" data-cat="robots">🤖 Robôs & Criaturas</button>
        </div>
        <input type="text" class="ms-search" id="ms-search" placeholder="Buscar mascote por nome..." />
      </div>
    `;

    this.gridEl = document.createElement('div');
    this.gridEl.className = 'ms-grid';

    this.container.appendChild(header);
    this.container.appendChild(this.gridEl);

    this.bindEvents(header);
    this.renderGrid();
  }

  private bindEvents(header: HTMLElement) {
    const tabs = header.querySelectorAll<HTMLButtonElement>('.ms-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeCategory = tab.getAttribute('data-cat') as any;
        this.renderGrid();
      });
    });

    const searchInput = header.querySelector<HTMLInputElement>('#ms-search')!;
    searchInput.addEventListener('input', () => {
      this.searchQuery = searchInput.value.trim().toLowerCase();
      this.renderGrid();
    });
  }

  public setCurrentMascot(id: string) {
    this.currentMascot = id;
    const label = this.container.querySelector('#ms-current-label');
    if (label) label.textContent = id.toUpperCase();
    this.renderGrid();
  }

  public renderGrid() {
    this.gridEl.innerHTML = '';

    const filtered = MASCOTS_CATALOG.filter((m) => {
      const matchCat = this.activeCategory === 'all' || m.category === this.activeCategory;
      const matchSearch =
        !this.searchQuery ||
        m.name.toLowerCase().includes(this.searchQuery) ||
        m.id.toLowerCase().includes(this.searchQuery) ||
        m.description.toLowerCase().includes(this.searchQuery);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ms-empty';
      empty.innerHTML = `
        <span style="font-size: 32px;">🔍</span>
        <p>Nenhum mascote encontrado com "<strong>${this.searchQuery}</strong>".</p>
      `;
      this.gridEl.appendChild(empty);
      return;
    }

    filtered.forEach((mascot) => {
      const card = document.createElement('div');
      const isSelected = mascot.id === this.currentMascot;
      card.className = `ms-card ${isSelected ? 'is-selected' : ''} ${mascot.category === 'embasa' ? 'is-embasa-card' : ''}`;

      // Preview mount
      const previewWrapper = document.createElement('div');
      previewWrapper.className = 'ms-card-preview';

      if (mascot.isVectorAvatar) {
        // High fidelity Embasa vector
        const embasa = new EmbasaAvatarElement();
        embasa.style.width = '100px';
        embasa.style.height = '100px';
        embasa.setAttribute('tracking', 'true');
        previewWrapper.appendChild(embasa);
      } else {
        // Page Mascot 3x3 web component
        const pm = document.createElement('page-mascot') as any;
        pm.setCharacter(mascot.id);
        pm.size = 96;
        previewWrapper.appendChild(pm);
      }

      // Card Details
      const details = document.createElement('div');
      details.className = 'ms-card-details';
      details.innerHTML = `
        <div class="ms-card-header">
          <h3 class="ms-card-name">${mascot.name}</h3>
          ${mascot.category === 'embasa' ? '<span class="ms-badge-embasa">OFICIAL</span>' : ''}
        </div>
        <p class="ms-card-desc">${mascot.description}</p>
      `;

      // Select Button
      const selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = `ms-card-btn ${isSelected ? 'active' : ''}`;
      selectBtn.textContent = isSelected ? '✓ Selecionado' : 'Usar Mascote';
      selectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.currentMascot = mascot.id;
        const currentLabel = this.container.querySelector('#ms-current-label');
        if (currentLabel) currentLabel.textContent = mascot.id.toUpperCase();
        this.renderGrid();
        this.onSelect?.(mascot.id, mascot);
      });

      card.appendChild(previewWrapper);
      card.appendChild(details);
      card.appendChild(selectBtn);

      card.addEventListener('click', () => {
        // Poking the card clicks the inner mascot preview to trigger boop reaction
        const btn = previewWrapper.querySelector('button');
        if (btn) btn.click();
      });

      this.gridEl.appendChild(card);
    });
  }
}
