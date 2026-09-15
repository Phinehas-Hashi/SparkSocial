import { auth } from "./firebase.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const form = document.getElementById("resetForm");
const emailInput = document.getElementById("email");
const button = document.getElementById("resetButton");
const messageBox = document.getElementById("resetMessage");
const errorBox = document.getElementById("resetError");

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  messageBox.hidden = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  messageBox.hidden = true;

  const email = emailInput.value.trim().toLowerCase();
  if (!email) return showError("Enter the email address linked to your account.");

  button.disabled = true;
  button.querySelector(".button-label").textContent = "Sending…";

  try {
    await sendPasswordResetEmail(auth, email);
    messageBox.textContent = "If an account exists for that email, a password-reset link has been sent. Check your inbox and spam folder.";
    messageBox.hidden = false;
    form.reset();
  } catch (error) {
    console.error("SparkSocial password reset error:", error);
    if (error?.code === "auth/invalid-email") showError("Please enter a valid email address.");
    else if (error?.code === "auth/too-many-requests") showError("Too many requests. Please wait and try again later.");
    else showError("We couldn't send the reset email. Please check your connection and try again.");
  } finally {
    button.disabled = false;
    button.querySelector(".button-label").textContent = "Send Reset Link";
  }
});