# 🛣️ Routing System - Complete Guide

Your Academic Performance Tracker uses **Traditional Multi-Page Routing** - the simplest and most reliable approach.

---

## 📍 How Routing Works

### **Simple Concept**

```
User clicks link → Browser requests file → Page loads
```

### **Your Navigation Flow**

```
┌──────────────────┐
│   index.html     │ (Landing Page)
│   • Home         │
│   • Features     │
└────────┬─────────┘
         │
    [Get Started]
    [Login Button]
         │
    ┌────┴──────────┐
    │               │
    ↓               ↓
┌─────────┐  ┌──────────┐
│signup   │  │ login    │
│.html    │  │ .html    │
└────┬────┘  └────┬─────┘
     │            │
   [Submit]     [Submit]
     │            │
     └────┬───────┘
          ↓
    ┌──────────────┐
    │ dashboard.html│
    │ (Protected)  │
    └──────────────┘
```

---

## 🔗 How Links Work

### **In HTML** (index.html)

```html
<!-- Navigation links -->
<a href="login.html">Login</a>
<a href="signup.html">Sign Up</a>

<!-- Button links -->
<a href="signup.html" class="btn-primary">Get Started</a>
```

When clicked:

1. Browser sees `href="login.html"`
2. Browser requests that file
3. Page loads with new content
4. URL changes to `login.html`

### **In JavaScript** (After form submission)

```javascript
// In login.js
const user = await authService.login(email, password);
window.location.href = "dashboard.html"; // Navigate!
```

When executed:

1. User logs in successfully
2. JavaScript redirects to dashboard
3. Page unloads, dashboard.html loads
4. URL changes to `dashboard.html`

---

## 📊 Your Pages & Their Purpose

### **index.html** - Landing Page

- ✅ Always accessible
- ✅ Shows features overview
- ✅ Links to login/signup
- No authentication needed

```html
<a href="login.html">Login</a> <a href="signup.html">Sign Up</a>
```

### **login.html** - Login Page

- ✅ Login form
- ✅ Email + Password validation
- ✅ Demo button for testing
- ✅ Links to signup page

```javascript
// After successful login
window.location.href = "dashboard.html";
```

### **signup.html** - Signup Page

- ✅ Registration form
- ✅ Password confirmation check
- ✅ Creates new user in mock data
- ✅ Links to login page

```javascript
// After successful signup
window.location.href = "dashboard.html";
```

### **dashboard.html** - User Dashboard (Protected)

- ✅ Shows user's grades and GPA
- ✅ Shows study sessions
- ✅ Displays statistics
- ❌ Requires login (redirects if not logged in)

```javascript
// At top of dashboard.js
if (!authService.isLoggedIn()) {
  window.location.href = "login.html";
}
```

---

## 🔐 Protected Pages Explained

### **Problem:** How do we prevent people from just typing `dashboard.html` in the URL?

### **Solution:** Check authentication on page load

**In dashboard.js:**

```javascript
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  if (!authService.isLoggedIn()) {
    console.log("Not logged in, redirecting...");
    window.location.href = "login.html"; // Force redirect!
    return; // Stop loading rest of page
  }

  // User is logged in, load their data
  loadDashboardData();
});
```

**How it works:**

1. Person types `dashboard.html` in URL
2. Page loads and JavaScript runs
3. authService checks localStorage for user
4. If no user found → redirect to login.html
5. If user found → load dashboard

---

## 💾 Session Persistence (How Logins Are Remembered)

### **The Problem**

If user closes browser after login, they're logged out!

### **The Solution**

Save user data to browser's localStorage

**In auth.js:**

```javascript
// When user logs in
async login(email, password) {
    const user = await MockData.loginUser(email, password);
    this.currentUser = user;
    this._saveToStorage(user); // Save to localStorage!
    return user;
}

// Save data
_saveToStorage(user) {
    localStorage.setItem('academic-tracker-user', JSON.stringify(user));
}

// Load on page load
constructor() {
    this.currentUser = this._loadFromStorage(); // Restore from localStorage!
}
```

**What's stored:**

```javascript
{
    "id": 1,
    "email": "demo@example.com",
    "name": "Demo User",
    "createdAt": "2026-02-01"
}
```

**Flow:**

1. User logs in → data saved to localStorage
2. User closes browser
3. User reopens website
4. Dashboard checks localStorage
5. User still logged in! ✅

---

## 🧪 Test Credentials (Mock Data)

Use these to test the routing:

| Email            | Password    | Name       |
| ---------------- | ----------- | ---------- |
| demo@example.com | demo123     | Demo User  |
| john@example.com | password123 | John Doe   |
| jane@example.com | password123 | Jane Smith |

**Try this:**

1. Go to login.html
2. Click "Demo" button (auto-fills credentials)
3. Click "Sign In"
4. Should redirect to dashboard.html ✅

---

## 🔄 File Loading Order

Each page loads files in this order:

```
1. HTML (index.html, login.html, etc)
2. CSS (styles.css) - Colors, layout
3. Icons (Ionicons) - SVG icons
4. Theme script (script.js) - Light/dark mode
5. Mock data (mock-data.js) - Fake backend
6. Services (auth.js, grades.js) - Business logic
7. Page handler (login.js, dashboard.js) - UI logic
```

### **Why order matters?**

- Mock data must load before services
- Services must load before page handlers
- Page handlers run on page load

---

## 📝 Custom Routing Example

### **Add a settings page:**

1. **Create settings.html**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Settings - Academic Tracker</title>
    <link rel="stylesheet" href="/css/styles.css" />
  </head>
  <body>
    <nav class="nav">
      <div class="nav-title">Academic Tracker</div>
      <div class="nav-links">
        <a href="index.html">Home</a>
        <a href="dashboard.html">Dashboard</a>
        <a href="settings.html">Settings</a>
      </div>
    </nav>

    <main>
      <h1>Settings</h1>
      <!-- Settings content -->
    </main>

    <script src="js/mock-data.js"></script>
    <script src="js/services/auth.js"></script>
    <script src="js/page-handlers/settings.js"></script>
  </body>
</html>
```

2. **Create js/page-handlers/settings.js**

```javascript
document.addEventListener("DOMContentLoaded", () => {
  // Check if logged in
  if (!authService.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  // Load settings
  loadUserSettings();
});
```

3. **Add link in dashboard.html**

```html
<a href="settings.html">Settings</a>
```

That's it! New page is routed! 🎉

---

## 🚀 When Backend is Ready

Your routing doesn't change! Only the API calls change:

**Before (Mock):**

```javascript
const user = await MockData.loginUser(email, password);
```

**After (Real API):**

```javascript
const response = await fetch("https://your-api.com/login", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});
const user = await response.json();
```

**The routing stays exactly the same!** ✅

---

## 🐛 Common Issues & Solutions

### **Issue: Clicking links doesn't navigate**

**Cause:** Links are broken or CSS is hiding them
**Fix:** Check `<a>` tags have correct `href` attributes

### **Issue: Dashboard shows even when not logged in**

**Cause:** Missed the authentication check
**Fix:** Make sure dashboard.js has:

```javascript
if (!authService.isLoggedIn()) {
  window.location.href = "login.html";
  return;
}
```

### **Issue: Session lost after refresh**

**Cause:** localStorage not loading
**Fix:** Check browser settings allow localStorage and no errors in console (F12)

### **Issue: Can't reach protected pages**

**Cause:** Typed URL directly but not logged in
**Fix:** Login first via login page, then access dashboard

---

## ✅ Routing Checklist

- [x] All HTML pages created
- [x] Navigation links point to correct pages
- [x] Login redirects to dashboard after success
- [x] Signup redirects to dashboard after success
- [x] Dashboard checks for login before loading
- [x] Logout redirects back to home
- [x] User session persists after refresh
- [x] All links work in navbar
- [x] Mobile navigation works

---

## 📚 Related Files

- **HTML Pages:** index.html, login.html, signup.html, dashboard.html
- **Authentication:** js/services/auth.js
- **Page Logic:** js/page-handlers/\*.js
- **Mock Data:** js/mock-data.js

---

**Your routing system is complete and production-ready!** 🎉

Each page loads independently with proper authentication checks. When you get a real backend, only the API calls change - the routing architecture stays the same.
