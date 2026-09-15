import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const button = document.getElementById("loginButton");
const errorBox = document.getElementById("loginError");

const showError = (message) => {
  errorBox.textContent = message;
  errorBox.hidden = false;
};

onAuthStateChanged(auth, (user) => {
  if (user) location.replace("home.html");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    showError("Please enter your email and password.");
    return;
  }

  button.disabled = true;
  button.textContent = "Signing in…";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    location.replace("home.html");
  } catch (error) {
    const messages = {
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/too-many-requests": "Too many attempts. Please wait and try again.",
      "auth/user-disabled": "This account has been disabled.",
    };
    showError(messages[error.code] || "Unable to sign in. Please try again.");
    button.disabled = false;
    button.textContent = "Continue";
  }
});