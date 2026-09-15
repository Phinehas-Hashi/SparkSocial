import { auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberInput = document.getElementById("rememberMe");
const button = document.getElementById("loginButton");
const errorBox = document.getElementById("loginError");
const togglePassword = document.getElementById("togglePassword");

const messages = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/user-not-found": "Incorrect email or password."
};

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const showing = passwordInput.type === "text";
    passwordInput.type = showing ? "password" : "text";
    togglePassword.textContent = showing ? "Show" : "Hide";
    togglePassword.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  });
}

onAuthStateChanged(auth, (user) => {
  if (user) location.replace(user.emailVerified ? "home.html" : "verify-email.html");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  if (!email || !password) return showError("Please enter your email and password.");

  button.disabled = true;
  button.querySelector(".button-label").textContent = "Signing in…";

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    if (!user.emailVerified) {
      // A verification email is available again from the verification screen.
      await signOut(auth);
      sessionStorage.setItem("sparkVerificationEmail", email);
      location.replace("verify-email.html");
      return;
    }

    location.replace("home.html");
  } catch (error) {
    console.error("SparkSocial login error:", error);
    showError(messages[error?.code] || "Unable to sign in. Please try again.");
    button.disabled = false;
    button.querySelector(".button-label").textContent = "Sign In";
  }
});