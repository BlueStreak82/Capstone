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
  const activities = JSON.parse(localStorage.getItem("activities")) || [];
  const calculationCount = activities.filter((item) =>
    String(item.text || "").toLowerCase().includes("gpa")
  ).length;

  setText("student-id", user?.id || 1);
  setText("member-since", formatMemberSince(user?.createdAt));
  setText("courses-tracked", `${grades.length} Courses`);
  setText(
    "gpa-calculations",
    `${Math.max(calculationCount, grades.length || sessions.length || 0)} Calculations`
  );
}

function setupNavigation() {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (event) => {
      event.preventDefault();
      if (confirm("Are you sure you want to logout?")) {
        authService.logout();
        window.location.href = "index.html";
      }
    });
  }
}

function setupAppearanceToggle() {
  const toggle = document.getElementById("appearance-toggle");
  const themeText = document.getElementById("appearance-theme-text");
  const themeIcon = document.getElementById("appearance-theme-icon");
  const navToggle = document.getElementById("theme-toggle");

  if (!toggle) return;

  const syncAppearanceState = () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    toggle.setAttribute("aria-checked", String(isDark));
    toggle.classList.toggle("is-on", isDark);

    if (themeText) {
      themeText.textContent = isDark ? "Dark mode is enabled" : "Switch to dark mode";
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

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
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

function formatMemberSince(dateString) {
  if (!dateString) return "March 2026";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "March 2026";

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
