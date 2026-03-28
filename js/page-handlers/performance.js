let performanceState = {
  user: null,
  grades: [],
  calcMode: "gpa",
};

const USER_CALC_PREF_KEY_PREFIX = "academic-tracker-calc-pref-";
const USER_CALC_COURSES_KEY_PREFIX = "academic-tracker-calc-courses-";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!authService.isLoggedIn()) {
      window.location.href = "login.html";
      return;
    }

    const user = authService.getCurrentUser();
    const grades = await gradesService.getGrades();
    const calculatedCourses = getUserCalculatedCourses(user.id);
    const effectiveGrades =
      calculatedCourses.length > 0
        ? mergeCourseSources(grades, calculatedCourses)
        : grades;
    const calcMode = getUserCalculationMode(user.id);
    performanceState = { user, grades: effectiveGrades, calcMode };

    initializeTabs();
    setupNavigation();
    renderPerformanceView(user, effectiveGrades, calcMode);
    setupResponsiveCharts(user, effectiveGrades, calcMode);
  } catch (error) {
    console.error("Performance page error:", error);
    alert("Error loading performance insights");
  }
});

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

  const profileLink = document.getElementById("profile");
  if (profileLink) {
    profileLink.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "profile.html";
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

      requestAnimationFrame(() => {
        if (performanceState.user) {
          renderPerformanceView(
            performanceState.user,
            performanceState.grades,
            performanceState.calcMode,
          );
        }
      });
    });
  });
}

function renderPerformanceView(user, grades, calcMode = "gpa") {
  const normalizedGrades = normalizeGrades(grades, calcMode);
  const semesterPoints = buildSemesterTrend(normalizedGrades, calcMode);
  const focusThreshold = calcMode === "cwa" ? 75 : 3.3;
  const topCourses = [...normalizedGrades]
    .sort((a, b) => b.gradePoint - a.gradePoint)
    .slice(0, 3);
  const focusCourses = [...normalizedGrades]
    .filter((course) => course.gradePoint < focusThreshold)
    .sort((a, b) => a.gradePoint - b.gradePoint)
    .slice(0, 3);

  updateMetrics(normalizedGrades, semesterPoints, calcMode);
  renderCourseList("top-courses-list", topCourses, "good", calcMode);
  renderCourseList("focus-courses-list", focusCourses, "warn", calcMode);
  renderTrendChart("trend-chart", semesterPoints, calcMode);
  renderCourseChart("course-chart", normalizedGrades, calcMode);
  renderSkillsChart("skills-chart", buildSkillData(user, normalizedGrades));
  renderRecommendations(
    normalizedGrades,
    semesterPoints,
    topCourses,
    focusCourses,
    calcMode,
  );
}

function setupResponsiveCharts(user, grades, calcMode) {
  let resizeTimer;

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderPerformanceView(user, grades, calcMode);
    }, 120);
  });
}

function normalizeGrades(grades, calcMode = "gpa") {
  const useCwa = calcMode === "cwa";

  return grades.map((course) => ({
    ...course,
    gradePoint: useCwa ? Number(course.grade) : toGradePoint(course.grade),
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

function buildSemesterTrend(grades, calcMode = "gpa") {
  const grouped = gradesService.groupBySemester(grades);
  const entries = Object.entries(grouped).sort((left, right) =>
    compareSemesters(left[0], right[0]),
  );

  if (entries.length === 0) {
    return [];
  }

  return entries.map(([semester, courses], index) => ({
    label: formatSemesterLabel(semester, index),
    semester,
    gpa:
      calcMode === "cwa"
        ? calculateCwa(courses)
        : gradesService.calculateGPA(
            courses.map((course) => ({
              grade: course.gradePoint,
              creditHours: course.creditHours,
            })),
          ),
  }));
}

function updateMetrics(grades, semesterPoints, calcMode = "gpa") {
  const currentGpa =
    calcMode === "cwa"
      ? calculateCwa(grades)
      : gradesService.calculateGPA(
          grades.map((course) => ({
            grade: course.gradePoint,
            creditHours: course.creditHours,
          })),
        );
  const strongThreshold = calcMode === "cwa" ? 75 : 3.7;
  const attentionThreshold = calcMode === "cwa" ? 60 : 3.0;
  const strongSubjects = grades.filter(
    (course) => course.gradePoint >= strongThreshold,
  ).length;
  const attentionCount = grades.filter(
    (course) => course.gradePoint < attentionThreshold,
  ).length;
  const totalCredits = grades.reduce(
    (total, course) => total + Number(course.creditHours || 0),
    0,
  );
  const gpaDelta = calculateTrendDelta(semesterPoints, calcMode);

  setText("current-gpa", currentGpa.toFixed(2));
  setText(
    "strong-subjects-label",
    calcMode === "cwa" ? "CWA >= 75" : "GPA >= 3.7",
  );
  setText("attention-label", calcMode === "cwa" ? "CWA < 60" : "GPA < 3.0");
  updateMetricHeadings(calcMode);
  setText("strong-subjects-count", strongSubjects);
  setText("attention-count", attentionCount);
  setText("total-credits", totalCredits);
  setText("gpa-delta", gpaDelta);
}

function calculateTrendDelta(semesterPoints, calcMode = "gpa") {
  if (semesterPoints.length < 2) {
    return `First recorded ${calcMode.toUpperCase()} semester`;
  }

  const latest = semesterPoints[semesterPoints.length - 1].gpa;
  const previous = semesterPoints[semesterPoints.length - 2].gpa;
  const delta = (latest - previous).toFixed(2);

  if (Number(delta) > 0) {
    return `+${delta} from last ${calcMode.toUpperCase()} semester`;
  }

  if (Number(delta) < 0) {
    return `${delta} from last ${calcMode.toUpperCase()} semester`;
  }

  return `No change from last ${calcMode.toUpperCase()} semester`;
}

function renderCourseList(targetId, courses, tone, calcMode = "gpa") {
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
          <div class="course-score ${tone}">${course.gradePoint.toFixed(calcMode === "cwa" ? 2 : 1)}</div>
        </article>
      `,
    )
    .join("");
}

function renderTrendChart(targetId, points, calcMode = "gpa") {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (points.length === 0) {
    container.innerHTML = `<div class="empty-state">No ${calcMode.toUpperCase()} trend data available yet.</div>`;
    return;
  }

  const width = getChartWidth(container, 720, 320);
  const compact = width < 460;
  const height = compact ? 190 : width < 620 ? 215 : 235;
  const padding = compact
    ? { top: 16, right: 12, bottom: 30, left: 28 }
    : { top: 18, right: 18, bottom: 34, left: 36 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = calcMode === "cwa" ? 100 : 4;
  const stepX = points.length > 1 ? chartWidth / (points.length - 1) : 0;

  const coords = points.map((point, index) => {
    const x = padding.left + stepX * index;
    const y = padding.top + chartHeight - (point.gpa / maxValue) * chartHeight;
    return { ...point, x, y };
  });

  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const axisValues =
    calcMode === "cwa" ? [0, 25, 50, 75, 100] : [0, 1, 2, 3, 4];
  const horizontalLines = axisValues
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
         <text x="${point.x}" y="${height - 12}" text-anchor="middle" class="chart-axis-label">${compact ? `S${point.label.replace("Sem ", "")}` : point.label}</text>`,
    )
    .join("");

  const pointsMarkup = coords
    .map(
      (point) => `
        <circle cx="${point.x}" cy="${point.y}" r="3.2" fill="var(--performance-blue)" />
        <text x="${point.x}" y="${point.y - 9}" text-anchor="middle" class="chart-point-label">${point.gpa.toFixed(
          2,
        )}</text>
      `,
    )
    .join("");

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${calcMode.toUpperCase()} trend chart">
      ${horizontalLines}
      ${verticalLines}
      <path d="${path}" fill="none" stroke="var(--performance-blue)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${pointsMarkup}
    </svg>
  `;
}

function renderCourseChart(targetId, courses, calcMode = "gpa") {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (courses.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No course performance data available yet.</div>';
    return;
  }

  const containerWidth = getChartWidth(container, 880, 320);
  const width = Math.max(containerWidth, courses.length * 150);
  const compact = containerWidth < 480;
  const height = compact ? 238 : containerWidth < 620 ? 256 : 272;
  const padding = compact
    ? { top: 14, right: 26, bottom: 52, left: 28 }
    : containerWidth < 620
      ? { top: 16, right: 34, bottom: 56, left: 36 }
      : { top: 18, right: 42, bottom: 60, left: 44 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = Math.min(
    76,
    chartWidth / Math.max(courses.length * 1.08, 1),
  );
  const gap = Math.max(
    18,
    (chartWidth - barWidth * courses.length) / Math.max(courses.length - 1, 1),
  );

  const bars = courses
    .map((course, index) => {
      const x = padding.left + index * (barWidth + gap);
      const maxValue = calcMode === "cwa" ? 100 : 4;
      const barHeight = (course.gradePoint / maxValue) * chartHeight;
      const y = padding.top + chartHeight - barHeight;
      const label = shortenCourseLabel(course.name, compact);
      const axisY = padding.top + chartHeight;
      const labelY = axisY + (compact ? 18 : 20);
      const labelX = x + barWidth / 2 - (compact ? 2 : 4);
      return `
        <g class="course-bar-group">
          <title>${course.name}: ${course.gradePoint.toFixed(calcMode === "cwa" ? 2 : 1)}</title>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="8" fill="var(--performance-purple)" class="course-bar-rect" />
        </g>
        <text
          x="${labelX}"
          y="${labelY}"
          text-anchor="end"
          transform="rotate(-45 ${labelX} ${labelY})"
          class="chart-axis-label course-axis-label"
        >
          ${label}
        </text>
      `;
    })
    .join("");

  const axisValues =
    calcMode === "cwa" ? [0, 25, 50, 75, 100] : [0, 1, 2, 3, 4];
  const maxAxisValue = calcMode === "cwa" ? 100 : 4;
  const lines = axisValues
    .map((value) => {
      const y =
        padding.top + chartHeight - (value / maxAxisValue) * chartHeight;
      return `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="chart-grid-line" />
        <text x="${padding.left - (compact ? 8 : 10)}" y="${y + 4}" class="chart-axis-label">${value}</text>`;
    })
    .join("");

  container.innerHTML = `
    <svg class="course-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Course performance chart">
      ${lines}
      ${bars}
    </svg>
  `;
}

function shortenCourseLabel(name, compact = false) {
  const shortMap = compact
    ? {
        Mathematics: "M",
        "English Literature": "EL",
        Physics: "P",
        Chemistry: "C",
        "Computer Science": "CS",
        Programming: "PG",
      }
    : {
        Mathematics: "Math",
        "English Literature": "Eng Lit",
        Physics: "Phys",
        Chemistry: "Chem",
        "Computer Science": "Comp Sci",
        Programming: "Prog",
      };

  if (shortMap[name]) return shortMap[name];

  const maxLength = compact ? 3 : 8;
  if (name.length <= maxLength) return name;

  const trimmed = name.replace(/\s+/g, "");
  if (trimmed.length <= 2) return trimmed;

  return `${trimmed[0]}${trimmed[trimmed.length - 1]}`;
}

function renderSkillsChart(targetId, skills) {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (skills.length === 0) {
    container.innerHTML =
      '<div class="empty-state">No skill data available yet.</div>';
    return;
  }

  const size = getRadarSize(container);
  const center = size / 2;
  const radius = size * 0.33;
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
      const labelDistance = radius + 34;
      const labelX = center + Math.cos(angle) * labelDistance;
      const labelY = center + Math.sin(angle) * labelDistance;
      return `
        <line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-axis" />
        <text x="${labelX}" y="${labelY}" text-anchor="middle" class="chart-axis-label radar-axis-label">${skill.label}</text>
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
  const availableWidth = shell ? shell.clientWidth - 24 : container.clientWidth;
  if (availableWidth < 360) return 420;
  if (availableWidth < 640) return 480;
  return 520;
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

function renderRecommendations(
  grades,
  semesterPoints,
  topCourses,
  focusCourses,
  calcMode = "gpa",
) {
  const container = document.getElementById("recommendations-list");
  if (!container) return;

  const recommendations = buildRecommendations(
    grades,
    semesterPoints,
    topCourses,
    focusCourses,
    calcMode,
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
      `,
    )
    .join("");
}

function buildRecommendations(
  grades,
  semesterPoints,
  topCourses,
  focusCourses,
  calcMode = "gpa",
) {
  const recommendations = [];
  const currentGpa =
    calcMode === "cwa"
      ? calculateCwa(grades)
      : gradesService.calculateGPA(
          grades.map((course) => ({
            grade: course.gradePoint,
            creditHours: course.creditHours,
          })),
        );
  const trendMessage = calculateTrendDelta(semesterPoints, calcMode);
  const metricLabel = calcMode.toUpperCase();
  const strongest = topCourses.map((course) => course.name).join(", ");
  const weakest = focusCourses.map((course) => course.name).join(", ");

  recommendations.push({
    tone: "blue",
    icon: "trending-up-outline",
    title: "Focus on Consistency",
    text:
      semesterPoints.length > 1
        ? `Your ${metricLabel} trend is ${trendMessage.toLowerCase()}. Keep your weekly study routine steady to build momentum.`
        : "Build a steady weekly study routine so your first performance trend stays strong as more semesters are added.",
  });

  recommendations.push({
    tone: "orange",
    icon: "alert-circle-outline",
    title: "Allocate More Time to Weak Subjects",
    text: weakest
      ? `Consider increasing revision time for ${weakest}. Targeting those courses will improve your overall CWA faster.`
      : `Your current ${metricLabel} is ${currentGpa.toFixed(
          2,
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

function calculateCwa(courses) {
  if (!courses || courses.length === 0) {
    return 0;
  }

  const total = courses.reduce(
    (sum, course) => sum + Number(course.gradePoint || course.grade || 0),
    0,
  );
  return total / courses.length;
}

function updateMetricHeadings(calcMode) {
  const metricLabel = calcMode.toUpperCase();
  const currentMetric = document.querySelector(
    ".performance-metrics .metric-card .metric-label",
  );
  const trendHeading = document.querySelector("#panel-trend .chart-heading h3");
  const trendLegend = document.querySelector(
    "#panel-trend .chart-legend span:last-child",
  );
  const courseLegend = document.querySelector(
    "#panel-courses .chart-legend span:last-child",
  );

  if (currentMetric) {
    currentMetric.textContent = `Current ${metricLabel}`;
  }

  if (trendHeading) {
    trendHeading.textContent = `${metricLabel} Trend Over Time`;
  }

  if (trendLegend) {
    trendLegend.textContent = metricLabel;
  }

  if (courseLegend) {
    courseLegend.textContent =
      calcMode === "cwa" ? "Course CWA" : "Grade Point";
  }
}

function getUserCalculationMode(userId) {
  try {
    const raw = localStorage.getItem(`${USER_CALC_PREF_KEY_PREFIX}${userId}`);
    if (!raw) {
      return "gpa";
    }

    const parsed = JSON.parse(raw);
    return parsed?.mode === "cwa" ? "cwa" : "gpa";
  } catch (error) {
    return "gpa";
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
  });

  calculatedCourses.forEach((course) => {
    const semester = String(course.semester || "Unspecified");
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

  return Array.from(bySemester.entries())
    .sort((left, right) => compareSemesters(left[0], right[0]))
    .flatMap((entry) => entry[1]);
}

function compareSemesters(leftSemester, rightSemester) {
  const left = parseSemester(leftSemester);
  const right = parseSemester(rightSemester);

  if (left.year !== right.year) {
    return left.year - right.year;
  }

  return left.rank - right.rank;
}

function parseSemester(label) {
  const match = String(label).match(
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

function formatSemesterLabel(semester, index) {
  const match = String(semester).match(
    /^(Spring|Summer|Fall|Semester\s*1|Semester\s*2)\s+(\d{4})$/i,
  );
  if (!match) {
    return `Sem ${index + 1}`;
  }

  const term = normalizeSemesterTerm(match[1]);
  const shortMap = {
    Spring: "Spr",
    Summer: "Sum",
    Fall: "Fal",
    "Semester 1": "Sem 1",
    "Semester 2": "Sem 2",
  };

  return `${shortMap[term] || term} ${match[2]}`;
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

function mapCourseToSkill(courseName) {
  const name = courseName.toLowerCase();

  if (name.includes("math")) return "Mathematics";
  if (name.includes("physics") || name.includes("chemistry")) return "Science";
  if (name.includes("computer") || name.includes("program"))
    return "Programming";
  if (name.includes("english") || name.includes("literature")) return "Writing";
  return "Analysis";
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}
