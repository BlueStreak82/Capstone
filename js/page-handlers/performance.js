document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!authService.isLoggedIn()) {
      window.location.href = "login.html";
      return;
    }

    const user = authService.getCurrentUser();
    const grades = await gradesService.getGrades();

    initializeTabs();
    setupNavigation();
    renderPerformanceView(user, grades);
    setupResponsiveCharts(user, grades);
  } catch (error) {
    console.error("Performance page error:", error);
    alert("Error loading performance insights");
  }
});

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

  const profileLink = document.getElementById("profile");
  if (profileLink) {
    profileLink.addEventListener("click", (event) => {
      event.preventDefault();
      alert("Profile page is not available yet.");
    });
  }
}

function initializeTabs() {
  const buttons = Array.from(document.querySelectorAll(".tab-button"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.panel;

      buttons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      panels.forEach((panel) => {
        const isActive = panel.id === `panel-${target}`;
        panel.classList.toggle("active", isActive);
        panel.hidden = !isActive;
      });
    });
  });
}

function renderPerformanceView(user, grades) {
  const normalizedGrades = normalizeGrades(grades);
  const semesterPoints = buildSemesterTrend(normalizedGrades);
  const topCourses = [...normalizedGrades]
    .sort((a, b) => b.gradePoint - a.gradePoint)
    .slice(0, 3);
  const focusCourses = [...normalizedGrades]
    .filter((course) => course.gradePoint < 3.3)
    .sort((a, b) => a.gradePoint - b.gradePoint)
    .slice(0, 3);

  updateMetrics(normalizedGrades, semesterPoints);
  renderCourseList("top-courses-list", topCourses, "good");
  renderCourseList("focus-courses-list", focusCourses, "warn");
  renderTrendChart("trend-chart", semesterPoints);
  renderCourseChart("course-chart", normalizedGrades);
  renderSkillsChart("skills-chart", buildSkillData(user, normalizedGrades));
  renderRecommendations(normalizedGrades, semesterPoints, topCourses, focusCourses);
}

function setupResponsiveCharts(user, grades) {
  let resizeTimer;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderPerformanceView(user, grades);
    }, 120);
  });
}

function normalizeGrades(grades) {
  return grades.map((course) => ({
    ...course,
    gradePoint: toGradePoint(course.grade),
  }));
}

function toGradePoint(grade) {
  if (grade >= 85) return 4.0;
  if (grade >= 80) return 3.7;
  if (grade >= 75) return 3.3;
  if (grade >= 70) return 3.0;
  if (grade >= 65) return 2.7;
  if (grade >= 60) return 2.3;
  if (grade >= 55) return 2.0;
  if (grade >= 50) return 1.7;
  return 1.0;
}

function buildSemesterTrend(grades) {
  const grouped = gradesService.groupBySemester(grades);
  const entries = Object.entries(grouped);

  if (entries.length === 0) {
    return [];
  }

  return entries.map(([semester, courses], index) => ({
    label: `Sem ${index + 1}`,
    semester,
    gpa: gradesService.calculateGPA(
      courses.map((course) => ({
        grade: course.gradePoint,
        creditHours: course.creditHours,
      }))
    ),
  }));
}

function updateMetrics(grades, semesterPoints) {
  const currentGpa = gradesService.calculateGPA(
    grades.map((course) => ({
      grade: course.gradePoint,
      creditHours: course.creditHours,
    }))
  );
  const strongSubjects = grades.filter((course) => course.gradePoint >= 3.7).length;
  const attentionCount = grades.filter((course) => course.gradePoint < 3.0).length;
  const totalCredits = grades.reduce(
    (total, course) => total + Number(course.creditHours || 0),
    0
  );
  const gpaDelta = calculateTrendDelta(semesterPoints);

  setText("current-gpa", currentGpa.toFixed(2));
  setText("strong-subjects-count", strongSubjects);
  setText("attention-count", attentionCount);
  setText("total-credits", totalCredits);
  setText("gpa-delta", gpaDelta);
}

function calculateTrendDelta(semesterPoints) {
  if (semesterPoints.length < 2) {
    return "First recorded semester";
  }

  const latest = semesterPoints[semesterPoints.length - 1].gpa;
  const previous = semesterPoints[semesterPoints.length - 2].gpa;
  const delta = (latest - previous).toFixed(2);

  if (Number(delta) > 0) {
    return `+${delta} from last semester`;
  }

  if (Number(delta) < 0) {
    return `${delta} from last semester`;
  }

  return "No change from last semester";
}

function renderCourseList(targetId, courses, tone) {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (courses.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No course data available for this section yet.</div>';
    return;
  }

  container.innerHTML = courses
    .map(
      (course) => `
        <article class="course-row">
          <div>
            <h4>${course.name}</h4>
            <p>${course.semester} • ${course.creditHours} credits</p>
          </div>
          <div class="course-score ${tone}">${course.gradePoint.toFixed(1)}</div>
        </article>
      `
    )
    .join("");
}

function renderTrendChart(targetId, points) {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (points.length === 0) {
    container.innerHTML = '<div class="empty-state">No GPA trend data available yet.</div>';
    return;
  }

  const width = getChartWidth(container, 720, 320);
  const compact = width < 460;
  const height = compact ? 240 : width < 620 ? 280 : 320;
  const padding = compact
    ? { top: 20, right: 14, bottom: 38, left: 30 }
    : { top: 24, right: 24, bottom: 42, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = 4;
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  const coords = points.map((point, index) => {
    const x = padding.left + stepX * index;
    const y = padding.top + chartHeight - (point.gpa / maxValue) * chartHeight;
    return { ...point, x, y };
  });

  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const horizontalLines = [0, 1, 2, 3, 4]
    .map((value) => {
      const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
      return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line" />
        <text x="${padding.left - (compact ? 8 : 10)}" y="${y + 4}" class="chart-axis-label">${value}</text>`;
    })
    .join("");

  const verticalLines = coords
    .map(
      (point) =>
        `<line x1="${point.x}" y1="${padding.top}" x2="${point.x}" y2="${
          height - padding.bottom
        }" class="chart-grid-line chart-grid-line-vertical" />
         <text x="${point.x}" y="${height - 12}" text-anchor="middle" class="chart-axis-label">${compact ? `S${point.label.replace("Sem ", "")}` : point.label}</text>`
    )
    .join("");

  const pointsMarkup = coords
    .map(
      (point) => `
        <circle cx="${point.x}" cy="${point.y}" r="4" fill="var(--performance-blue)" />
        <text x="${point.x}" y="${point.y - 12}" text-anchor="middle" class="chart-point-label">${point.gpa.toFixed(
          2
        )}</text>
      `
    )
    .join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="GPA trend chart">
      ${horizontalLines}
      ${verticalLines}
      <path d="${path}" fill="none" stroke="var(--performance-blue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${pointsMarkup}
    </svg>
  `;
}

function renderCourseChart(targetId, courses) {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (courses.length === 0) {
    container.innerHTML = '<div class="empty-state">No course performance data available yet.</div>';
    return;
  }

  const width = getChartWidth(container, 720, 340);
  const compact = width < 480;
  const height = compact ? 300 : width < 620 ? 340 : 390;
  const padding = compact
    ? { top: 18, right: 16, bottom: 96, left: 32 }
    : width < 620
      ? { top: 20, right: 18, bottom: 120, left: 42 }
      : { top: 20, right: 28, bottom: 138, left: 56 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = chartWidth / Math.max(courses.length * 1.4, 1);
  const gap = barWidth * 0.4;

  const bars = courses
    .map((course, index) => {
      const x = padding.left + index * (barWidth + gap) + gap / 2;
      const barHeight = (course.gradePoint / 4) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      const label = shortenCourseLabel(course.name, compact);
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="8" fill="var(--performance-purple)" />
        <text x="${x + barWidth / 2}" y="${y - 10}" text-anchor="middle" class="chart-point-label">${course.gradePoint.toFixed(
          1
        )}</text>
        <text
          x="${x + barWidth / 2}"
          y="${height - (compact ? 18 : 26)}"
          text-anchor="end"
          transform="rotate(-45 ${x + barWidth / 2} ${height - (compact ? 18 : 26)})"
          class="chart-axis-label"
        >${label}</text>
      `;
    })
    .join("");

  const lines = [0, 1, 2, 3, 4]
    .map((value) => {
      const y = padding.top + chartHeight - (value / 4) * chartHeight;
      return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line" />
        <text x="${padding.left - (compact ? 8 : 10)}" y="${y + 4}" class="chart-axis-label">${value}</text>`;
    })
    .join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Course performance chart">
      ${lines}
      ${bars}
    </svg>
  `;
}

function shortenCourseLabel(name, compact = false) {
  const maxLength = compact ? 10 : 14;
  if (name.length <= maxLength) return name;

  return name
    .split(" ")
    .map((word) => word[0])
    .join("");
}

function renderSkillsChart(targetId, skills) {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (skills.length === 0) {
    container.innerHTML = '<div class="empty-state">No skill data available yet.</div>';
    return;
  }

  const size = getRadarSize(container);
  const center = size / 2;
  const radius = size * 0.28;
  const levels = 5;
  const angleStep = (Math.PI * 2) / skills.length;

  const rings = Array.from({ length: levels }, (_, index) => {
    const ringRadius = ((index + 1) / levels) * radius;
    const points = skills
      .map((_, skillIndex) => {
        const angle = -Math.PI / 2 + skillIndex * angleStep;
        const x = center + Math.cos(angle) * ringRadius;
        const y = center + Math.sin(angle) * ringRadius;
        return `${x},${y}`;
      })
      .join(" ");
    return `<polygon points="${points}" class="radar-ring" />`;
  }).join("");

  const axes = skills
    .map((skill, index) => {
      const angle = -Math.PI / 2 + index * angleStep;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      const labelX = center + Math.cos(angle) * (radius + 28);
      const labelY = center + Math.sin(angle) * (radius + 22);
      return `
        <line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-axis" />
        <text x="${labelX}" y="${labelY}" text-anchor="middle" class="chart-axis-label">${skill.label}</text>
      `;
    })
    .join("");

  const skillPoints = skills
    .map((skill, index) => {
      const angle = -Math.PI / 2 + index * angleStep;
      const scaledRadius = (skill.value / 100) * radius;
      const x = center + Math.cos(angle) * scaledRadius;
      const y = center + Math.sin(angle) * scaledRadius;
      return `${x},${y}`;
    })
    .join(" ");

  container.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Skill assessment chart">
      ${rings}
      ${axes}
      <polygon points="${skillPoints}" class="radar-shape" />
    </svg>
  `;
}

function getChartWidth(container, maxWidth, minWidth) {
  const shell = container.closest(".chart-shell");
  const availableWidth = shell ? shell.clientWidth - 28 : container.clientWidth;
  return Math.max(minWidth, Math.min(maxWidth, availableWidth || maxWidth));
}

function getRadarSize(container) {
  const shell = container.closest(".chart-shell");
  const availableWidth = shell ? shell.clientWidth - 32 : container.clientWidth;
  const boundedWidth = Math.max(260, Math.min(420, availableWidth || 360));
  return boundedWidth < 320 ? 300 : boundedWidth;
}

function buildSkillData(user, grades) {
  const baseSkills = [
    { label: "Mathematics", value: 62 },
    { label: "Science", value: 58 },
    { label: "Programming", value: 72 },
    { label: "Writing", value: 60 },
    { label: "Analysis", value: 66 },
    { label: "Problem Solving", value: 70 },
  ];

  grades.forEach((course) => {
    const mappedSkill = mapCourseToSkill(course.name);
    const skill = baseSkills.find((item) => item.label === mappedSkill);
    if (skill) {
      skill.value = Math.min(95, Math.round((skill.value + course.grade) / 2));
    }
  });

  if (user?.name?.toLowerCase().includes("demo")) {
    baseSkills[2].value += 6;
    baseSkills[5].value += 4;
  }

  return baseSkills;
}

function renderRecommendations(grades, semesterPoints, topCourses, focusCourses) {
  const container = document.getElementById("recommendations-list");
  if (!container) return;

  const recommendations = buildRecommendations(
    grades,
    semesterPoints,
    topCourses,
    focusCourses
  );

  container.innerHTML = recommendations
    .map(
      (item) => `
        <article class="recommendation-item recommendation-${item.tone}">
          <div class="recommendation-icon">
            <ion-icon name="${item.icon}"></ion-icon>
          </div>
          <div>
            <h4>${item.title}</h4>
            <p>${item.text}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function buildRecommendations(grades, semesterPoints, topCourses, focusCourses) {
  const recommendations = [];
  const currentGpa = gradesService.calculateGPA(
    grades.map((course) => ({
      grade: course.gradePoint,
      creditHours: course.creditHours,
    }))
  );
  const trendMessage = calculateTrendDelta(semesterPoints);
  const strongest = topCourses.map((course) => course.name).join(", ");
  const weakest = focusCourses.map((course) => course.name).join(", ");

  recommendations.push({
    tone: "blue",
    icon: "trending-up-outline",
    title: "Focus on Consistency",
    text:
      semesterPoints.length > 1
        ? `Your GPA trend is ${trendMessage.toLowerCase()}. Keep your weekly study routine steady to build momentum.`
        : "Build a steady weekly study routine so your first performance trend stays strong as more semesters are added.",
  });

  recommendations.push({
    tone: "orange",
    icon: "alert-circle-outline",
    title: "Allocate More Time to Weak Subjects",
    text: weakest
      ? `Consider increasing revision time for ${weakest}. Targeting those courses will improve your overall CWA faster.`
      : `Your current GPA is ${currentGpa.toFixed(
          2
        )}. Keep reviewing your lowest-scoring topics to protect your average as you add more courses.`,
  });

  recommendations.push({
    tone: "green",
    icon: "ribbon-outline",
    title: "Leverage Your Strengths",
    text: strongest
      ? `You excel in ${strongest}. Use those strong courses as confidence boosters while strengthening weaker areas.`
      : "Keep building on your strongest subjects and use that confidence to improve the courses that need more attention.",
  });

  return recommendations;
}

function mapCourseToSkill(courseName) {
  const name = courseName.toLowerCase();

  if (name.includes("math")) return "Mathematics";
  if (name.includes("physics") || name.includes("chemistry")) return "Science";
  if (name.includes("computer") || name.includes("program")) return "Programming";
  if (name.includes("english") || name.includes("literature")) return "Writing";
  return "Analysis";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}
