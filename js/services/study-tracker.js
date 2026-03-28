/**
 * STUDY TRACKER SERVICE
 * Handles study session tracking
 */

class StudyTrackerService {
  constructor() {
    this.storagePrefix = "academic-tracker-study-sessions-";
  }

  /**
   * Get all study sessions for logged-in user
   */
  async getSessions() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error("Not logged in");

    const stored = this._readStoredSessions(user.id);
    if (stored !== null) {
      return stored;
    }

    const mockSessions = await MockData.getStudySessions(user.id);
    this._writeStoredSessions(user.id, mockSessions);
    return mockSessions;
  }

  /**
   * Add study session
   * @param {Object} sessionData - { courseId, courseName, date, hoursSpent, materials, notes }
   */
  async addSession(sessionData) {
    const user = authService.getCurrentUser();
    if (!user) throw new Error("Not logged in");

    const sessions = await this.getSessions();
    const newSession = {
      id: Math.max(...sessions.map((s) => Number(s.id) || 0), 0) + 1,
      ...sessionData,
    };

    const updated = [...sessions, newSession];
    this._writeStoredSessions(user.id, updated);
    return newSession;
  }

  /**
   * Calculate total study hours
   */
  calculateTotalHours(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    return sessions.reduce((total, session) => total + session.hoursSpent, 0);
  }

  /**
   * Get average study hours per session
   */
  calculateAverageHours(sessions) {
    if (!sessions || sessions.length === 0) return 0;
    const total = this.calculateTotalHours(sessions);
    return parseFloat((total / sessions.length).toFixed(2));
  }

  /**
   * Get study stats by course
   */
  getStudyStatsByCourse(sessions) {
    return sessions.reduce((acc, session) => {
      const courseId = session.courseId;
      if (!acc[courseId]) {
        acc[courseId] = {
          courseId,
          courseName: session.courseName,
          totalHours: 0,
          sessionCount: 0,
        };
      }
      acc[courseId].totalHours += session.hoursSpent;
      acc[courseId].sessionCount += 1;
      return acc;
    }, {});
  }

  /**
   * Get most studied course
   */
  getMostStudiedCourse(sessions) {
    const stats = this.getStudyStatsByCourse(sessions);
    return Object.values(stats).reduce(
      (max, current) => (current.totalHours > max.totalHours ? current : max),
      { totalHours: 0 },
    );
  }

  /**
   * Calculate streak (consecutive days studied)
   */
  calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;

    const sortedDates = sessions
      .map((s) => new Date(s.date))
      .sort((a, b) => b - a);

    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const diff =
        (sortedDates[i - 1] - sortedDates[i]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  _storageKey(userId) {
    return `${this.storagePrefix}${userId}`;
  }

  _readStoredSessions(userId) {
    try {
      const raw = localStorage.getItem(this._storageKey(userId));
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  _writeStoredSessions(userId, sessions) {
    localStorage.setItem(this._storageKey(userId), JSON.stringify(sessions));
  }
}

const studyTrackerService = new StudyTrackerService();
