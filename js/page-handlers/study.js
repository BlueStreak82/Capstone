const studyState = {
  user: null,
  grades: [],
  sessions: [],
  readings: [],
};

const HOURS_GOAL = 40;
const READINGS_GOAL = 5;

document.addEventListener("DOMContentLoaded", initStudyPage);

async function initStudyPage() {
  if (!authService.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  studyState.user = authService.getCurrentUser();

  setupNavigation();
  setupTabs();
  setupReadingActions();
  setupAddReadingModal();

  try {
    const [grades, sessions] = await Promise.all([
      gradesService.getGrades(),
      studyTrackerService.getSessions(),
    ]);

    studyState.grades = grades;
    studyState.sessions = sessions;
    studyState.readings = loadReadings(studyState.user.id, grades, sessions);

    renderAll();
  } catch (error) {
    console.error("Study tracker load error:", error);
    alert("Could not load study tracker data.");
  }
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

  readingList.addEventListener("click", (event) => {
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
    }
  });
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
              Update
            </button>
            <button class="mark-complete-btn" data-id="${item.id}" type="button">
              Mark Complete
            </button>
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

  const hoursProgress = Math.min((totalHours / HOURS_GOAL) * 100, 100);
  const readingProgress = Math.min(
    (completedReadings / READINGS_GOAL) * 100,
    100,
  );

  setText(
    "goal-hours-value",
    `${formatHours(totalHours)} / ${HOURS_GOAL} hours`,
  );
  setText(
    "goal-readings-value",
    `${completedReadings} / ${READINGS_GOAL} readings`,
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
