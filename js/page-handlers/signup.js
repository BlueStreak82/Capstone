/**
 * SIGNUP PAGE HANDLER
 * Manages signup form submission and new user registration
 */

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signup-form");
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const errorDiv = document.getElementById("error-message");
  const submitBtn = document.querySelector('button[type="submit"]');

  if (!signupForm) return;

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Clear previous errors
    errorDiv.style.display = "none";
    errorDiv.textContent = "";

    // Validation
    const validationError = validateForm(
      name,
      email,
      password,
      confirmPassword,
    );
    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      // Disable submit button during request
      submitBtn.disabled = true;
      submitBtn.textContent = "Creating Account...";

      // Use auth service to signup
      const user = await authService.signup(email, password, name);

      console.log("✅ Signup successful:", user);

      // Show success message and redirect
      showSuccess("Account created successfully! Redirecting to dashboard...");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } catch (error) {
      showError(error.message || "Signup failed. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account";
    }
  });

  function validateForm(name, email, password, confirmPassword) {
    if (!name || !email || !password || !confirmPassword) {
      return "Please fill in all fields";
    }

    if (name.length < 2) {
      return "Name must be at least 2 characters";
    }

    if (!isValidEmail(email)) {
      return "Please enter a valid email address";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      return "Passwords do not match";
    }

    return null;
  }

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

  // Real-time password match validation
  confirmPasswordInput.addEventListener("input", () => {
    const matchIndicator = document.getElementById("password-match");
    if (matchIndicator) {
      if (
        passwordInput.value === confirmPasswordInput.value &&
        confirmPasswordInput.value
      ) {
        matchIndicator.textContent = "✓ Passwords match";
        matchIndicator.style.color = "green";
      } else if (confirmPasswordInput.value) {
        matchIndicator.textContent = "✗ Passwords do not match";
        matchIndicator.style.color = "red";
      } else {
        matchIndicator.textContent = "";
      }
    }
  });
});
