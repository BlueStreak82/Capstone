const studyState = {
  user: null,
  grades: [],
  sessions: [],
  readings: [],
  goals: {
    hoursGoal: 40,
    readingsGoal: 5,
  },
};

const DEFAULT_HOURS_GOAL = 40;
const DEFAULT_READINGS_GOAL = 5;
const LEGACY_SEED_CLEAR_FLAG = "academic-tracker-legacy-seed-cleared-v1";
const USER_WEEKLY_GOALS_KEY_PREFIX = "academic-tracker-weekly-goals-";

document.addEventListener("DOMContentLoaded", initStudyPage);

async function initStudyPage() {
  if (!authService.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  studyState.user = authService.getCurrentUser();
  studyState.goals = loadWeeklyGoals(studyState.user.id);

  setupNavigation();
  setupTabs();
  setupReadingActions();
  setupAddReadingModal();
  setupWeeklyGoalsSection();

  try {
    const [grades, sessions] = await Promise.all([
      gradesService.getGrades(),
      studyTrackerService.getSessions(),
    ]);

    studyState.grades = grades;
    studyState.sessions = sessions;

    clearLegacySeededReadings(studyState.user.id);
    studyState.readings = loadReadings(studyState.user.id, grades, sessions);

    renderAll();
  } catch (error) {
    console.error("Study tracker load error:", error);
    alert("Could not load study tracker data.");
  }
}

function clearLegacySeededReadings(userId) {
  // Keep this migration narrow: only clear the old seeded data account once.
  if (userId !== 3) {
    return;
  }

  if (localStorage.getItem(LEGACY_SEED_CLEAR_FLAG) === "true") {
    return;
  }

  localStorage.removeItem(getReadingsStorageKey(userId));
  localStorage.setItem(LEGACY_SEED_CLEAR_FLAG, "true");
}

function setupNavigation() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      const confirmed = await authService.confirmLogout();
      if (confirmed) {
        authService.logout();
        window.location.href = "index.html";
      }
    });
  }

  const profileLink = document.getElementById("profile-link");
  if (profileLink) {
    profileLink.addEventListener("click", (event) => {
      event.preventDefault();
      alert("Profile page is not available yet.");
    });
  }
}

function setupTabs() {
  const tabReadings = document.getElementById("tab-readings");
  const tabSessions = document.getElementById("tab-sessions");
  const panelReadings = document.getElementById("panel-readings");
  const panelSessions = document.getElementById("panel-sessions");

  if (!tabReadings || !tabSessions || !panelReadings || !panelSessions) {
    return;
  }

  tabReadings.addEventListener("click", () => {
    tabReadings.classList.add("active");
    tabSessions.classList.remove("active");
    panelReadings.hidden = false;
    panelSessions.hidden = true;
  });

  tabSessions.addEventListener("click", () => {
    tabSessions.classList.add("active");
    tabReadings.classList.remove("active");
    panelSessions.hidden = false;
    panelReadings.hidden = true;
  });
}

function setupReadingActions() {
  const readingList = document.getElementById("reading-list");

  if (!readingList) {
    return;
  }

  readingList.addEventListener("click", async (event) => {
    const completeButton = event.target.closest(".mark-complete-btn");
    if (completeButton) {
      const itemId = Number(completeButton.dataset.id);
      markReadingComplete(itemId);
      return;
    }

    const updateButton = event.target.closest(".update-progress-btn");
    if (updateButton) {
      const itemId = Number(updateButton.dataset.id);
      const input = readingList.querySelector(
        `.progress-input[data-id="${itemId}"]`,
      );

      if (!input) {
        return;
      }

      updateReadingProgress(itemId, Number(input.value));
      return;
    }

    const logTimeButton = event.target.closest(".log-session-btn");
    if (logTimeButton) {
      const itemId = Number(logTimeButton.dataset.id);
      const input = readingList.querySelector(
        `.session-time-input[data-id="${itemId}"]`,
      );

      if (!input) {
        return;
      }

      const minutes = Number(input.value);
      await logStudyTime(itemId, minutes, input);
    }
  });
}

async function logStudyTime(itemId, minutes, inputElement) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    alert("Enter a valid study time in minutes.");
    inputElement?.focus();
    return;
  }

  const reading = studyState.readings.find((item) => item.id === itemId);
  if (!reading) {
    return;
  }

  const course = studyState.grades.find(
    (grade) => grade.name === reading.subject,
  );
  const sessionData = {
    courseId: course?.id || reading.id,
    courseName: course?.name || reading.subject || "General Study",
    date: new Date().toISOString().split("T")[0],
    hoursSpent: parseFloat((minutes / 60).toFixed(2)),
    materials: [reading.title],
    notes: reading.notes || "Study time logged from reading tracker.",
  };

  try {
    const createdSession = await studyTrackerService.addSession(sessionData);
    studyState.sessions.unshift(createdSession);
    inputElement.value = "30";
    renderAll();
  } catch (error) {
    console.error("Failed to log study time:", error);
    alert("Could not save study time. Please try again.");
  }
}

function setupAddReadingModal() {
  const addReadingBtn = document.getElementById("add-reading-btn");
  const modal = document.getElementById("add-reading-modal");
  const closeModalBtn = document.getElementById("close-reading-modal");
  const cancelModalBtn = document.getElementById("cancel-reading-modal");
  const modalForm = document.getElementById("add-reading-form");

  if (!addReadingBtn || !modal || !modalForm) {
    return;
  }

  addReadingBtn.addEventListener("click", () => {
    openAddReadingModal();
  });

  closeModalBtn?.addEventListener("click", closeAddReadingModal);
  cancelModalBtn?.addEventListener("click", closeAddReadingModal);

  modal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal]")) {
      closeAddReadingModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeAddReadingModal();
    }
  });

  modalForm.addEventListener("submit", handleAddReadingSubmit);
}

function setupWeeklyGoalsSection() {
  const goalsForm = document.getElementById("weekly-goals-form");
  const resetButton = document.getElementById("reset-goals-btn");

  if (!goalsForm) {
    return;
  }

  syncGoalsInputs();

  goalsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveWeeklyGoalsFromInputs();
  });

  resetButton?.addEventListener("click", () => {
    studyState.goals = {
      hoursGoal: DEFAULT_HOURS_GOAL,
      readingsGoal: DEFAULT_READINGS_GOAL,
    };

    persistWeeklyGoals();
    syncGoalsInputs();
    renderGoals();
    setWeeklyGoalsFeedback("Weekly goals reset to defaults.", "success");
  });
}

function saveWeeklyGoalsFromInputs() {
  const hoursInput = document.getElementById("goal-hours-target-input");
  const readingsInput = document.getElementById("goal-readings-target-input");

  const hoursGoal = Number(hoursInput?.value);
  const readingsGoal = Number(readingsInput?.value);

  if (!Number.isFinite(hoursGoal) || hoursGoal < 1 || hoursGoal > 120) {
    setWeeklyGoalsFeedback("Hours goal must be between 1 and 120.", "error");
    hoursInput?.focus();
    return;
  }

  if (!Number.isFinite(readingsGoal) || readingsGoal < 1 || readingsGoal > 60) {
    setWeeklyGoalsFeedback("Readings goal must be between 1 and 60.", "error");
    readingsInput?.focus();
    return;
  }

  studyState.goals = {
    hoursGoal: Math.round(hoursGoal),
    readingsGoal: Math.round(readingsGoal),
  };

  persistWeeklyGoals();
  renderGoals();
  setWeeklyGoalsFeedback("Weekly goals updated.", "success");
}

function syncGoalsInputs() {
  const hoursInput = document.getElementById("goal-hours-target-input");
  const readingsInput = document.getElementById("goal-readings-target-input");

  if (hoursInput) {
    hoursInput.value = String(studyState.goals.hoursGoal);
  }

  if (readingsInput) {
    readingsInput.value = String(studyState.goals.readingsGoal);
  }
}

function setWeeklyGoalsFeedback(message, tone = "") {
  const feedback = document.getElementById("weekly-goals-feedback");
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.classList.remove("error", "success");
  if (tone) {
    feedback.classList.add(tone);
  }
}

function openAddReadingModal() {
  const modal = document.getElementById("add-reading-modal");
  const modalForm = document.getElementById("add-reading-form");
  const titleInput = document.getElementById("reading-title");

  if (!modal || !modalForm) {
    return;
  }

  modal.hidden = false;
  document.body.style.overflow = "hidden";
  modalForm.reset();
  setAddReadingFeedback("");

  const subjectInput = document.getElementById("reading-subject");
  if (subjectInput && studyState.grades.length > 0) {
    subjectInput.value = studyState.grades[0].name;
  }

  const sourceInput = document.getElementById("reading-source");
  if (sourceInput) {
    sourceInput.value = sourceInput.value || "Textbook";
  }

  titleInput?.focus();
}

function closeAddReadingModal() {
  const modal = document.getElementById("add-reading-modal");
  if (!modal) {
    return;
  }

  modal.hidden = true;
  document.body.style.overflow = "";
  setAddReadingFeedback("");
}

function handleAddReadingSubmit(event) {
  event.preventDefault();

  const titleInput = document.getElementById("reading-title");
  const subjectInput = document.getElementById("reading-subject");
  const sourceInput = document.getElementById("reading-source");
  const pagesInput = document.getElementById("reading-pages");
  const notesInput = document.getElementById("reading-notes");

  const title = titleInput?.value.trim() || "";
  const subject = subjectInput?.value.trim() || "";
  const source = sourceInput?.value.trim() || "Textbook";
  const totalPages = Number(pagesInput?.value);
  const notes = notesInput?.value.trim() || "";

  if (!title) {
    setAddReadingFeedback("Please enter a reading title.", "error");
    titleInput?.focus();
    return;
  }

  if (!subject) {
    setAddReadingFeedback("Please enter a subject.", "error");
    subjectInput?.focus();
    return;
  }

  if (!Number.isFinite(totalPages) || totalPages <= 0) {
    setAddReadingFeedback("Please enter a valid total page count.", "error");
    pagesInput?.focus();
    return;
  }

  const newItem = {
    id: Date.now(),
    title,
    subject,
    source,
    currentPages: 0,
    totalPages: Math.round(totalPages),
    notes,
    status: "not-started",
  };

  studyState.readings.unshift(newItem);
  persistReadings();
  renderAll();
  closeAddReadingModal();
}

function setAddReadingFeedback(message, tone = "") {
  const feedbackElement = document.getElementById("add-reading-feedback");
  if (!feedbackElement) {
    return;
  }

  feedbackElement.textContent = message;
  feedbackElement.classList.remove("error", "success");
  if (tone) {
    feedbackElement.classList.add(tone);
  }
}

function markReadingComplete(itemId) {
  const item = studyState.readings.find((reading) => reading.id === itemId);
  if (!item) {
    return;
  }

  item.currentPages = item.totalPages;
  item.status = "completed";
  persistReadings();
  renderAll();
}

function updateReadingProgress(itemId, currentPages) {
  if (!Number.isFinite(currentPages) || currentPages < 0) {
    return;
  }

  const item = studyState.readings.find((reading) => reading.id === itemId);
  if (!item) {
    return;
  }

  const boundedPages = Math.min(Math.round(currentPages), item.totalPages);
  item.currentPages = boundedPages;

  if (boundedPages === 0) {
    item.status = "not-started";
  } else if (boundedPages >= item.totalPages) {
    item.status = "completed";
  } else {
    item.status = "in-progress";
  }

  persistReadings();
  renderAll();
}

function renderAll() {
  renderSummary();
  renderReadings();
  renderSessions();
  renderGoals();
}

function renderSummary() {
  const totalReadings = studyState.readings.length;
  const completed = studyState.readings.filter(
    (item) => item.status === "completed",
  ).length;
  const inProgress = studyState.readings.filter(
    (item) => item.status === "in-progress",
  ).length;
  const totalHours = studyTrackerService.calculateTotalHours(
    studyState.sessions,
  );

  setText("stat-total-readings", totalReadings);
  setText("stat-completed", completed);
  setText("stat-in-progress", inProgress);
  setText("stat-study-hours", `${formatHours(totalHours)}h`);
}

function renderReadings() {
  const container = document.getElementById("reading-list");
  if (!container) {
    return;
  }

  if (studyState.readings.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No reading materials yet. Click Add Reading to start.</div>';
    return;
  }

  container.innerHTML = studyState.readings
    .map((item) => {
      const progress =
        item.totalPages > 0 ? (item.currentPages / item.totalPages) * 100 : 0;
      const statusLabel = formatStatusLabel(item.status);
      const statusClass = `status-${item.status}`;

      return `
        <article class="reading-item">
          <div class="reading-row">
            <div>
              <h4>${escapeHtml(item.title)}</h4>
              <p class="item-meta">${escapeHtml(item.subject)} • ${escapeHtml(item.source)}</p>
            </div>
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </div>

          <div class="progress-wrap">
            <div class="progress-label">
              <span>Progress</span>
              <span>${item.currentPages} / ${item.totalPages} pages</span>
            </div>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
            </div>
          </div>

          <div class="reading-actions">
            <div class="reading-action-group">
              <input
                class="progress-input"
                data-id="${item.id}"
                type="number"
                min="0"
                max="${item.totalPages}"
                value="${item.currentPages}"
                aria-label="Update pages read"
              />
              <button class="update-progress-btn" data-id="${item.id}" type="button">
                Update Pages
              </button>
              <button class="mark-complete-btn" data-id="${item.id}" type="button">
                Mark Complete
              </button>
            </div>

            <div class="reading-action-group">
              <input
                class="session-time-input"
                data-id="${item.id}"
                type="number"
                min="1"
                step="1"
                value="30"
                aria-label="Add study time in minutes"
              />
              <button class="log-session-btn" data-id="${item.id}" type="button">
                Log Time (min)
              </button>
            </div>
          </div>

          ${item.notes ? `<p class="item-meta">Notes: ${escapeHtml(item.notes)}</p>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderSessions() {
  const container = document.getElementById("sessions-list");
  if (!container) {
    return;
  }

  if (studyState.sessions.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No study sessions yet. Add a session from your workflow pages.</div>';
    return;
  }

  const sortedSessions = [...studyState.sessions].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  container.innerHTML = sortedSessions
    .slice(0, 6)
    .map((session) => {
      const mainMaterial =
        Array.isArray(session.materials) && session.materials.length > 0
          ? session.materials[0]
          : "Study session";
      const minutes = Math.round(Number(session.hoursSpent || 0) * 60);

      return `
        <article class="session-item">
          <div class="session-row">
            <span class="session-icon">
              <ion-icon name="time-outline"></ion-icon>
            </span>
            <div>
              <h4>${escapeHtml(mainMaterial)}</h4>
              <p class="item-meta">${escapeHtml(session.courseName)} • ${minutes} minutes</p>
            </div>
          </div>
          <p class="session-date">${formatDate(session.date)}</p>
        </article>
      `;
    })
    .join("");
}

function renderGoals() {
  const totalHours = studyTrackerService.calculateTotalHours(
    studyState.sessions,
  );
  const completedReadings = studyState.readings.filter(
    (item) => item.status === "completed",
  ).length;

  const hoursGoal = Math.max(Number(studyState.goals.hoursGoal) || 0, 1);
  const readingsGoal = Math.max(Number(studyState.goals.readingsGoal) || 0, 1);

  const hoursProgress = Math.min((totalHours / hoursGoal) * 100, 100);
  const readingProgress = Math.min(
    (completedReadings / readingsGoal) * 100,
    100,
  );

  setText(
    "goal-hours-value",
    `${formatHours(totalHours)} / ${hoursGoal} hours`,
  );
  setText(
    "goal-readings-value",
    `${completedReadings} / ${readingsGoal} readings`,
  );

  const hoursFill = document.getElementById("goal-hours-progress");
  const readingsFill = document.getElementById("goal-readings-progress");

  if (hoursFill) {
    hoursFill.style.width = `${hoursProgress}%`;
  }

  if (readingsFill) {
    readingsFill.style.width = `${readingProgress}%`;
  }
}

function loadReadings(userId, grades, sessions) {
  const storageKey = getReadingsStorageKey(userId);

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Failed to parse saved readings:", error);
  }

  const seeded = createReadingsFromMockData(grades, sessions);
  localStorage.setItem(storageKey, JSON.stringify(seeded));
  return seeded;
}

function createReadingsFromMockData(grades, sessions) {
  const materialBased = [];
  const seenTitles = new Set();

  sessions.forEach((session, index) => {
    const title =
      Array.isArray(session.materials) && session.materials.length > 0
        ? session.materials[0]
        : `${session.courseName} Reading`;

    if (seenTitles.has(title)) {
      return;
    }

    seenTitles.add(title);

    const estimatedTotal = Math.max(Math.round(session.hoursSpent * 18), 20);
    const currentPages = Math.min(
      Math.round(session.hoursSpent * 12),
      estimatedTotal,
    );
    const status =
      currentPages === 0
        ? "not-started"
        : currentPages >= estimatedTotal
          ? "completed"
          : "in-progress";

    materialBased.push({
      id: Number(`${Date.now()}${index}`),
      title,
      subject: session.courseName,
      source: "Textbook",
      currentPages,
      totalPages: estimatedTotal,
      notes: session.notes || "",
      status,
    });
  });

  if (materialBased.length > 0) {
    return materialBased;
  }

  return grades.slice(0, 3).map((course, index) => ({
    id: Number(`${Date.now()}${index}`),
    title: `${course.name} Core Reading`,
    subject: course.name,
    source: "Course Material",
    currentPages: 0,
    totalPages: 40,
    notes: "",
    status: "not-started",
  }));
}

function persistReadings() {
  if (!studyState.user) {
    return;
  }

  localStorage.setItem(
    getReadingsStorageKey(studyState.user.id),
    JSON.stringify(studyState.readings),
  );
}

function getReadingsStorageKey(userId) {
  return `academic-tracker-readings-${userId}`;
}

function loadWeeklyGoals(userId) {
  const defaults = {
    hoursGoal: DEFAULT_HOURS_GOAL,
    readingsGoal: DEFAULT_READINGS_GOAL,
  };

  try {
    const raw = localStorage.getItem(getWeeklyGoalsStorageKey(userId));
    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw);
    const hoursGoal = Number(parsed?.hoursGoal);
    const readingsGoal = Number(parsed?.readingsGoal);

    return {
      hoursGoal:
        Number.isFinite(hoursGoal) && hoursGoal >= 1 && hoursGoal <= 120
          ? Math.round(hoursGoal)
          : DEFAULT_HOURS_GOAL,
      readingsGoal:
        Number.isFinite(readingsGoal) && readingsGoal >= 1 && readingsGoal <= 60
          ? Math.round(readingsGoal)
          : DEFAULT_READINGS_GOAL,
    };
  } catch (error) {
    return defaults;
  }
}

function persistWeeklyGoals() {
  if (!studyState.user) {
    return;
  }

  localStorage.setItem(
    getWeeklyGoalsStorageKey(studyState.user.id),
    JSON.stringify(studyState.goals),
  );
}

function getWeeklyGoalsStorageKey(userId) {
  return `${USER_WEEKLY_GOALS_KEY_PREFIX}${userId}`;
}

function formatStatusLabel(status) {
  if (status === "completed") {
    return "Completed";
  }

  if (status === "in-progress") {
    return "In Progress";
  }

  return "Not Started";
}

function formatDate(rawDate) {
  if (!rawDate) {
    return "--";
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function formatHours(hours) {
  if (!Number.isFinite(hours)) {
    return "0";
  }

  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value);
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
