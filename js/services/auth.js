/**
 * AUTHENTICATION SERVICE
 * Handles login, signup, and session management
 */

class AuthService {
  constructor() {
    this.storageKey = "academic-tracker-user";
    this.currentUser = this._loadFromStorage();
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
