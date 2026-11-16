/**
 * KampusKita Architecture Documentation — Shared JavaScript
 * Handles: Theme, Sidebar, Navigation, Animations, Mermaid, Accessibility
 */

(function() {
  'use strict';

  // ==========================================================================
  // State
  // ==========================================================================
  const state = {
    theme: 'auto',
    sidebarOpen: false,
    currentPage: '',
    reducedMotion: false
  };

  // ==========================================================================
  // DOM Elements (lazy initialization)
  // ==========================================================================
  let elements = {};

  function initElements() {
    elements = {
      html: document.documentElement,
      themeToggle: document.getElementById('themeToggle'),
      sunIcon: document.querySelector('.sun-icon'),
      moonIcon: document.querySelector('.moon-icon'),
      sidebar: document.querySelector('.app-sidebar'),
      sidebarOverlay: document.querySelector('.sidebar-overlay'),
      mobileMenuBtn: document.querySelector('.mobile-menu-btn'),
      mainContent: document.querySelector('.app-main'),
      navLinks: document.querySelectorAll('.nav-link'),
      pageSections: document.querySelectorAll('section[id]'),
      revealElements: document.querySelectorAll('.reveal'),
      accordionTriggers: document.querySelectorAll('.accordion-trigger'),
      tabBtns: document.querySelectorAll('.tab-btn'),
      mermaidElements: document.querySelectorAll('.mermaid')
    };
  }

  // ==========================================================================
  // Theme Management
  // ==========================================================================
  function getPreferredTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const effectiveTheme = theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;

    if (effectiveTheme === 'dark') {
      elements.html.classList.add('dark');
      elements.html.classList.remove('light');
      elements.sunIcon?.classList.add('hidden');
      elements.moonIcon?.classList.remove('hidden');
    } else {
      elements.html.classList.remove('dark');
      elements.html.classList.add('light');
      elements.sunIcon?.classList.remove('hidden');
      elements.moonIcon?.classList.add('hidden');
    }

    state.theme = theme;
    localStorage.setItem('theme', theme);

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: effectiveTheme } }));
  }

  function initTheme() {
    const saved = getPreferredTheme();
    applyTheme(saved);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (state.theme === 'auto') {
        applyTheme('auto');
      }
    });

    elements.themeToggle?.addEventListener('click', () => {
      const themes = ['light', 'dark', 'auto'];
      const currentIndex = themes.indexOf(state.theme);
      const nextTheme = themes[(currentIndex + 1) % themes.length];
      applyTheme(nextTheme);
    });

    // Keyboard shortcut: Ctrl/Cmd + D
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        elements.themeToggle?.click();
      }
    });
  }

  // ==========================================================================
  // Sidebar Management
  // ==========================================================================
  function toggleSidebar(open) {
    if (typeof open === 'boolean') {
      state.sidebarOpen = open;
    } else {
      state.sidebarOpen = !state.sidebarOpen;
    }

    elements.sidebar?.classList.toggle('open', state.sidebarOpen);
    elements.sidebarOverlay?.classList.toggle('visible', state.sidebarOpen);
    document.body.style.overflow = state.sidebarOpen ? 'hidden' : '';
  }

  function initSidebar() {
    elements.mobileMenuBtn?.addEventListener('click', () => toggleSidebar());
    elements.sidebarOverlay?.addEventListener('click', () => toggleSidebar(false));

    // Close sidebar on nav link click (mobile)
    elements.navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) toggleSidebar(false);
      });
    });

    // Close sidebar on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.sidebarOpen) toggleSidebar(false);
    });
  }

  // ==========================================================================
  // Active Navigation Highlighting
  // ==========================================================================
  function updateActiveNav() {
    const scrollPos = window.scrollY + 100;

    elements.pageSections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        elements.navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }

  function initScrollSpy() {
    // Initial check
    updateActiveNav();

    // Throttled scroll listener
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateActiveNav();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ==========================================================================
  // Smooth Scroll for Anchor Links
  // ==========================================================================
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const headerOffset = 80; // header height + padding
          const elementPosition = target.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });

          // Update URL without scrolling
          history.pushState(null, '', targetId);

          // Focus for accessibility
          target.setAttribute('tabindex', '-1');
          target.focus({ preventScroll: true });
        }
      });
    });
  }

  // ==========================================================================
  // Intersection Observer for Reveal Animations
  // ==========================================================================
  function initRevealAnimations() {
    if (state.reducedMotion) {
      elements.revealElements.forEach(el => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    elements.revealElements.forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });
  }

  // ==========================================================================
  // Accordion
  // ==========================================================================
  function initAccordions() {
    elements.accordionTriggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        const expanded = trigger.getAttribute('aria-expanded') === 'true';
        const content = trigger.nextElementSibling;

        trigger.setAttribute('aria-expanded', !expanded);

        if (!expanded) {
          content.style.maxHeight = content.scrollHeight + 'px';
        } else {
          content.style.maxHeight = '0';
        }
      });

      // Keyboard support
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          trigger.click();
        }
      });
    });
  }

  // ==========================================================================
  // Tabs
  // ==========================================================================
  function initTabs() {
    const tabGroups = new Map();

    elements.tabBtns.forEach(btn => {
      const group = btn.closest('.tabs');
      if (!tabGroups.has(group)) tabGroups.set(group, []);
      tabGroups.get(group).push(btn);
    });

    tabGroups.forEach((btns, group) => {
      const panels = group.parentElement?.querySelectorAll('.tab-panel') || [];

      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.getAttribute('data-tab');

          // Update buttons
          btns.forEach(b => b.classList.toggle('active', b === btn));

          // Update panels
          panels.forEach(panel => {
            panel.classList.toggle('active', panel.id === targetId);
          });
        });
      });
    });
  }

  // ==========================================================================
  // Mermaid Diagrams
  // ==========================================================================
  function initMermaid() {
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        themeVariables: {
          primaryColor: '#16a34a',
          primaryTextColor: '#0f172a',
          primaryBorderColor: '#22c55e',
          lineColor: '#64748b',
          secondaryColor: '#f0fdf4',
          tertiaryColor: '#ffffff',
          background: 'transparent',
          mainBkg: 'transparent',
          secondBkg: '#f8fafc',
          tertiaryBkg: '#f1f5f9',
          textColor: '#0f172a',
          nodeBorder: '#22c55e',
          clusterBkg: '#f0fdf4',
          clusterBorder: '#22c55e',
          defaultLinkColor: '#64748b',
          titleColor: '#0f172a',
          edgeLabelBackground: '#f8fafc',
          nodeTextColor: '#0f172a'
        },
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        },
        securityLevel: 'loose'
      });

      // Render all mermaid elements
      elements.mermaidElements.forEach(el => {
        if (!el.dataset.rendered) {
          try {
            mermaid.run({ nodes: [el] });
            el.dataset.rendered = 'true';
          } catch (err) {
            console.warn('Mermaid render failed:', err);
            el.innerHTML = '<pre class="code-block">Diagram render failed. Check console.</pre>';
          }
        }
      });

      // Re-render on theme change
      window.addEventListener('themechange', () => {
        elements.mermaidElements.forEach(el => {
          delete el.dataset.rendered;
          el.innerHTML = '';
        });
        // Re-initialize with new theme variables
        setTimeout(() => initMermaid(), 100);
      });
    }
  }

  // ==========================================================================
  // Reduced Motion Detection
  // ==========================================================================
  function initReducedMotion() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    state.reducedMotion = mediaQuery.matches;

    mediaQuery.addEventListener('change', (e) => {
      state.reducedMotion = e.matches;
      if (e.matches) {
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      }
    });
  }

  // ==========================================================================
  // Copy Code Button (Progressive Enhancement)
  // ==========================================================================
  function initCodeCopy() {
    document.querySelectorAll('.code-block').forEach(block => {
      if (block.querySelector('.copy-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'copy-btn btn-icon';
      btn.setAttribute('aria-label', 'Copy code');
      btn.innerHTML = `
        <svg class="copy-icon" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
        </svg>
        <svg class="check-icon hidden" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
      `;
      btn.style.position = 'absolute';
      btn.style.top = 'var(--space-3)';
      btn.style.right = 'var(--space-3)';
      btn.style.opacity = '0';
      btn.style.transition = 'opacity var(--transition-fast)';

      block.style.position = 'relative';
      block.appendChild(btn);

      block.addEventListener('mouseenter', () => btn.style.opacity = '1');
      block.addEventListener('mouseleave', () => btn.style.opacity = '0');

      btn.addEventListener('click', async () => {
        const code = block.querySelector('code')?.textContent || block.textContent;
        try {
          await navigator.clipboard.writeText(code);
          btn.querySelector('.copy-icon').classList.add('hidden');
          btn.querySelector('.check-icon').classList.remove('hidden');
          setTimeout(() => {
            btn.querySelector('.copy-icon').classList.remove('hidden');
            btn.querySelector('.check-icon').classList.add('hidden');
          }, 2000);
        } catch (err) {
          console.warn('Copy failed:', err);
        }
      });
    });
  }

  // ==========================================================================
  // Print Support
  // ==========================================================================
  function initPrintSupport() {
    // Add print button if not present
    const printBtn = document.querySelector('[data-print]');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }

    // Ensure all content is visible when printing
    window.addEventListener('beforeprint', () => {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      document.querySelectorAll('.accordion-content').forEach(el => el.style.maxHeight = 'none');
      document.querySelectorAll('.tab-panel').forEach(el => el.classList.add('active'));
    });
  }

  // ==========================================================================
  // Initialize All
  // ==========================================================================
  function init() {
    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    initElements();
    initReducedMotion();
    initTheme();
    initSidebar();
    initSmoothScroll();
    initScrollSpy();
    initRevealAnimations();
    initAccordions();
    initTabs();
    initMermaid();
    initCodeCopy();
    initPrintSupport();

    // Mark as initialized
    document.documentElement.dataset.docsInit = 'true';

    console.log('[KampusKita Docs] Initialized');
  }

  // Auto-init
  init();

  // Export for manual init if needed
  window.KampusKitaDocs = {
    init,
    applyTheme,
    toggleSidebar,
    state: () => ({ ...state })
  };
})();