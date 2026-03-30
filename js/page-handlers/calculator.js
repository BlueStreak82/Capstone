const courseRowsContainer = document.getElementById("course-rows");
const addCourseBtn = document.getElementById("add-course-btn");
const calculateBtn = document.getElementById("calculate-btn");
const feedbackEl = document.getElementById("calc-feedback");
const resultTitleEl = document.getElementById("result-title");
const resultValueEl = document.getElementById("result-value");
const resultEmptyEl = document.getElementById("result-empty");
const userNameEl = document.getElementById("calc-user-name");
const semesterSelectEl = document.getElementById("calc-semester");
const yearInputEl = document.getElementById("calc-year");

const USER_CALC_PREF_KEY_PREFIX = "academic-tracker-calc-pref-";
const USER_ACTIVITY_KEY_PREFIX = "academic-tracker-activities-";
const USER_CALC_COURSES_KEY_PREFIX = "academic-tracker-calc-courses-";

document.addEventListener("DOMContentLoaded", initCalculatorPage);

async function initCalculatorPage() {
  if (!authService.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const user = authService.getCurrentUser();
  if (userNameEl) userNameEl.textContent = user.name;
  setDefaultCalculationPeriod();

  setupNavigation();
  setupCalculatorTypeToggle();
  clearFeedback();

  try {
    const [grades, savedCalculatedCourses] = await Promise.all([
      gradesService.getGrades(),
      Promise.resolve(getSavedCalculatedCourses(user.id)),
    ]);

    const sourceCourses =
      savedCalculatedCourses.length > 0 ? savedCalculatedCourses : grades;

    if (sourceCourses.length > 0) {
      const latestSemester = getLatestSemester(sourceCourses);
      const coursesToDisplay = latestSemester
        ? sourceCourses.filter((course) => course.semester === latestSemester)
        : sourceCourses;

      coursesToDisplay.forEach((course) => addCourseRow(course));

      if (latestSemester) {
        applySemesterToInputs(latestSemester);
      }
    } else {
      addCourseRow();
      addCourseRow();
    }
  } catch (error) {
    addCourseRow();
    showFeedback("Could not load courses.", "error");
  }

  addCourseBtn.addEventListener("click", () => addCourseRow());
  calculateBtn.addEventListener("click", calculateResult);
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
}

function setupCalculatorTypeToggle() {
  const typeInputs = document.querySelectorAll('input[name="calc-type"]');
  typeInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const isGpa = getSelectedType() === "gpa";
      toggleCreditFields();
      resultTitleEl.textContent = isGpa ? "Your GPA" : "Your CWA";
    });
  });

  toggleCreditFields();
}

function toggleCreditFields() {
  document.querySelectorAll(".course-credit").forEach((field) => {
    field.disabled = false;
    field.closest("label").classList.remove("is-disabled");
  });
}

function addCourseRow(course = {}) {
  const row = document.createElement("div");
  row.className = "calc-course-row";
  const selectedField =
    normalizeCourseField(course.field) || inferCourseField(course.name);

  row.innerHTML = `
    <label>
      Course
      <input type="text" class="course-name" placeholder="Course name" value="${escapeHtml(course.name || "")}" />
    </label>
    <label>
      Field
      <input
        type="text"
        class="course-field"
        placeholder="e.g., Engineering, Finance, Psychology"
        value="${escapeHtml(selectedField)}"
      />
    </label>
    <label>
      Grade
      <input type="number" class="course-grade" min="0" max="100" step="0.01" placeholder="0-100" value="${course.grade ?? ""}" />
    </label>
    <label>
      Credits
      <input type="number" class="course-credit" min="1" max="6" step="1" value="${course.creditHours ?? 3}" />
    </label>
    <button type="button" class="remove-course" aria-label="Remove course row">
      <ion-icon name="close-outline"></ion-icon>
    </button>
  `;

  row.querySelector(".remove-course").addEventListener("click", () => {
    if (courseRowsContainer.children.length > 1) {
      row.remove();
    }
  });

  courseRowsContainer.appendChild(row);

  toggleCreditFields();
}

function calculateResult() {
  const selectedYear = Number(yearInputEl?.value);
  if (
    !Number.isFinite(selectedYear) ||
    selectedYear < 2000 ||
    selectedYear > 2100
  ) {
    showFeedback("Enter a valid year between 2000 and 2100.", "error");
    yearInputEl?.focus();
    return;
  }

  const rows = Array.from(document.querySelectorAll(".calc-course-row"));

  const parsedCourses = rows
    .map((row, index) => {
      const name = row.querySelector(".course-name").value.trim();
      const typedField = normalizeCourseField(
        row.querySelector(".course-field")?.value,
      );
      const field = typedField || inferCourseField(name);
      const grade = Number(row.querySelector(".course-grade").value);
      const credits = Number(row.querySelector(".course-credit").value);

      if (!field) {
        return {
          error: `Course ${index + 1}: enter a field for this course.`,
        };
      }

      if (!Number.isFinite(grade) || grade < 0 || grade > 100) {
        return {
          error: `Course ${index + 1}: grade must be between 0 and 100.`,
        };
      }

      if (!Number.isFinite(credits) || credits <= 0) {
        return {
          error: `Course ${index + 1}: credits must be greater than 0.`,
        };
      }

      return {
        name: name || `Course ${index + 1}`,
        field,
        grade,
        creditHours: credits,
        semester: getSelectedSemesterLabel(),
      };
    })
    .filter(Boolean);

  const errorCourse = parsedCourses.find((item) => item.error);
  if (errorCourse) {
    showFeedback(errorCourse.error, "error");
    return;
  }

  if (parsedCourses.length === 0) {
    showFeedback("Add at least one course before calculating.", "error");
    return;
  }

  const selectedType = getSelectedType();
  const result =
    selectedType === "gpa"
      ? gradesService.calculateGPA(parsedCourses)
      : calculateCWA(parsedCourses);

  resultTitleEl.textContent = selectedType === "gpa" ? "Your GPA" : "Your CWA";
  resultValueEl.textContent = result.toFixed(2);
  resultEmptyEl.classList.add("hidden");

  saveCalculatedCourses(parsedCourses);
  saveCalculationPreference(selectedType, result);
  logCalculationActivity(selectedType, parsedCourses.length, result);
  showFeedback("Calculation complete.", "success");
}

function calculateCWA(courses) {
  const total = courses.reduce((sum, course) => sum + course.grade, 0);
  return total / courses.length;
}

function getSelectedType() {
  const selected = document.querySelector('input[name="calc-type"]:checked');
  return selected ? selected.value : "cwa";
}

function showFeedback(message, status) {
  if (!feedbackEl) {
    return;
  }

  feedbackEl.textContent = message;
  feedbackEl.classList.remove("error", "success");
  if (status) {
    feedbackEl.classList.add(status);
  }
}

function clearFeedback() {
  showFeedback("", "");
}

function logCalculationActivity(type, courseCount, result) {
  const user = authService.getCurrentUser();
  if (!user) {
    return;
  }

  const key = getActivityStorageKey(user.id);
  const activities = JSON.parse(localStorage.getItem(key)) || [];
  activities.push({
    text: `Calculated ${type.toUpperCase()} for ${courseCount} courses`,
    icon: "calculator-outline",
    time: `Result: ${result.toFixed(2)}`,
  });
  localStorage.setItem(key, JSON.stringify(activities.slice(-20)));
}

function saveCalculationPreference(type, value) {
  const user = authService.getCurrentUser();
  if (!user) {
    return;
  }

  localStorage.setItem(
    getCalculationPreferenceKey(user.id),
    JSON.stringify({
      mode: type,
      value: Number(value.toFixed(2)),
      updatedAt: new Date().toISOString(),
    }),
  );
}

function getCalculationPreferenceKey(userId) {
  return `${USER_CALC_PREF_KEY_PREFIX}${userId}`;
}

function getActivityStorageKey(userId) {
  return `${USER_ACTIVITY_KEY_PREFIX}${userId}`;
}

function saveCalculatedCourses(courses) {
  const user = authService.getCurrentUser();
  if (!user) {
    return;
  }

  const semesterLabel = getSelectedSemesterLabel();
  const existingCourses = getSavedCalculatedCourses(user.id);
  const withoutCurrentSemester = existingCourses.filter(
    (course) => course.semester !== semesterLabel,
  );

  const mergedCourses = [
    ...withoutCurrentSemester,
    ...courses.map((course) => ({
      ...course,
      semester: semesterLabel,
    })),
  ];

  localStorage.setItem(
    `${USER_CALC_COURSES_KEY_PREFIX}${user.id}`,
    JSON.stringify(mergedCourses),
  );
}

function getSavedCalculatedCourses(userId) {
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

function setDefaultCalculationPeriod() {
  const now = new Date();
  const month = now.getMonth();

  const inferredSemester =
    month <= 3 ? "Spring" : month <= 7 ? "Summer" : "Fall";
  if (semesterSelectEl) {
    semesterSelectEl.value = inferredSemester;
  }

  if (yearInputEl) {
    yearInputEl.value = String(now.getFullYear());
  }
}

function getSelectedSemesterLabel() {
  const semester = semesterSelectEl?.value || "Spring";
  const yearRaw = Number(yearInputEl?.value);
  const year = Number.isFinite(yearRaw) ? yearRaw : new Date().getFullYear();
  return `${semester} ${year}`;
}

function getLatestSemester(courses) {
  if (!courses || courses.length === 0) {
    return "";
  }

  const sorted = [...courses].sort((a, b) =>
    compareSemesters(String(a.semester || ""), String(b.semester || "")),
  );
  return sorted[sorted.length - 1]?.semester || "";
}

function applySemesterToInputs(semesterLabel) {
  const match = String(semesterLabel).match(
    /^(Spring|Summer|Fall|Semester\s*1|Semester\s*2)\s+(\d{4})$/i,
  );
  if (!match) {
    return;
  }

  const term = normalizeSemesterTerm(match[1]);
  const year = match[2];

  if (semesterSelectEl) {
    semesterSelectEl.value = term;
  }

  if (yearInputEl) {
    yearInputEl.value = year;
  }
}

function compareSemesters(left, right) {
  const leftParts = parseSemester(left);
  const rightParts = parseSemester(right);

  if (leftParts.year !== rightParts.year) {
    return leftParts.year - rightParts.year;
  }

  return leftParts.rank - rightParts.rank;
}

function parseSemester(value) {
  const match = String(value).match(
    /^(Spring|Summer|Fall|Semester\s*1|Semester\s*2)\s+(\d{4})$/i,
  );
  if (!match) {
    return { year: 0, rank: 0 };
  }

  const term = normalizeSemesterTerm(match[1]).toLowerCase();
  const year = Number(match[2]);
  const rankMap = {
    spring: 1,
    summer: 2,
    fall: 3,
    "semester 1": 4,
    "semester 2": 5,
  };

  return {
    year: Number.isFinite(year) ? year : 0,
    rank: rankMap[term] || 0,
  };
}

function normalizeSemesterTerm(term) {
  const normalized = String(term).trim().toLowerCase().replace(/\s+/g, " ");

  if (normalized === "semester 1" || normalized === "semester1") {
    return "Semester 1";
  }

  if (normalized === "semester 2" || normalized === "semester2") {
    return "Semester 2";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function inferCourseField(courseName) {
  const name = String(courseName || "").toLowerCase();

  if (name.includes("math")) return "Mathematics";
  if (
    name.includes("physics") ||
    name.includes("chemistry") ||
    name.includes("biology")
  ) {
    return "Science";
  }
  if (name.includes("computer") || name.includes("program")) {
    return "Programming";
  }
  if (name.includes("english") || name.includes("literature")) {
    return "Writing";
  }

  return "";
}

function normalizeCourseField(value) {
  const input = String(value || "").trim();
  if (!input) {
    return "";
  }

  return input.replace(/\s+/g, " ");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
