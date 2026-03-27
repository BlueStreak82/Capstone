const courseRowsContainer = document.getElementById("course-rows");
const addCourseBtn = document.getElementById("add-course-btn");
const calculateBtn = document.getElementById("calculate-btn");
const feedbackEl = document.getElementById("calc-feedback");
const resultTitleEl = document.getElementById("result-title");
const resultValueEl = document.getElementById("result-value");
const resultEmptyEl = document.getElementById("result-empty");
const userNameEl = document.getElementById("calc-user-name");

document.addEventListener("DOMContentLoaded", initCalculatorPage);

async function initCalculatorPage() {
  if (!authService.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const user = authService.getCurrentUser();
  if (userNameEl) userNameEl.textContent = user.name;

  setupNavigation();
  setupCalculatorTypeToggle();

  try {
    const grades = await gradesService.getGrades();

    if (grades.length > 0) {
      grades.forEach((course) => addCourseRow(course));
    } else {
      addCourseRow();
      addCourseRow();
    }

    showFeedback("Courses loaded from mock data.", "success");
  } catch (error) {
    addCourseRow();
    showFeedback("Could not load courses from mock data.", "error");
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
      toggleCreditFields(isGpa);
      resultTitleEl.textContent = isGpa ? "Your GPA" : "Your CWA";
    });
  });

  toggleCreditFields(false);
}

function toggleCreditFields(showCredits) {
  document.querySelectorAll(".course-credit").forEach((field) => {
    field.disabled = !showCredits;
    field.closest("label").classList.toggle("is-disabled", !showCredits);
  });
}

function addCourseRow(course = {}) {
  const row = document.createElement("div");
  row.className = "calc-course-row";

  row.innerHTML = `
    <label>
      Course
      <input type="text" class="course-name" placeholder="Course name" value="${escapeHtml(course.name || "")}" />
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

  if (getSelectedType() !== "gpa") {
    toggleCreditFields(false);
  }
}

function calculateResult() {
  const rows = Array.from(document.querySelectorAll(".calc-course-row"));

  const parsedCourses = rows
    .map((row, index) => {
      const name = row.querySelector(".course-name").value.trim();
      const grade = Number(row.querySelector(".course-grade").value);
      const credits = Number(row.querySelector(".course-credit").value);

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
        grade,
        creditHours: credits,
        semester: "Current",
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
  feedbackEl.textContent = message;
  feedbackEl.classList.remove("error", "success");
  feedbackEl.classList.add(status);
}

function logCalculationActivity(type, courseCount, result) {
  const activities = JSON.parse(localStorage.getItem("activities")) || [];
  activities.push({
    text: `Calculated ${type.toUpperCase()} for ${courseCount} courses`,
    icon: "calculator-outline",
    time: `Result: ${result.toFixed(2)}`,
  });
  localStorage.setItem("activities", JSON.stringify(activities.slice(-20)));
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
