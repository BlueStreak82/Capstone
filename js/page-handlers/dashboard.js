// =========================
// DASHBOARD INITIALIZATION
// =========================
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
    displayStats(grades, sessions);

    //  NAVIGATION
    setupNavigation();
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
function displayStats(grades, sessions) {
  // GPA
  const gpa = gradesService.calculateGPA(grades);
  document.getElementById("gpa-value").textContent = gpa;

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
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Are you sure you want to logout?")) {
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
  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
      const text = link.textContent.toLowerCase();

      if (text.includes("dashboard")) return;
      if (text.includes("calculator")) window.location.href = "calculator.html";
      if (text.includes("performance")) window.location.href = "performance.html";
      if (text.includes("study")) window.location.href = "study.html";
    });
  });

}

// ==========================
// LOAD RECENT ACTIVITIES
// ==========================
function loadRecentActivities() {
  const container = document.querySelector(".activity-list");

  if (!container) return;

  const activities = JSON.parse(localStorage.getItem("activities")) || [];

  if (activities.length === 0) {
    container.innerHTML = "<p>No recent activity</p>";
    return;
  }

  container.innerHTML = "";

  activities.slice(-5).reverse().forEach(act => {
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

function addActivity(text, icon = "time-outline") {
  const activities = JSON.parse(localStorage.getItem("activities")) || [];

  activities.push({
    text,
    icon,
    time: new Date().toLocaleString()
  });

  localStorage.setItem("activities", JSON.stringify(activities));
}
