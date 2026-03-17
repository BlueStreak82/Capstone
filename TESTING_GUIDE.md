# 🧪 Testing Guide - Academic Performance Tracker

Complete testing instructions for your multi-page routing system.

---

## ✅ Quick Start Testing

### **1. Start the Server**

**Option A: VS Code Live Server (Easiest)**

- Right-click `index.html`
- Select "Open with Live Server"
- Browser opens to `http://localhost:5500`

**Option B: Python HTTP Server**

```bash
cd c:\Users\jrask\Desktop\Capstone
python -m http.server 8000
```

Then visit: `http://localhost:8000`

**Option C: Node.js http-server**

```bash
npx http-server
```

---

## 🎯 Test Scenarios

### **Scenario 1: Navigation from Home Page**

1. **Open homepage:** `http://localhost:5500` (or 8000)
2. **Verify elements:**
   - ✅ See "Academic Tracker" title
   - ✅ See navigation links (Home, Login, Sign Up)
   - ✅ See hero section with buttons
   - ✅ See features cards

3. **Test links:**
   - Click "Get Started" → Should go to signup.html
   - Click "Login" button → Should go to login.html
   - Click "Sign Up" link → Should go to signup.html
   - Navbar "Home" link → Should stay on index.html

**Expected:** Pages load correctly, URL changes in address bar

---

### **Scenario 2: Testing Login**

1. **Go to login page:** Click "Login" from home
2. **Verify page loaded:**
   - ✅ See login form
   - ✅ See email input
   - ✅ See password input
   - ✅ See "Demo" button
   - ✅ Link to sign up at bottom

3. **Test Demo Login:**
   - Click "Demo" button
   - Should auto-fill: `demo@example.com` / `demo123`
   - Click "Sign In"
   - Should show "Login successful!"
   - Should redirect to dashboard.html

4. **Test Regular Login (Second Time):**
   - Go back to login page
   - Enter email: `john@example.com`
   - Enter password: `password123`
   - Click "Sign In"
   - Should redirect to dashboard

5. **Test Invalid Login:**
   - Go to login page
   - Enter: `demo@example.com` / `wrong-password`
   - Click "Sign In"
   - Should show error: "Invalid password"
   - Should stay on login page

**Expected:** Error handling works, valid credentials redirect to dashboard

---

### **Scenario 3: Testing Signup**

1. **Go to signup page:** Click "Sign Up" link
2. **Verify page loaded:**
   - ✅ See signup form
   - ✅ See Name, Email, Password fields
   - ✅ See password confirmation
   - ✅ Link to login at bottom

3. **Test Create Account:**
   - Name: `Test User`
   - Email: `testuser@example.com`
   - Password: `password123`
   - Confirm: `password123`
   - Click "Create Account"
   - Should show "Account created!"
   - Should redirect to dashboard

4. **Test Password Validation:**
   - Enter different passwords in confirm field
   - Should show real-time feedback: "✗ Passwords do not match"
   - Should not allow submit until they match

5. **Test Duplicate Email:**
   - Try signing up with `demo@example.com` (already exists)
   - Should show error: "Email already registered"

6. **Test Short Password:**
   - Password: `123` (less than 6 characters)
   - Click submit
   - Should show error: "Password must be at least 6 characters"

**Expected:** Validation works, new users created, redirects to dashboard

---

### **Scenario 4: Testing Dashboard**

1. **After successful login/signup:**
   - Should land on dashboard.html
   - URL should show: `http://localhost:5500/dashboard.html`

2. **Verify dashboard content:**
   - ✅ See user's name at top
   - ✅ See user's email
   - ✅ See statistics (GPA, Average Grade, etc.)
   - ✅ See courses listed with grades
   - ✅ See recent study sessions
   - ✅ See logout button

3. **Verify data displays correctly (Demo User):**
   - Should show 5 courses
   - GPA should be around 87.67
   - Should show study sessions
   - Statistics should calculate correctly

4. **Test Logout:**
   - Click "Logout" button
   - Should ask confirmation: "Are you sure?"
   - Should redirect to index.html
   - Should clear localStorage (session lost)

**Expected:** Dashboard loads with correct data, logout returns home

---

### **Scenario 5: Protected Page Test**

1. **Open new browser tab/window**
2. **Try accessing dashboard directly:**
   - Type: `http://localhost:5500/dashboard.html`
   - Press Enter
   - Should immediately redirect to login.html ✅
   - Should NOT show dashboard content

3. **Logout and try accessing dashboard:**
   - Click Logout (you'll be on home)
   - Type dashboard URL again
   - Should redirect to login (because localStorage cleared)

**Expected:** Dashboard can't be accessed without login

---

### **Scenario 6: Session Persistence**

1. **Login as demo user**
2. **Verify on dashboard**
3. **Refresh page (Ctrl+R or F5)**
   - Should stay on dashboard ✅
   - User data should reload
   - Session maintained (localStorage!)

4. **Close browser completely** (not just tab)
5. **Reopen browser**
6. **Go to your project URL**
   - Might still see last page
   - But if you manually go to dashboard.html
   - Should still be logged in! ✅

**Expected:** User stays logged in after page refresh and browser restart

---

### **Scenario 7: Light/Dark Mode**

1. **On any page:**
   - Look at navbar
   - Click sun/moon icon
   - Should toggle between light and dark theme
   - Theme should persist on other pages
   - Should persist after refresh

2. **Switch to dark mode**
3. **Go to different page (login → dashboard)**
   - Should still be in dark mode ✅

**Expected:** Theme toggle works on all pages, persists session-wide

---

### **Scenario 8: Mobile Responsiveness**

1. **Open any page**
2. **Press F12** (Developer Tools)
3. **Click device toggle** (Ctrl+Shift+M)
4. **Test different sizes:**
   - iPhone (375px) → Page should stack vertically
   - Tablet (768px) → Layout should adjust
   - Desktop (1024px+) → Full layout
   - All buttons and links should be clickable

**Expected:** Pages look good and work on all sizes

---

## 📊 Data Flow Testing

### **Test Mock Data is Being Used**

1. **Open Developer Console (F12)**
2. **Go to Console tab**
3. **Login successfully**
4. **Should see:** `✅ Login successful: {user object}`
5. **Check that:**
   - User ID matches mock data (1, 2, or 3)
   - Courses are from MOCK_GRADES
   - Study sessions are from MOCK_STUDY_SESSIONS

### **Verify localStorage**

1. **Open Developer Tools (F12)**
2. **Go to Application → Storage → Local Storage**
3. **After login, should see:**
   - Key: `academic-tracker-user`
   - Value: `{"id":1,"email":"demo@example.com",...}`

4. **After logout:**
   - Key should be deleted

**Expected:** Data in localStorage matches your sessions

---

## 🔍 Console Debugging

### **Check for Errors**

1. **Open F12 Developer Tools**
2. **Go to Console tab**
3. **Check that NO RED ERRORS show**
4. **Expected messages:**
   ```
   ✅ All modules initialized successfully! (from script.js)
   ✅ Login successful: {user} (after login)
   ```

### **If Errors Appear:**

- **"authService is not defined"** → File loading order wrong
- **"Cannot read property 'isLoggedIn'"** → Mock data not loaded
- **"File not found 404"** → Check file path in script tags

---

## 📱 Test Checklist

Print this and check off as you go:

### Home Page

- [ ] Page loads
- [ ] Navigation links work
- [ ] Buttons direct to correct pages
- [ ] Light/dark mode toggle works
- [ ] Responsive on mobile

### Login Page

- [ ] Page loads
- [ ] Demo button fills credentials
- [ ] Valid login redirects to dashboard
- [ ] Invalid password shows error
- [ ] Link to signup works

### Signup Page

- [ ] Page loads
- [ ] Form validates inputs
- [ ] Password confirmation works
- [ ] New account created redirects to dashboard
- [ ] Duplicate email shows error
- [ ] Link to login works

### Dashboard Page

- [ ] Page loads after login
- [ ] Cannot access without login
- [ ] User data displays correctly
- [ ] Logout button works
- [ ] Session persists on refresh
- [ ] Responsive on mobile

### Data

- [ ] Demo user has correct grades
- [ ] John user has different grades
- [ ] Study sessions display
- [ ] GPA calculates correctly
- [ ] Statistics update correctly

---

## 🐛 Troubleshooting

### **Problem: "Page not found" or blank page**

- Check file exists (list_dir in terminal)
- Check file path in href is correct
- Refresh browser (Ctrl+Shift+R for hard refresh)

### **Problem: Login doesn't redirect**

- Check browser console (F12) for errors
- Check mock-data.js is loading
- Try demo credentials first

### **Problem: Session doesn't persist**

- Check localStorage is enabled (F12 → Application → Storage)
- Check no "Incognito" mode (blocks localStorage)
- Check password was entered correctly

### **Problem: Theme doesn't change**

- Verify theme-toggle button exists in HTML
- Check script.js is loading
- Refresh page and try again

### **Problem: Responsive design broken**

- Check viewport meta tag exists
- Press F12 and toggle device mode (Ctrl+Shift+M)
- Check media queries in CSS

---

## ✅ Success Criteria

Your project is working correctly if you can:

1. ✅ Navigate between all pages using links
2. ✅ Login with demo/john/jane credentials
3. ✅ See dashboard with their correct data
4. ✅ Create new user account
5. ✅ Logout and return home
6. ✅ Cannot access dashboard without login
7. ✅ Toggle light/dark mode on all pages
8. ✅ Session persists after page refresh
9. ✅ No console errors appear
10. ✅ Pages work on mobile devices

---

## 🎉 You're Done!

When all tests pass, your multi-page routing system is complete and working!

**Next Steps:**

- Show your team the working pages
- Ask for feedback on design
- Plan backend integration
- Replace MockData with real API calls
