const USER_ACTIVITY_KEY_PREFIX = "academic-tracker-activities-";
const USER_CALC_COURSES_KEY_PREFIX = "academic-tracker-calc-courses-";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!authService.isLoggedIn()) {
      window.location.href = "login.html";
      return;
    }

    const user = authService.getCurrentUser();
    const grades = await gradesService.getGrades();
    const sessions = await studyTrackerService.getSessions();

    populateProfile(user, grades);
    populateStats(user, grades, sessions);
    setupNavigation();
    setupAppearanceToggle();
  } catch (error) {
    console.error("Profile page error:", error);
    alert("Error loading profile");
  }
});

function populateProfile(user, grades) {
  setText("profile-name", user?.name || "Student User");
  setText("profile-email", user?.email || "student@example.com");
  setText("profile-university", inferUniversity(user, grades));
}

function populateStats(user, grades, sessions) {
  const activityKey = `${USER_ACTIVITY_KEY_PREFIX}${user?.id || ""}`;
  const activities = JSON.parse(localStorage.getItem(activityKey)) || [];
  const calculatedCourses = getUserCalculatedCourses(user?.id);
  const effectiveCourses = mergeCourseSources(grades, calculatedCourses);
  const totalCoursesTracked = effectiveCourses.length;

  const calculationCount = activities.filter((item) =>
    String(item.text || "")
      .toLowerCase()
      .match(/gpa|cwa/),
  ).length;

  setText("student-id", formatUserId(user));
  setText("member-since", getMemberSince(user));
  setText(
    "courses-tracked",
    `${totalCoursesTracked} ${totalCoursesTracked === 1 ? "Course" : "Courses"}`,
  );
  setText(
    "gpa-calculations",
    `${calculationCount} ${calculationCount === 1 ? "Calculation" : "Calculations"}`,
  );
}

function getUserCalculatedCourses(userId) {
  if (!userId) {
    return [];
  }

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

function mergeCourseSources(baseCourses, calculatedCourses) {
  const bySemester = new Map();

  baseCourses.forEach((course) => {
    const semester = String(course.semester || "Unspecified");
    if (!bySemester.has(semester)) {
      bySemester.set(semester, []);
    }
    bySemester.get(semester).push(course);
  });

  calculatedCourses.forEach((course) => {
    const semester = String(course.semester || "Unspecified");
    if (!bySemester.has(semester)) {
      bySemester.set(semester, []);
    }

    const semesterBucket = bySemester.get(semester) || [];
    const existingIndex = semesterBucket.findIndex(
      (item) =>
        String(item.name).toLowerCase() === String(course.name).toLowerCase(),
    );

    if (existingIndex >= 0) {
      semesterBucket[existingIndex] = course;
    } else {
      semesterBucket.push(course);
    }

    bySemester.set(semester, semesterBucket);
  });

  return Array.from(bySemester.values()).flat();
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

function setupAppearanceToggle() {
  const toggle = document.getElementById("appearance-toggle");
  const themeLabel = document.querySelector(".mode-text");
  const themeText = document.getElementById("appearance-theme-text");
  const themeIcon = document.getElementById("appearance-theme-icon");
  const navToggle = document.getElementById("theme-toggle");

  if (!toggle) return;

  const syncAppearanceState = () => {
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    toggle.setAttribute("aria-checked", String(isDark));
    toggle.classList.toggle("is-on", isDark);

    if (themeLabel) {
      themeLabel.textContent = isDark ? "Dark Mode" : "Light Mode";
    }

    if (themeText) {
      themeText.textContent = isDark
        ? "Dark mode is enabled"
        : "Light mode is enabled";
    }

    if (themeIcon) {
      themeIcon.setAttribute("name", isDark ? "moon-outline" : "sunny-outline");
    }
  };

  syncAppearanceState();

  toggle.addEventListener("click", () => {
    if (navToggle) {
      navToggle.click();
      requestAnimationFrame(syncAppearanceState);
    }
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      requestAnimationFrame(syncAppearanceState);
    });

  window.addEventListener("storage", () => {
    requestAnimationFrame(syncAppearanceState);
  });

  document.addEventListener("click", (event) => {
    if (event.target === navToggle || navToggle?.contains(event.target)) {
      requestAnimationFrame(syncAppearanceState);
    }
  });
}

function formatUserId(user) {
  const numericId = Number(user?.id);
  if (Number.isFinite(numericId) && numericId > 0) {
    return `AT-${String(numericId).padStart(4, "0")}`;
  }

  const emailSeed = String(user?.email || "guest")
    .replace(/[^a-z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 6)
    .padEnd(6, "X");

  return `AT-${emailSeed}`;
}

function getMemberSince(user) {
  const resolvedDate =
    getValidDateString(user?.createdAt) || getStoredMemberSince(user);

  return formatMemberSince(resolvedDate);
}

function getStoredMemberSince(user) {
  const storageKey = buildMemberSinceStorageKey(user);
  const stored = localStorage.getItem(storageKey);
  const validStored = getValidDateString(stored);

  if (validStored) {
    return validStored;
  }

  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(storageKey, today);
  return today;
}

function buildMemberSinceStorageKey(user) {
  const identifier = user?.id || user?.email || "guest";
  return `academic-tracker-member-since-${identifier}`;
}

function getValidDateString(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().split("T")[0];
}

function formatMemberSince(dateString) {
  if (!dateString) return "Unknown";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function inferUniversity(user, grades) {
  if (user?.university) return user.university;
  if (grades.some((course) => course.name.toLowerCase().includes("computer"))) {
    return "KNUST";
  }
  return "Academic Tracker University";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}
