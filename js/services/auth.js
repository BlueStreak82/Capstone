/**
 * AUTHENTICATION SERVICE
 * Handles login, signup, and session management
 */

class AuthService {
  constructor() {
    this.storageKey = "academic-tracker-user";
    this.currentUser = this._loadFromStorage();
    this.logoutDialogId = "logout-confirm-dialog";
  }

  /**
   * Login user
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User object
   */
  async login(email, password) {
    try {
      // For now using MockData, will be replaced with:
      // const response = await fetch('/api/auth/login', {...})
      const user = await MockData.loginUser(email, password);

      this.currentUser = user;
      this._saveToStorage(user);

      return user;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Register new user
   * @param {string} email
   * @param {string} password
   * @param {string} name
   * @returns {Promise<Object>} User object
   */
  async signup(email, password, name) {
    try {
      // For now using MockData, will be replaced with:
      // const response = await fetch('/api/auth/signup', {...})
      const user = await MockData.registerUser(email, password, name);

      this.currentUser = user;
      this._saveToStorage(user);

      return user;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  /**
   * Logout user
   */
  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Show a custom logout confirmation dialog
   * @returns {Promise<boolean>} true when user confirms
   */
  confirmLogout() {
    if (typeof document === "undefined") {
      return Promise.resolve(false);
    }

    const existingDialog = document.getElementById(this.logoutDialogId);
    if (existingDialog) {
      existingDialog.remove();
    }

    return new Promise((resolve) => {
      const previouslyFocused =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const previousOverflow = document.body.style.overflow;

      const modal = document.createElement("div");
      modal.id = this.logoutDialogId;
      modal.className = "logout-modal";
      modal.innerHTML = `
        <div class="logout-modal-backdrop" data-logout-action="cancel"></div>
        <div
          class="logout-modal-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
          aria-describedby="logout-modal-message"
        >
          <h3 id="logout-modal-title">Log out?</h3>
          <p id="logout-modal-message">Are you sure you want to log out of your account?</p>
          <div class="logout-modal-actions">
            <button type="button" class="btn-secondary" data-logout-action="cancel">Cancel</button>
            <button type="button" class="btn-primary" data-logout-action="confirm">Log out</button>
          </div>
        </div>
      `;

      const cleanup = (didConfirm) => {
        document.removeEventListener("keydown", handleKeydown);
        modal.remove();
        document.body.style.overflow = previousOverflow;
        if (previouslyFocused) {
          previouslyFocused.focus();
        }
        resolve(didConfirm);
      };

      const handleKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cleanup(false);
          return;
        }

        if (event.key !== "Tab") {
          return;
        }

        const focusableElements = Array.from(
          modal.querySelectorAll(
            'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
          ),
        );

        if (focusableElements.length === 0) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      };

      modal.addEventListener("click", (event) => {
        const actionElement = event.target.closest("[data-logout-action]");
        if (!actionElement) {
          return;
        }

        const action = actionElement.getAttribute("data-logout-action");
        cleanup(action === "confirm");
      });

      document.body.appendChild(modal);
      document.body.style.overflow = "hidden";

      const cancelButton = modal.querySelector('[data-logout-action="cancel"]');
      if (cancelButton instanceof HTMLElement) {
        cancelButton.focus();
      }

      document.addEventListener("keydown", handleKeydown);
    });
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn() {
    return this.currentUser !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Save to browser storage
   */
  _saveToStorage(user) {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
  }

  /**
   * Load from browser storage
   */
  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }
}

// Create global instance
const authService = new AuthService();
