/**
 * DASHBOARD PAGE HANDLER
 * Manages dashboard display and interactions
 */

// Check authentication on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Verify user is logged in
  if (!authService.isLoggedIn()) {
    console.log("Not logged in, redirecting to login page");
    window.location.href = "login.html";
    return;
  }

  // Load dashboard data
  await loadDashboardData();

  // Setup logout button
  setupLogout();
});

/**
 * Load and display dashboard data
 */
async function loadDashboardData() {
  try {
    const user = authService.getCurrentUser();

    // Display user info
    displayUserInfo(user);

    // Load grades
    const grades = await gradesService.getGrades();
    displayGrades(grades);

    // Load study sessions
    const sessions = await studyTrackerService.getSessions();
    displayStudyStats(sessions);
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    showAlert("Error loading dashboard: " + error.message, "error");
  }
}

/**
 * Display user information
 */
function displayUserInfo(user) {
  const userNameEl = document.getElementById("user-name");
  const userEmailEl = document.getElementById("user-email");

  if (userNameEl) userNameEl.textContent = user.name;
  if (userEmailEl) userEmailEl.textContent = user.email;
}

/**
 * Display grades and GPA
 */
function displayGrades(courses) {
  const gradesContainer = document.getElementById("grades-container");
  const gpaEl = document.getElementById("gpa-value");
  const avgGradeEl = document.getElementById("avg-grade-value");
  const coursesCountEl = document.getElementById("courses-count");

  if (!gradesContainer) return;

  // Calculate stats
  const gpa = gradesService.calculateGPA(courses);
  const avgGrade = gradesService.calculateAverageGrade(courses);

  // Update stats
  if (gpaEl) gpaEl.textContent = gpa;
  if (avgGradeEl) avgGradeEl.textContent = avgGrade;
  if (coursesCountEl) coursesCountEl.textContent = courses.length;

  // Display course list
  if (courses.length === 0) {
    gradesContainer.innerHTML =
      '<p class="empty-state">No courses added yet. <a href="#add-course">Add your first course</a></p>';
    return;
  }

  const coursesList = courses
    .map(
      (course) => `
        <div class="course-card">
            <div class="course-header">
                <h3>${course.name}</h3>
                <span class="grade-badge ${getGradeColor(course.grade)}">${course.grade}</span>
            </div>
            <div class="course-details">
                <p><strong>Semester:</strong> ${course.semester}</p>
                <p><strong>Credit Hours:</strong> ${course.creditHours}</p>
            </div>
        </div>
    `,
    )
    .join("");

  gradesContainer.innerHTML = coursesList;
}

/**
 * Display study statistics
 */
function displayStudyStats(sessions) {
  const totalHoursEl = document.getElementById("total-hours");
  const sessionsCountEl = document.getElementById("sessions-count");
  const avgHoursEl = document.getElementById("avg-hours");
  const streakEl = document.getElementById("study-streak");
  const recentSessionsEl = document.getElementById("recent-sessions");

  if (sessions.length === 0) {
    if (totalHoursEl) totalHoursEl.textContent = "0";
    if (sessionsCountEl) sessionsCountEl.textContent = "0";
    if (recentSessionsEl) {
      recentSessionsEl.innerHTML =
        '<p class="empty-state">No study sessions yet. Start tracking!</p>';
    }
    return;
  }

  // Calculate stats
  const totalHours = studyTrackerService.calculateTotalHours(sessions);
  const avgHours = studyTrackerService.calculateAverageHours(sessions);
  const streak = studyTrackerService.calculateStreak(sessions);
  const mostStudied = studyTrackerService.getMostStudiedCourse(sessions);

  // Update stats
  if (totalHoursEl) totalHoursEl.textContent = totalHours;
  if (sessionsCountEl) sessionsCountEl.textContent = sessions.length;
  if (avgHoursEl) avgHoursEl.textContent = avgHours;
  if (streakEl) streakEl.textContent = streak + " days";

  // Display recent sessions
  if (recentSessionsEl) {
    const recentList = sessions
      .slice(0, 5)
      .map(
        (session) => `
            <div class="session-item">
                <div class="session-header">
                    <h4>${session.courseName}</h4>
                    <span class="session-hours">${session.hoursSpent}h</span>
                </div>
                <p class="session-date">${new Date(session.date).toLocaleDateString()}</p>
                ${session.notes ? `<p class="session-notes">${session.notes}</p>` : ""}
            </div>
        `,
      )
      .join("");

    recentSessionsEl.innerHTML = recentList;
  }
}

/**
 * Get color class based on grade
 */
function getGradeColor(grade) {
  if (grade >= 90) return "grade-excellent";
  if (grade >= 80) return "grade-good";
  if (grade >= 70) return "grade-fair";
  return "grade-poor";
}

/**
 * Setup logout functionality
 */
function setupLogout() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Are you sure you want to logout?")) {
        authService.logout();
        window.location.href = "index.html";
      }
    });
  }
}

/**
 * Show alert messages
 */
function showAlert(message, type = "info") {
  const alert = document.createElement("div");
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === "error" ? "#ff6b6b" : "#51cf66"};
        color: white;
        border-radius: 4px;
        z-index: 1000;
    `;

  document.body.appendChild(alert);

  setTimeout(() => {
    alert.remove();
  }, 3000);
}
