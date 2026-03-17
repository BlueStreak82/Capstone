/**
 * STUDY TRACKER SERVICE
 * Handles study session tracking
 */

class StudyTrackerService {
  /**
   * Get all study sessions for logged-in user
   */
  async getSessions() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error("Not logged in");

    return await MockData.getStudySessions(user.id);
  }

  /**
   * Add study session
   * @param {Object} sessionData - { courseId, courseName, date, hoursSpent, materials, notes }
   */
  async addSession(sessionData) {
    const user = authService.getCurrentUser();
    if (!user) throw new Error("Not logged in");

    return await MockData.addStudySession(user.id, sessionData);
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
}

const studyTrackerService = new StudyTrackerService();
