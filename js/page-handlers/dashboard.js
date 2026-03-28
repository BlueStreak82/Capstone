// =========================
// DASHBOARD INITIALIZATION
// =========================
const USER_ACTIVITY_KEY_PREFIX = "academic-tracker-activities-";
const LEGACY_ACTIVITY_MIGRATION_KEY = "academic-tracker-activities-migrated-v1";
const USER_CALC_PREF_KEY_PREFIX = "academic-tracker-calc-pref-";
const USER_CALC_COURSES_KEY_PREFIX = "academic-tracker-calc-courses-";
const CLEAR_ACTIVITY_DIALOG_ID = "clear-activity-confirm-dialog";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Verify user is logged in
    if (!authService.isLoggedIn()) {
      console.log("Not logged in, redirecting to login page");
      window.location.href = "login.html";
      return;
    }

    // LOAD DATA
    const user = authService.getCurrentUser();
    const grades = await gradesService.getGrades();
    const sessions = await studyTrackerService.getSessions();

    //  DISPLAY
    displayUser(user);
    displayStats(user, grades, sessions);
    migrateLegacyActivities(user.id);

    //  NAVIGATION
    setupNavigation();
    setupClearActivityAction();
    // recent activities
    loadRecentActivities();
  } catch (error) {
    console.error("Dashboard error:", error);
    alert("Error loading dashboard");
  }
});

// ==========================
// DISPLAY USER
// ==========================

function displayUser(user) {
  const userNameEl = document.getElementById("user-name");
  const userEmailEl = document.getElementById("user-email");

  if (userNameEl) userNameEl.textContent = user.name;
  if (userEmailEl) userEmailEl.textContent = user.email;
}

// ==========================
// DISPLAY STATS
// ==========================
function displayStats(user, grades, sessions) {
  const pref = getCalculationPreference(user.id);
  const calcMode = pref?.mode === "cwa" ? "cwa" : "gpa";
  const calculatedCourses = getUserCalculatedCourses(user.id);
  const effectiveGrades =
    calculatedCourses.length > 0 ? calculatedCourses : grades;

  const metricValue =
    effectiveGrades.length > 0
      ? calcMode === "cwa"
        ? calculateCwa(effectiveGrades)
        : gradesService.calculateGPA(effectiveGrades)
      : Number(pref?.value || 0);

  const metricLabel = document.getElementById("current-metric-label");
  const metricValueEl = document.getElementById("gpa-value");
  const metricNote = document.getElementById("current-metric-note");

  if (metricLabel) {
    metricLabel.textContent =
      calcMode === "cwa" ? "Current CWA" : "Current GPA";
  }

  if (metricValueEl) {
    metricValueEl.textContent = Number(metricValue).toFixed(2);
  }

  if (metricNote) {
    metricNote.textContent = pref?.updatedAt
      ? `Updated ${formatRelativeDate(pref.updatedAt)}`
      : "Latest calculated value";
  }

  // Study Hours
  const totalHours = studyTrackerService.calculateTotalHours(sessions);
  document.getElementById("total-hours").textContent = totalHours + "h";

  // Sessions
  document.getElementById("sessions-count").textContent =
    sessions.length + "/10";
}

// ==========================
// NAVIGATION ONLY
// ==========================
function setupNavigation() {
  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const confirmed = await authService.confirmLogout();
      if (confirmed) {
        authService.logout();
        window.location.href = "index.html";
      }
    });
  }

  // Profile
  const profileIcon = document.querySelector(".nav-right ion-icon");
  profileIcon?.addEventListener("click", () => {
    window.location.href = "profile.html";
  });

  // Nav links
  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      const text = link.textContent.toLowerCase();

      if (text.includes("dashboard")) return;
      if (text.includes("calculator")) window.location.href = "calculator.html";
      if (text.includes("performance"))
        window.location.href = "performance.html";
      if (text.includes("study")) window.location.href = "study.html";
    });
  });
}

// ==========================
// LOAD RECENT ACTIVITIES
// ==========================
function loadRecentActivities() {
  const container = document.querySelector(".activity-list");
  const user = authService.getCurrentUser();

  if (!container || !user) return;

  const activities =
    JSON.parse(localStorage.getItem(getActivityStorageKey(user.id))) || [];

  if (activities.length === 0) {
    container.innerHTML = '<p class="empty-activity">No recent activity</p>';
    return;
  }

  container.innerHTML = "";

  activities
    .slice(-5)
    .reverse()
    .forEach((act) => {
      const item = document.createElement("div");
      item.classList.add("activity-item");

      item.innerHTML = `
      <div class="activity-icon">
        <ion-icon name="${act.icon || "time-outline"}"></ion-icon>
      </div>
      <div>
        <p>${act.text}</p>
        <span>${act.time}</span>
      </div>
    `;

      container.appendChild(item);
    });
}

function setupClearActivityAction() {
  const clearBtn = document.getElementById("clear-activity-btn");
  const user = authService.getCurrentUser();

  if (!clearBtn || !user) {
    return;
  }

  clearBtn.addEventListener("click", async () => {
    const confirmed = await confirmClearActivity();
    if (!confirmed) {
      return;
    }

    localStorage.removeItem(getActivityStorageKey(user.id));
    loadRecentActivities();
  });
}

function confirmClearActivity() {
  const existingDialog = document.getElementById(CLEAR_ACTIVITY_DIALOG_ID);
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
    modal.id = CLEAR_ACTIVITY_DIALOG_ID;
    modal.className = "logout-modal";
    modal.innerHTML = `
      <div class="logout-modal-backdrop" data-clear-activity-action="cancel"></div>
      <div
        class="logout-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-activity-title"
        aria-describedby="clear-activity-message"
      >
        <h3 id="clear-activity-title">Clear Recent Activity?</h3>
        <p id="clear-activity-message">This will remove all recent activity entries for your current account.</p>
        <div class="logout-modal-actions">
          <button type="button" class="btn-secondary" data-clear-activity-action="cancel">Cancel</button>
          <button type="button" class="btn-primary" data-clear-activity-action="confirm">Clear Activity</button>
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
      }
    };

    modal.addEventListener("click", (event) => {
      const actionElement = event.target.closest(
        "[data-clear-activity-action]",
      );
      if (!actionElement) {
        return;
      }

      const action = actionElement.getAttribute("data-clear-activity-action");
      cleanup(action === "confirm");
    });

    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";

    const cancelButton = modal.querySelector(
      '[data-clear-activity-action="cancel"]',
    );
    if (cancelButton instanceof HTMLElement) {
      cancelButton.focus();
    }

    document.addEventListener("keydown", handleKeydown);
  });
}

function addActivity(text, icon = "time-outline") {
  const user = authService.getCurrentUser();
  if (!user) {
    return;
  }

  const key = getActivityStorageKey(user.id);
  const activities = JSON.parse(localStorage.getItem(key)) || [];

  activities.push({
    text,
    icon,
    time: new Date().toLocaleString(),
  });

  localStorage.setItem(key, JSON.stringify(activities));
}

function getActivityStorageKey(userId) {
  return `${USER_ACTIVITY_KEY_PREFIX}${userId}`;
}

function migrateLegacyActivities(userId) {
  void userId;

  if (localStorage.getItem(LEGACY_ACTIVITY_MIGRATION_KEY) === "true") {
    return;
  }

  const legacyRaw = localStorage.getItem("activities");
  if (!legacyRaw) {
    localStorage.setItem(LEGACY_ACTIVITY_MIGRATION_KEY, "true");
    return;
  }

  localStorage.removeItem("activities");
  localStorage.setItem(LEGACY_ACTIVITY_MIGRATION_KEY, "true");
}

function getCalculationPreference(userId) {
  try {
    const raw = localStorage.getItem(`${USER_CALC_PREF_KEY_PREFIX}${userId}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    return null;
  }
}

function getUserCalculatedCourses(userId) {
  try {
    const raw = localStorage.getItem(
      `${USER_CALC_COURSES_KEY_PREFIX}${userId}`,
    );
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function calculateCwa(courses) {
  if (!courses || courses.length === 0) {
    return 0;
  }

  const total = courses.reduce(
    (sum, course) => sum + Number(course.grade || 0),
    0,
  );
  return total / courses.length;
}

function formatRelativeDate(isoDate) {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) {
    return "recently";
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}
