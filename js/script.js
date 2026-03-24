/**
 * Theme Manager
 * Handles light/dark mode switching and persistence
 */
class ThemeManager {
    constructor() {
        this.theme = this.getSystemTheme();
        this.storageKey = 'theme-preference';
        this.init();
    }

    /**
     * Initialize theme manager
     */
    init() {
        this.loadTheme();
        this.setupEventListeners();
        this.setupSystemThemeListener();
    }

    /**
     * Get user's system preference (light or dark)
     * @returns {string} 'light' or 'dark'
     */
    getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    /**
     * Load theme from localStorage or system preference
     */
    loadTheme() {
        const savedTheme = localStorage.getItem(this.storageKey);
        
        if (savedTheme) {
            this.theme = savedTheme;
        } else {
            this.theme = this.getSystemTheme();
        }

        this.applyTheme();
    }

    applyTheme() {
        const htmlElement = document.documentElement;
        const themeToggle = document.getElementById('theme-toggle');
        const icon = document.querySelector('#theme-toggle ion-icon');

        if (this.theme === 'dark') {
            htmlElement.setAttribute('data-theme', 'dark');
            if (icon) icon.setAttribute('name', 'moon-outline');
            if (themeToggle) themeToggle.setAttribute('aria-pressed', 'true');
        } else {
            htmlElement.removeAttribute('data-theme');
            if (icon) icon.setAttribute('name', 'sunny-outline');
            if (themeToggle) themeToggle.setAttribute('aria-pressed', 'false');
        }

        localStorage.setItem(this.storageKey, this.theme);
    }


    /**
     * Toggle between light and dark theme
     */
    toggleTheme() {
        this.theme = this.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme();
    }

    /**
     * Setup event listeners for theme toggle button
     */
    setupEventListeners() {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });

            // Keyboard support (Enter and Space)
            themeToggle.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.toggleTheme();
                }
            });
        }
    }

    /**
     * Listen for system theme changes
     */
    setupSystemThemeListener() {
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                // Only update if user hasn't manually set a preference
                if (!localStorage.getItem(this.storageKey)) {
                    this.theme = e.matches ? 'dark' : 'light';
                    this.applyTheme();
                }
            });
        }
    }
}

// Toggle Menu
document.addEventListener('DOMContentLoaded', () => {
  const menuIcon = document.getElementById('mobile-menu-icon');
  const navLinks = document.getElementById('nav-links');
  const navBackdrop = document.getElementById('nav-backdrop');

  if (menuIcon && navLinks) {
    const setMenuState = (isOpen) => {
      navLinks.classList.toggle('active', isOpen);
      if (navBackdrop) {
        navBackdrop.classList.toggle('active', isOpen);
        navBackdrop.setAttribute('aria-hidden', String(!isOpen));
      }
      menuIcon.setAttribute('aria-expanded', String(isOpen));
    };

    menuIcon.addEventListener('click', () => {
      const isOpen = !navLinks.classList.contains('active');
      setMenuState(isOpen);
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 912) {
          setMenuState(false);
        }
      });
    });

    if (navBackdrop) {
      navBackdrop.addEventListener('click', () => {
        setMenuState(false);
      });
    }

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 912) {
        setMenuState(false);
      }
    });
  } else {
    console.error("Could not find menu-icon or nav-links IDs in the HTML.");
  }
});

/**
 * Initialize all modules when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme manager
    new ThemeManager();

    console.log('✅ All modules initialized successfully!');
});
