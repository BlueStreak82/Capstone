# 🔄 Transitioning to Real Backend

Complete guide for swapping mock data with real API calls.

---

## 🎯 The Good News

**Your routing will NOT change!**

When you get a real backend, you only change:

- 🔄 API calls (one service file)
- Not: HTML pages, routing logic, page handlers, or UI

---

## 📋 What Your Backend Needs

Your backend should provide these endpoints:

### **Authentication**


**1. Login**

```
POST /api/auth/login
Body: { email, password }
Response: { id, email, name, createdAt }
```

**2. Signup**

```
POST /api/auth/signup
Body: { email, password, name }
Response: { id, email, name, createdAt }
```

### **Grades**

**3. Get User's Grades**

```
GET /api/users/:userId/grades
Response: [
    { id, name, grade, creditHours, semester },
    ...
]
```

**4. Add Grade**

```
POST /api/users/:userId/grades
Body: { name, grade, creditHours, semester }
Response: { id, name, grade, creditHours, semester }
```

### **Study Sessions**

**5. Get Study Sessions**

```
GET /api/users/:userId/study-sessions
Response: [
    { id, courseId, courseName, date, hoursSpent, materials, notes },
    ...
]
```

**6. Add Study Session**

```
POST /api/users/:userId/study-sessions
Body: { courseId, courseName, date, hoursSpent, materials, notes }
Response: { id, courseId, courseName, ... }
```

---

## 🔧 Step-by-Step Conversion

### **Current: Using MockData**

```javascript
// In auth.js (CURRENT)
async login(email, password) {
    const user = await MockData.loginUser(email, password); // ← Mock!
    this.currentUser = user;
    this._saveToStorage(user);
    return user;
}
```

### **After: Using Real API**

```javascript
// In auth.js (AFTER BACKEND)
async login(email, password) {
    // Call real API instead
    const response = await fetch('https://api.example.com/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });

    // Check if response is OK
    if (!response.ok) {
        throw new Error('Login failed');
    }

    // Parse JSON response
    const user = await response.json();

    this.currentUser = user;
    this._saveToStorage(user);
    return user;
}
```

**That's it! Everything else stays the same!** ✅

---

## 📝 Complete Migration Guide

### **File: auth.js**

**Replace this:**

```javascript
async login(email, password) {
    try {
        const user = await MockData.loginUser(email, password);

        this.currentUser = user;
        this._saveToStorage(user);
        return user;
    } catch (error) {
        throw new Error(error.message);
    }
}
```

**With this:**

```javascript
async login(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        const user = await response.json();
        this.currentUser = user;
        this._saveToStorage(user);
        return user;
    } catch (error) {
        throw new Error(error.message);
    }
}
```

### **File: grades.js**

**Replace this:**

```javascript
async getGrades() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not logged in');

    return await MockData.getGradesByUserId(user.id);
}
```

**With this:**

```javascript
async getGrades() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const response = await fetch(`/api/users/${user.id}/grades`, {
        headers: { 'Authorization': `Bearer ${user.token}` } // If using JWT
    });

    if (!response.ok) throw new Error('Failed to fetch grades');

    return await response.json();
}
```

### **File: study-tracker.js**

**Replace this:**

```javascript
async getSessions() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not logged in');

    return await MockData.getStudySessions(user.id);
}
```

**With this:**

```javascript
async getSessions() {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Not logged in');

    const response = await fetch(`/api/users/${user.id}/study-sessions`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch sessions');

    return await response.json();
}
```

---

## 🔐 Handling Authentication Tokens

If your backend uses JWT tokens:

### **Updated auth.js with Token**

```javascript
async login(email, password) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error('Login failed');

    const data = await response.json();

    // Save user AND token
    const user = {
        ...data.user,
        token: data.token // Store token!
    };

    this.currentUser = user;
    this._saveToStorage(user); // Token saved with user
    return user;
}
```

### **Using Token in Requests**

```javascript
async getGrades() {
    const user = authService.getCurrentUser();

    const response = await fetch(`/api/users/${user.id}/grades`, {
        headers: {
            'Authorization': `Bearer ${user.token}` // Send token!
        }
    });

    return await response.json();
}
```

---

## 🚀 Common Backend Integration Patterns

### **Pattern 1: Environment Variables**

```javascript
// Top of auth.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        ...
    });
}
```

### **Pattern 2: API Helper Function**

```javascript
// Create api.js helper file
class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    async request(endpoint, options = {}) {
        const user = authService.getCurrentUser();

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(user?.token && { 'Authorization': `Bearer ${user.token}` }),
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }

        return await response.json();
    }

    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    }

    get(endpoint) {
        return this.request(endpoint);
    }
}

const apiClient = new ApiClient('https://api.example.com');

// Then use in services:
async login(email, password) {
    const user = await apiClient.post('/api/auth/login', { email, password });
    this.currentUser = user;
    this._saveToStorage(user);
    return user;
}
```

### **Pattern 3: Error Handling**

```javascript
async login(email, password) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        // Handle different error codes
        if (response.status === 401) {
            throw new Error('Invalid email or password');
        }

        if (response.status === 429) {
            throw new Error('Too many login attempts. Try again later.');
        }

        if (!response.ok) {
            throw new Error('Login server error. Please try again.');
        }

        const user = await response.json();
        this.currentUser = user;
        this._saveToStorage(user);
        return user;

    } catch (error) {
        // Handle network errors
        if (error instanceof TypeError) {
            throw new Error('Network error. Check your connection.');
        }
        throw error;
    }
}
```

---

## ✅ Migration Checklist

When you get your backend:

- [ ] Backend endpoints tested and working
- [ ] Replace MockData calls in auth.js
- [ ] Replace MockData calls in grades.js
- [ ] Replace MockData calls in study-tracker.js
- [ ] Test each page after changes
- [ ] Check console for errors
- [ ] Verify all API responses match expected format
- [ ] Handle error cases (network errors, auth errors)
- [ ] Update documentation with new API endpoints
- [ ] Delete mock-data.js (no longer needed)

---

## 🧪 Testing the API Integration

### **Before Going Live**

1. **Keep mock data temporarily**
   - This lets you test UI while backend is being built

2. **Create both versions**

   ```javascript
   // config.js
   export const USE_MOCK_DATA = !process.env.REACT_APP_USE_REAL_API;
   ```

   ```javascript
   // auth.js
   async login(email, password) {
       if (USE_MOCK_DATA) {
           return await MockData.loginUser(email, password);
       } else {
           return await fetch('/api/auth/login', ...);
       }
   }
   ```

3. **Switch between modes**

   ```
   npm start // Uses mock
   REACT_APP_USE_REAL_API=true npm start // Uses real API
   ```

4. **Test thoroughly before switching**
   - Test all pages
   - Test all interactions
   - Check error handling
   - Verify data displays correctly

---

## 🔍 Debugging API Issues

### **Network Tab (F12)**

1. Open Developer Tools
2. Go to Network tab
3. Reload page
4. Click each request to see:
   - Request headers
   - Request body
   - Response status
   - Response body

### **Console Errors**

If you see:

- **"Cross-Origin Request Blocked"** → Your backend needs CORS headers
- **"401 Unauthorized"** → Token not being sent
- **"404 Not Found"** → Wrong endpoint URL

### **Common Issues**

| Error            | Cause                          | Fix                         |
| ---------------- | ------------------------------ | --------------------------- |
| CORS error       | Backend doesn't allow requests | Add CORS headers to backend |
| 401 Unauthorized | No/wrong token                 | Check token is saved & sent |
| 404 Not Found    | Wrong URL                      | Verify endpoint path        |
| Empty response   | API returns null               | Check API implementation    |
| Timeout          | Server too slow                | Increase timeout value      |

---

## 🎉 You're Ready!

Your code is structured perfectly for backend integration. When you get your API:

1. Get the docs from backend team
2. Follow the migration steps above
3. Test thoroughly
4. Deploy!

**Your routing, UI, and page logic changes: ZERO** ✅

---

## 📚 Reference

**Files to change for backend integration:**

- `js/services/auth.js` - Login/signup
- `js/services/grades.js` - Grade operations
- `js/services/study-tracker.js` - Study tracking

**Files to delete:**

- `js/mock-data.js` - No longer needed

**Files that don't change:**

- All HTML files
- All page handlers
- All CSS
- Routing logic

---

**Your architecture is backend-agnostic. Well done!** 🚀
