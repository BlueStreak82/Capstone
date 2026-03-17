/**
 * GRADES SERVICE
 * Handles grade-related operations
 */

class GradesService {
  /**
   * Get all grades for logged-in user
   */
  async getGrades() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error("Not logged in");

    // Will be replaced with: return await fetch(`/api/users/${user.id}/grades`)
    return await MockData.getGradesByUserId(user.id);
  }

  /**
   * Add a new grade
   * @param {Object} courseData - { name, grade, creditHours, semester }
   */
  async addGrade(courseData) {
    const user = authService.getCurrentUser();
    if (!user) throw new Error("Not logged in");

    return await MockData.addGrade(user.id, courseData);
  }

  /**
   * Calculate GPA/CWA
   * (GPA = Sum of (grade * creditHours) / Sum of creditHours)
   */
  calculateGPA(courses) {
    if (!courses || courses.length === 0) return 0;

    let totalPoints = 0;
    let totalCredits = 0;

    courses.forEach((course) => {
      totalPoints += course.grade * course.creditHours;
      totalCredits += course.creditHours;
    });

    const gpa = totalPoints / totalCredits;
    return parseFloat(gpa.toFixed(2));
  }

  /**
   * Get average grade
   */
  calculateAverageGrade(courses) {
    if (!courses || courses.length === 0) return 0;

    const sum = courses.reduce((acc, course) => acc + course.grade, 0);
    const average = sum / courses.length;
    return parseFloat(average.toFixed(2));
  }

  /**
   * Group courses by semester
   */
  groupBySemester(courses) {
    return courses.reduce((acc, course) => {
      if (!acc[course.semester]) {
        acc[course.semester] = [];
      }
      acc[course.semester].push(course);
      return acc;
    }, {});
  }

  /**
   * Get top performing courses
   */
  getTopCourses(courses, limit = 3) {
    return [...courses].sort((a, b) => b.grade - a.grade).slice(0, limit);
  }

  /**
   * Get courses needing improvement
   */
  getWeakCourses(courses, threshold = 75) {
    return courses.filter((course) => course.grade < threshold);
  }
}

const gradesService = new GradesService();
