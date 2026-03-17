/**
 * LOGIN PAGE HANDLER
 * Manages login form submission and verification
 */

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorDiv = document.getElementById("error-message");
  const submitBtn = document.querySelector('button[type="submit"]');

  if (!loginForm) return;

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Clear previous errors
    errorDiv.style.display = "none";
    errorDiv.textContent = "";

    // Basic validation
    if (!email || !password) {
      showError("Please enter both email and password");
      return;
    }

    if (!isValidEmail(email)) {
      showError("Please enter a valid email address");
      return;
    }

    try {
      // Disable submit button during request
      submitBtn.disabled = true;
      submitBtn.textContent = "Logging in...";

      // Use auth service to login
      const user = await authService.login(email, password);

      console.log("✅ Login successful:", user);

      // Show success message and redirect
      showSuccess("Login successful! Redirecting...");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1000);
    } catch (error) {
      showError(error.message || "Login failed. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Login";
    }
  });

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    errorDiv.className = "error-message error";
  }

  function showSuccess(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    errorDiv.className = "error-message success";
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Demo credentials helper
  const demoBtn = document.getElementById("demo-login");
  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      emailInput.value = "demo@example.com";
      passwordInput.value = "demo123";
    });
  }
});
