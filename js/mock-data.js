/**
 * MOCK DATA - Temporary Database
 * This simulates a backend until a real one is provided
 *
 * IMPORTANT: Replace with real API calls when backend is ready
 * Instead of: const user = await MockData.loginUser(...)
 * Will become: const user = await fetch('/api/login', ...)
 */

// ==========================================
// SAMPLE USERS DATABASE
// ==========================================
const MOCK_USERS = [
  {
    id: 1,
    email: "demo@example.com",
    password: "demo123",
    name: "Demo User",
    createdAt: "2026-02-01",
  },
  {
    id: 2,
    email: "john@example.com",
    password: "password123",
    name: "John Doe",
    createdAt: "2026-01-15",
  },
  {
    id: 3,
    email: "jane@example.com",
    password: "password123",
    name: "Jane Smith",
    createdAt: "2026-01-18",
  },
];

// ==========================================
// SAMPLE GRADES DATABASE
// ==========================================
const MOCK_GRADES = [
  {
    userId: 1,
    courses: [
      {
        id: 101,
        name: "Mathematics",
        grade: 85,
        creditHours: 3,
        semester: "Fall 2025",
      },
      {
        id: 102,
        name: "English Literature",
        grade: 92,
        creditHours: 3,
        semester: "Fall 2025",
      },
      {
        id: 103,
        name: "Physics",
        grade: 78,
        creditHours: 4,
        semester: "Fall 2025",
      },
      {
        id: 104,
        name: "Chemistry",
        grade: 88,
        creditHours: 4,
        semester: "Spring 2026",
      },
      {
        id: 105,
        name: "Computer Science",
        grade: 95,
        creditHours: 3,
        semester: "Spring 2026",
      },
    ],
  },
  {
    userId: 2,
    courses: [
      {
        id: 201,
        name: "Biology",
        grade: 90,
        creditHours: 4,
        semester: "Fall 2025",
      },
      {
        id: 202,
        name: "History",
        grade: 87,
        creditHours: 3,
        semester: "Fall 2025",
      },
    ],
  },
  {
    userId: 3,
    courses: [
      {
        id: 301,
        name: "Web Development",
        grade: 96,
        creditHours: 3,
        semester: "Fall 2025",
      },
    ],
  },
];

// ==========================================
// SAMPLE STUDY SESSIONS DATABASE
// ==========================================
const MOCK_STUDY_SESSIONS = [
  {
    userId: 1,
    sessions: [
      {
        id: 1,
        courseId: 101,
        courseName: "Mathematics",
        date: "2026-03-14",
        hoursSpent: 2.5,
        materials: ["Chapter 5 - Calculus", "Practice Problems"],
        notes: "Reviewed derivatives and integrals",
      },
      {
        id: 2,
        courseId: 102,
        courseName: "English Literature",
        date: "2026-03-14",
        hoursSpent: 1.5,
        materials: ["Shakespeare Analysis", "Essay Writing"],
        notes: "Completed essay on Hamlet",
      },
      {
        id: 3,
        courseId: 105,
        courseName: "Computer Science",
        date: "2026-03-13",
        hoursSpent: 3,
        materials: ["Data Structures", "Algorithm Complexity"],
        notes: "Implemented binary search tree",
      },
    ],
  },
  {
    userId: 2,
    sessions: [
      {
        id: 1,
        courseId: 201,
        courseName: "Biology",
        date: "2026-03-13",
        hoursSpent: 2,
        materials: ["Cell Biology Chapter 3"],
        notes: "Studied mitochondria function",
      },
    ],
  },
  {
    userId: 3,
    sessions: [
      {
        id: 1,
        courseId: 301,
        courseName: "Web Development",
        date: "2026-03-14",
        hoursSpent: 4,
        materials: ["React Documentation", "CSS Grid"],
        notes: "Built responsive dashboard",
      },
    ],
  },
];

// ==========================================
// MOCK API FUNCTIONS
// ==========================================

const MockData = {
  /**
   * LOGIN
   */
  async loginUser(email, password) {
    await this._delay(500);

    const user = MOCK_USERS.find((u) => u.email === email);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.password !== password) {
      throw new Error("Invalid password");
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  /**
   * SIGNUP
   */
  async registerUser(email, password, name) {
    await this._delay(500);

    if (MOCK_USERS.find((u) => u.email === email)) {
      throw new Error("Email already registered");
    }

    const newUser = {
      id: MOCK_USERS.length + 1,
      email,
      password,
      name,
      createdAt: new Date().toISOString().split("T")[0],
    };

    MOCK_USERS.push(newUser);

    // Initialize grades tracking for new user
    MOCK_GRADES.push({
      userId: newUser.id,
      courses: [],
    });

    // Initialize study sessions for new user
    MOCK_STUDY_SESSIONS.push({
      userId: newUser.id,
      sessions: [],
    });

    const { password: __, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  /**
   * GRADES
   */
  async getGradesByUserId(userId) {
    await this._delay(400);

    const userGrades = MOCK_GRADES.find((g) => g.userId === userId);
    return userGrades?.courses || [];
  },

  async addGrade(userId, courseData) {
    await this._delay(400);

    let userGrades = MOCK_GRADES.find((g) => g.userId === userId);

    if (!userGrades) {
      userGrades = { userId, courses: [] };
      MOCK_GRADES.push(userGrades);
    }

    const newCourse = {
      id: Math.max(...userGrades.courses.map((c) => c.id), 0) + 1,
      ...courseData,
    };

    userGrades.courses.push(newCourse);
    return newCourse;
  },

  /**
   * STUDY SESSIONS
   */
  async getStudySessions(userId) {
    await this._delay(400);

    const sessions = MOCK_STUDY_SESSIONS.find((s) => s.userId === userId);
    return sessions?.sessions || [];
  },

  async addStudySession(userId, sessionData) {
    await this._delay(400);

    let userSessions = MOCK_STUDY_SESSIONS.find((s) => s.userId === userId);

    if (!userSessions) {
      userSessions = { userId, sessions: [] };
      MOCK_STUDY_SESSIONS.push(userSessions);
    }

    const newSession = {
      id: Math.max(...userSessions.sessions.map((s) => s.id), 0) + 1,
      ...sessionData,
    };

    userSessions.sessions.push(newSession);
    return newSession;
  },

  /**
   * UTILITY
   */
  async _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};
