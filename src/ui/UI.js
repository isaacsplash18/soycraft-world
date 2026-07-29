import { IS_TOUCH } from '../config/settings.js';
import { withUtm, buildCartUrl } from '../shop/storeLink.js';

/**
 * All DOM / 2D overlay handling:
 *   • loading screen progress
 *   • HUD discovery counter + wishlist badge button
 *   • product info card (name, description, image, shop link, ♡ save toggle)
 *   • wishlist panel (thumbnails, checkout permalink, per-item view/remove)
 *   • completion overlay + email capture
 *   • mobile action buttons (jump, switch view)
 *
 * No game logic lives here — main.js drives it via these methods.
 *
 * Constructor options
 * -------------------
 *   controls  — Controls instance (for mobile button delegates)
 *   wishlist  — Wishlist instance (src/shop/Wishlist.js)
 *   analytics — Analytics singleton (src/core/Analytics.js)
 */
export class UI {
  constructor({ controls, onReplay, wishlist, analytics } = {}) {
    this.controls = controls;
    this.onReplay = onReplay;
    this.wishlist = wishlist || null;
    this.analytics = analytics || null;
    this._completed = false;
    this._currentProduct = null; // product currently shown in the card

    // ── Loading ──────────────────────────────────────────────────────────────
    this.loadingScreen = document.getElementById('loading-screen');
    this.loadingProgress = document.querySelector('.loading-progress');

    // ── HUD ──────────────────────────────────────────────────────────────────
    this.countEl = document.getElementById('discovery-count');
    this.totalEl = document.getElementById('discovery-total');

    // Wishlist HUD badge
    this.wishlistBtn = document.getElementById('wishlist-btn');
    this.wishlistCountEl = document.getElementById('wishlist-count');
    if (this.wishlistBtn) {
      this.wishlistBtn.addEventListener('click', () => this._openWishlistPanel());
    }

    // ── Product card ─────────────────────────────────────────────────────────
    this.card = document.getElementById('product-card');
    this.cardImg = document.getElementById('product-card-img');
    this.cardCat = document.getElementById('product-card-cat');
    this.cardName = document.getElementById('product-card-name');
    this.cardDesc = document.getElementById('product-card-desc');
    this.cardPrice = document.getElementById('product-card-price');
    this.cardShop = document.getElementById('product-card-shop');
    this.cardSave = document.getElementById('product-card-save');
    document.getElementById('product-card-close').addEventListener('click', () => this.hideCard());

    // Fire store_link_open when the Shop now link is followed.
    if (this.cardShop) {
      this.cardShop.addEventListener('click', () => {
        this.analytics?.track('store_link_open', { id: this._currentProduct?.id });
      });
    }

    // Save / unsave toggle.
    if (this.cardSave) {
      this.cardSave.addEventListener('click', () => this._onToggleSave());
    }

    // ── Link card ────────────────────────────────────────────────────────────
    this.linkCard = document.getElementById('link-card');
    this.linkTag = document.getElementById('link-card-tag');
    this.linkTitle = document.getElementById('link-card-title');
    this.linkSub = document.getElementById('link-card-sub');
    this.linkCta = document.getElementById('link-card-cta');
    this.linkIcon = document.getElementById('link-card-icon');
    this._currentLink = null;
    document.getElementById('link-card-close').addEventListener('click', () => this.hideLinkCard());
    if (this.linkCta) {
      this.linkCta.addEventListener('click', () => {
        this.analytics?.track('store_link_open', { id: this._currentLink?.id || this._currentLink?.url });
      });
    }

    // ── Wishlist panel ────────────────────────────────────────────────────────
    this.wishlistPanel = document.getElementById('wishlist-panel');
    this.wishlistItemsList = document.getElementById('wishlist-items-list');
    this.wishlistCheckoutBtn = document.getElementById('wishlist-checkout');
    if (document.getElementById('wishlist-close')) {
      document.getElementById('wishlist-close').addEventListener('click', () => this._closeWishlistPanel());
    }
    if (this.wishlistCheckoutBtn) {
      this.wishlistCheckoutBtn.addEventListener('click', () => this._onCheckout());
    }

    // ── Completion + email capture ────────────────────────────────────────────
    this.completion = document.getElementById('completion');
    this.emailForm = document.getElementById('email-form');
    this.emailInput = document.getElementById('email-input');
    this.emailMsg = document.getElementById('email-msg');
    this.emailForm.addEventListener('submit', (e) => this._onEmailSubmit(e));
    document
      .getElementById('completion-replay')
      .addEventListener('click', () => this.hideCompletion());

    // ── Wishlist change subscription ─────────────────────────────────────────
    if (this.wishlist) {
      this.wishlist.onChange(() => this._updateWishlistHud());
      this._updateWishlistHud();
    }

    if (IS_TOUCH) this._buildMobileButtons();

    // Hide desktop/mobile hint variants per device.
    document.body.classList.add(IS_TOUCH ? 'is-touch' : 'is-desktop');
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  setProgress(pct) {
    if (this.loadingProgress) this.loadingProgress.textContent = `${Math.round(pct)}%`;
  }

  hideLoading() {
    if (!this.loadingScreen) return;
    this.loadingScreen.classList.add('fade-out');
    setTimeout(() => (this.loadingScreen.style.display = 'none'), 500);
  }

  // ── HUD counter ──────────────────────────────────────────────────────────
  setTotal(n) {
    if (this.totalEl) this.totalEl.textContent = n;
  }

  setCount(n) {
    if (this.countEl) {
      this.countEl.textContent = n;
      // tiny pop animation
      this.countEl.classList.remove('pop');
      void this.countEl.offsetWidth;
      this.countEl.classList.add('pop');
    }
  }

  // ── Product card ─────────────────────────────────────────────────────────

  showCard(product) {
    if (this._completed) return; // don't pop cards over the finish screen
    this._currentProduct = product;
    this.cardCat.textContent = (product.category || '').toUpperCase();
    this.cardName.textContent = product.name;
    this.cardDesc.textContent = product.description;
    this.cardPrice.textContent = product.price || '';
    // Append UTMs to every shop handoff link.
    this.cardShop.href = withUtm(product.shopUrl);
    this.cardImg.src = product.image;
    this.cardImg.alt = product.name;
    this._updateSaveBtn();
    this.card.classList.remove('hidden');
    this._setPhotoHot(true); // invite a photo while next to a product
  }

  hideCard() {
    this.card.classList.add('hidden');
    this._setPhotoHot(false);
  }

  /** Update the save button state to reflect the wishlist for the current product. */
  _updateSaveBtn() {
    if (!this.cardSave || !this._currentProduct) return;
    const saved = this.wishlist?.has(this._currentProduct.id) ?? false;
    this.cardSave.textContent = saved ? '♥ Saved' : '♡ Save';
    this.cardSave.classList.toggle('saved', saved);
    this.cardSave.setAttribute('aria-pressed', saved ? 'true' : 'false');
  }

  /** Toggle the current product in/out of the wishlist. */
  _onToggleSave() {
    const id = this._currentProduct?.id;
    if (!id || !this.wishlist) return;
    if (this.wishlist.has(id)) {
      this.wishlist.remove(id);
      this.analytics?.track('wishlist_remove', { id });
    } else {
      this.wishlist.add(id);
      this.analytics?.track('wishlist_add', { id });
    }
    this._updateSaveBtn();
  }

  // ── Link card (external links) ─────────────────────────────────────────────

  showLinkCard(link) {
    if (this._completed) return;
    this._currentLink = link;
    this.linkTag.textContent = link.tag || 'LINK';
    this.linkTitle.textContent = link.title;
    this.linkSub.textContent = link.subtitle;
    this.linkCta.textContent = link.cta || 'Open →';
    // Apply UTMs to soycraft.co links; pass through other domains as-is.
    this.linkCta.href = link.url?.includes('soycraft.co') ? withUtm(link.url) : link.url;
    this.linkIcon.textContent = link.icon || '↗';
    this.linkCard.classList.remove('hidden');
  }

  hideLinkCard() {
    this.linkCard.classList.add('hidden');
  }

  // ── Wishlist HUD badge ─────────────────────────────────────────────────────

  _updateWishlistHud() {
    const count = this.wishlist?.items().length ?? 0;
    if (this.wishlistCountEl) this.wishlistCountEl.textContent = count;
    if (this.wishlistBtn) {
      this.wishlistBtn.classList.toggle('hidden', count === 0);
    }
    // If the panel is open, re-render its items to stay in sync.
    if (this.wishlistPanel && !this.wishlistPanel.classList.contains('hidden')) {
      this._renderWishlistItems();
    }
  }

  // ── Wishlist panel ─────────────────────────────────────────────────────────

  _openWishlistPanel() {
    this._renderWishlistItems();
    this.wishlistPanel?.classList.remove('hidden');
  }

  _closeWishlistPanel() {
    this.wishlistPanel?.classList.add('hidden');
  }

  _renderWishlistItems() {
    if (!this.wishlistItemsList) return;
    const items = this.wishlist?.items() ?? [];
    this.wishlistItemsList.innerHTML = '';

    if (items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'wishlist-empty';
      empty.textContent = 'Your wishlist is empty. Walk up to a product and tap ♡ Save.';
      this.wishlistItemsList.appendChild(empty);
      if (this.wishlistCheckoutBtn) this.wishlistCheckoutBtn.style.display = 'none';
      return;
    }

    if (this.wishlistCheckoutBtn) this.wishlistCheckoutBtn.style.display = '';

    for (const p of items) {
      const row = document.createElement('div');
      row.className = 'wishlist-item';

      // Thumbnail
      const img = document.createElement('img');
      img.src = p.image;
      img.alt = p.name;
      img.className = 'wishlist-thumb';
      img.loading = 'lazy';
      row.appendChild(img);

      // Name + price
      const info = document.createElement('div');
      info.className = 'wishlist-info';
      const nameEl = document.createElement('span');
      nameEl.className = 'wishlist-name';
      nameEl.textContent = p.name;
      const priceEl = document.createElement('span');
      priceEl.className = 'wishlist-price';
      priceEl.textContent = p.price || '';
      info.appendChild(nameEl);
      info.appendChild(priceEl);
      // Note when item cannot be added to cart (DRAFT variant).
      if (p.variantId === null) {
        const note = document.createElement('span');
        note.className = 'wishlist-no-variant';
        note.textContent = 'View in store only';
        info.appendChild(note);
      }
      row.appendChild(info);

      // Actions: View link + Remove button
      const actions = document.createElement('div');
      actions.className = 'wishlist-actions';

      const view = document.createElement('a');
      view.href = withUtm(p.shopUrl);
      view.target = '_blank';
      view.rel = 'noopener';
      view.className = 'wishlist-view-btn';
      view.textContent = 'View →';
      view.addEventListener('click', () => {
        this.analytics?.track('store_link_open', { id: p.id });
      });
      actions.appendChild(view);

      const removeBtn = document.createElement('button');
      removeBtn.className = 'wishlist-remove-btn';
      removeBtn.textContent = '×';
      removeBtn.setAttribute('aria-label', `Remove ${p.name} from wishlist`);
      removeBtn.addEventListener('click', () => {
        this.wishlist?.remove(p.id);
        this.analytics?.track('wishlist_remove', { id: p.id });
        // _updateWishlistHud() will re-render the panel and update the HUD.
        this._updateWishlistHud();
        // Also refresh the save button if this product is currently in the card.
        if (this._currentProduct?.id === p.id) this._updateSaveBtn();
      });
      actions.appendChild(removeBtn);

      row.appendChild(actions);
      this.wishlistItemsList.appendChild(row);
    }
  }

  /** Build and open the Shopify cart permalink for all cartable wishlist items. */
  _onCheckout() {
    const items = this.wishlist?.items() ?? [];
    if (items.length === 0) return;
    const url = buildCartUrl(items);
    this.analytics?.track('cart_handoff', {
      items: items.map((i) => i.id),
      count: items.length,
    });
    window.open(url, '_blank', 'noopener');
  }

  // ── Completion + email capture ───────────────────────────────────────────

  showCompletion() {
    this._completed = true;
    this.hideCard();
    this.completion.classList.remove('hidden');
  }

  hideCompletion() {
    this.completion.classList.add('hidden');
  }

  _onEmailSubmit(e) {
    e.preventDefault();
    const email = this.emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.emailMsg.textContent = 'Please enter a valid email.';
      this.emailMsg.className = 'email-msg error';
      return;
    }

    // ────────────────────────────────────────────────────────────────────
    // TODO: WIRE UP REAL EMAIL CAPTURE HERE.
    // Replace this stub with a POST to your provider, e.g. Klaviyo /
    // Mailchimp / Shopify customer endpoint:
    //
    //   await fetch('https://your-endpoint', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email, source: 'soycraft-world-game' }),
    //   });
    // ────────────────────────────────────────────────────────────────────
    console.log('[Soycraft] captured email (placeholder):', email);

    // Fire analytics event BEFORE disabling the form so it's always tracked.
    this.analytics?.track('email_captured');

    this.emailMsg.textContent = "🎉 You're on the list! We'll be in touch.";
    this.emailMsg.className = 'email-msg success';
    this.emailInput.disabled = true;
    this.emailForm.querySelector('button').disabled = true;
  }

  // ── Start screen (breed + customisation before play) ──────────────────────
  //
  // Signature: setupStartScreen(breeds, opts, onStart)
  //   breeds   — array of { id, name, size } (from player.breeds)
  //   opts     — {
  //                identity,        DogIdentity singleton
  //                coatColours,     COAT_COLOURS array
  //                accessories,     ACCESSORIES array
  //                onBreedChange,   (id) => void
  //                onCoatChange,    (id) => void
  //                onAccessoryChange, (id) => void
  //                onNameChange,    (name) => void
  //              }
  //   onStart  — () => void — called when Start button is clicked

  setupStartScreen(breeds, opts = {}, onStart) {
    const {
      identity, coatColours, accessories,
      onBreedChange, onCoatChange, onAccessoryChange, onNameChange,
    } = opts;

    const currentId = identity?.breedId ?? breeds[0]?.id;

    const screen  = document.getElementById('start-screen');
    const select  = document.getElementById('start-breed-select');
    const card    = screen.querySelector('.start-card');
    const startBtn = document.getElementById('start-btn');

    // ── Breed dropdown ──────────────────────────────────────────────────────
    const groups = {
      small: Object.assign(document.createElement('optgroup'), { label: 'Small dogs' }),
      big:   Object.assign(document.createElement('optgroup'), { label: 'Big dogs' }),
    };
    for (const b of breeds) {
      const opt = document.createElement('option');
      opt.value       = b.id;
      opt.textContent = b.name;
      if (b.id === currentId) opt.selected = true;
      (groups[b.size] || groups.small).appendChild(opt);
    }
    select.appendChild(groups.small);
    select.appendChild(groups.big);
    select.addEventListener('change', () => onBreedChange?.(select.value));

    // ── Customiser (name + coat + accessory) ────────────────────────────────
    if (coatColours && accessories && identity) {
      const customiser = document.createElement('div');
      customiser.className = 'start-customiser';

      // --- Name input -------------------------------------------------------
      const nameInput = document.createElement('input');
      nameInput.type        = 'text';
      nameInput.className   = 'start-name-input';
      nameInput.maxLength   = 16;
      nameInput.placeholder = 'Name your dog (optional)';
      nameInput.value       = identity.name ?? '';
      nameInput.setAttribute('aria-label', 'Dog name');
      // Prevent keyboard from triggering game actions while typing.
      nameInput.addEventListener('keydown', (e) => e.stopPropagation());
      nameInput.addEventListener('input',   () => onNameChange?.(nameInput.value));
      customiser.appendChild(nameInput);

      // --- Coat colour swatches ---------------------------------------------
      const coatRow   = document.createElement('div');
      coatRow.className = 'customiser-row';

      const coatLabel = document.createElement('span');
      coatLabel.className   = 'customiser-label';
      coatLabel.textContent = 'Coat colour';

      const swatchRow = document.createElement('div');
      swatchRow.className = 'coat-swatches';

      for (const cc of coatColours) {
        const swatch = document.createElement('button');
        swatch.className = 'coat-swatch';
        swatch.setAttribute('aria-label', cc.label);
        swatch.title = cc.label;
        if (cc.css) {
          swatch.style.background = cc.css;
        } else {
          swatch.classList.add('coat-swatch--natural');
        }
        if (cc.id === (identity.coat ?? 'natural')) swatch.classList.add('active');
        swatch.addEventListener('click', () => {
          swatchRow.querySelectorAll('.coat-swatch').forEach((s) => s.classList.remove('active'));
          swatch.classList.add('active');
          onCoatChange?.(cc.id);
        });
        swatchRow.appendChild(swatch);
      }

      coatRow.appendChild(coatLabel);
      coatRow.appendChild(swatchRow);
      customiser.appendChild(coatRow);

      // --- Accessory pills --------------------------------------------------
      const accRow   = document.createElement('div');
      accRow.className = 'customiser-row';

      const accLabel = document.createElement('span');
      accLabel.className   = 'customiser-label';
      accLabel.textContent = 'Accessory';

      const pillRow = document.createElement('div');
      pillRow.className = 'acc-pills';

      for (const ac of accessories) {
        const pill = document.createElement('button');
        pill.className   = 'acc-pill';
        pill.textContent = ac.label;
        if (ac.id === (identity.accessory ?? 'none')) pill.classList.add('active');
        pill.addEventListener('click', () => {
          pillRow.querySelectorAll('.acc-pill').forEach((p) => p.classList.remove('active'));
          pill.classList.add('active');
          onAccessoryChange?.(ac.id);
        });
        pillRow.appendChild(pill);
      }

      accRow.appendChild(accLabel);
      accRow.appendChild(pillRow);
      customiser.appendChild(accRow);

      // Inject before the start button.
      card.insertBefore(customiser, startBtn);
    }

    // ── Start button ────────────────────────────────────────────────────────
    startBtn.addEventListener('click', () => {
      screen.classList.add('hidden');
      document.body.classList.remove('pre-start');
      onStart();
    });

    document.body.classList.add('pre-start'); // hides HUD/controls until start
    screen.classList.remove('hidden');
  }

  // ── Breed picker ───────────────────────────────────────────────────────────

  setupBreedPicker(breeds, currentId, onChange) {
    const wrap = document.createElement('div');
    wrap.id = 'breed-picker';

    const label = document.createElement('span');
    label.className = 'breed-label';
    label.textContent = '🐶 Breed';

    const select = document.createElement('select');
    select.id = 'breed-select';
    select.setAttribute('aria-label', 'Choose dog breed');
    const groups = {
      small: Object.assign(document.createElement('optgroup'), { label: 'Small dogs' }),
      big: Object.assign(document.createElement('optgroup'), { label: 'Big dogs' }),
    };
    for (const b of breeds) {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      if (b.id === currentId) opt.selected = true;
      (groups[b.size] || groups.small).appendChild(opt);
    }
    select.appendChild(groups.small);
    select.appendChild(groups.big);
    select.addEventListener('change', () => onChange(select.value));

    wrap.appendChild(label);
    wrap.appendChild(select);
    document.body.appendChild(wrap);
  }

  // ── Bark button (desktop + mobile) ─────────────────────────────────────────

  setupBark(onBark) {
    const btn = document.createElement('button');
    btn.id = 'bark-btn';
    btn.innerHTML = '🐶 Bark!';
    btn.setAttribute('aria-label', 'Bark');
    // pointerdown fires once for mouse + touch and is a valid gesture for
    // unlocking audio on mobile (click can be too late / get swallowed).
    btn.addEventListener(
      'pointerdown',
      (e) => {
        e.preventDefault();
        btn.classList.remove('pop');
        void btn.offsetWidth;
        btn.classList.add('pop');
        onBark();
      },
      { passive: false }
    );
    document.body.appendChild(btn);
  }

  // ── Photo / share button (§6.2) ────────────────────────────────────────────

  /**
   * Create the HUD camera button (thumb-reachable on mobile; P key handled in
   * main.js). Available any time after Start. When a product card is showing it
   * gains a subtle "hot" pulse so capturing next to a product feels natural.
   * @param {() => void} onCapture — called on tap.
   */
  setupPhoto(onCapture) {
    const btn = document.createElement('button');
    btn.id = 'photo-btn';
    btn.innerHTML = '📷';
    btn.setAttribute('aria-label', 'Take a photo');
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.classList.remove('pop');
      void btn.offsetWidth;
      btn.classList.add('pop');
      onCapture();
    }, { passive: false });
    document.body.appendChild(btn);
    this._photoBtn = btn;
  }

  _setPhotoHot(hot) {
    this._photoBtn?.classList.toggle('photo-btn--hot', hot);
  }

  // ── Mobile action buttons ────────────────────────────────────────────────

  _buildMobileButtons() {
    const wrap = document.createElement('div');
    wrap.id = 'mobile-buttons';

    const jump = document.createElement('button');
    jump.className = 'm-btn';
    jump.textContent = '⤒';
    jump.setAttribute('aria-label', 'Jump');
    jump.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.controls?.pressJump();
    });

    const view = document.createElement('button');
    view.className = 'm-btn';
    view.textContent = '👁';
    view.setAttribute('aria-label', 'Switch view');
    view.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.controls?.pressViewToggle();
    });

    wrap.appendChild(view);
    wrap.appendChild(jump);
    document.body.appendChild(wrap);
  }
}
