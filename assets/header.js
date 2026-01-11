import { Component } from '@theme/component';
import { onDocumentLoaded, changeMetaThemeColor } from '@theme/utilities';

/**
 * @typedef {Object} HeaderComponentRefs
 * @property {HTMLDivElement} headerDrawerContainer
 * @property {HTMLElement} headerMenu
 * @property {HTMLElement} headerRowTop
 */

class HeaderComponent extends Component {
  requiredRefs = ['headerDrawerContainer', 'headerMenu', 'headerRowTop'];

  #menuDrawerHiddenWidth = null;
  #intersectionObserver = null;
  #offscreen = false;
  #lastScrollTop = 0;
  #timeout = null;
  #scrollRafId = null;
  #animationDelay = 150;

  #resizeObserver = new ResizeObserver(([entry]) => {
    if (!entry || !entry.borderBoxSize[0]) return;
    const roundedHeaderHeight = Math.round(entry.borderBoxSize[0].blockSize);
    document.body.style.setProperty('--header-height', `${roundedHeaderHeight}px`);
  });

  #observeStickyPosition = (alwaysSticky = true) => {
    if (this.#intersectionObserver) return;

    this.#intersectionObserver = new IntersectionObserver(([entry]) => {
      if (!entry) return;

      const { isIntersecting } = entry;
      if (alwaysSticky) {
        this.dataset.stickyState = isIntersecting ? 'inactive' : 'active';
        if (this.dataset.themeColor) {
          changeMetaThemeColor(this.dataset.themeColor);
        }
      } else {
        this.#offscreen = !isIntersecting || this.dataset.stickyState === 'active';
      }
    }, { threshold: alwaysSticky ? 1 : 0 });

    this.#intersectionObserver.observe(this);
  };

  #handleWindowScroll = () => {
    if (this.#scrollRafId !== null) return;
    this.#scrollRafId = requestAnimationFrame(() => {
      this.#scrollRafId = null;
      this.#updateScrollState();
    });
  };

  #updateScrollState = () => {
    const stickyMode = this.getAttribute('sticky');
    if (!this.#offscreen && stickyMode !== 'always') return;

    const scrollTop = document.scrollingElement?.scrollTop ?? 0;
    const headerTop = this.getBoundingClientRect().top;
    const isScrollingUp = scrollTop < this.#lastScrollTop;
    const isAtTop = headerTop >= 0;

    if (this.#timeout) clearTimeout(this.#timeout);

    if (stickyMode === 'always') {
      this.dataset.scrollDirection = isAtTop
        ? 'none'
        : isScrollingUp
        ? 'up'
        : 'down';
      this.#lastScrollTop = scrollTop;
      return;
    }

    if (isScrollingUp) {
      this.removeAttribute('data-animating');
      if (isAtTop) {
        this.#offscreen = false;
        this.dataset.stickyState = 'inactive';
        this.dataset.scrollDirection = 'none';
      } else {
        this.dataset.stickyState = 'active';
        this.dataset.scrollDirection = 'up';
      }
    } else if (this.dataset.stickyState === 'active') {
      this.dataset.scrollDirection = 'none';
      this.setAttribute('data-animating', '');
      this.#timeout = setTimeout(() => {
        this.dataset.stickyState = 'idle';
        this.removeAttribute('data-animating');
      }, this.#animationDelay);
    } else {
      this.dataset.scrollDirection = 'none';
      this.dataset.stickyState = 'idle';
    }

    this.#lastScrollTop = scrollTop;
  };

  connectedCallback() {
    super.connectedCallback();
    this.#resizeObserver.observe(this);

    const stickyMode = this.getAttribute('sticky');
    if (stickyMode) {
      this.#observeStickyPosition(stickyMode === 'always');
      if (stickyMode === 'scroll-up' || stickyMode === 'always') {
        document.addEventListener('scroll', this.#handleWindowScroll);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resizeObserver.disconnect();
    this.#intersectionObserver?.disconnect();
    document.removeEventListener('scroll', this.#handleWindowScroll);
    if (this.#scrollRafId !== null) cancelAnimationFrame(this.#scrollRafId);
    document.body.style.setProperty('--header-height', '0px');
  }
}

if (!customElements.get('header-component')) {
  customElements.define('header-component', HeaderComponent);
}

/* ============================================================
   DOCUMENT READY
   ============================================================ */

onDocumentLoaded(() => {
  const heroSection = document.querySelector('#hero-section');
  const headerLogo = document.querySelector(
    '#header-component-desktop .header-logo'
  );

  /* ============================================================
     HERO VISIBILITY → HEADER LOGO VISIBILITY
     Hero visible → hide logo
     Hero ends → show logo
     ============================================================ */

  if (heroSection && headerLogo) {
    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          headerLogo.setAttribute('data-hidden-by-hero', '');
        } else {
          headerLogo.removeAttribute('data-hidden-by-hero');
        }
      },
      { threshold: 0.1 }
    );

    heroObserver.observe(heroSection);
  }
});
