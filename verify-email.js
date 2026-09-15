import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  sendEmailVerification,
  reload,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const emailLabel = document.getElementById("verificationEmail");
const statusBox = document.getElementById("verificationStatus");
const errorBox = document.getElementById("verificationError");
const checkButton = document.getElementById("checkVerification");
const resendButton = document.getElementById("resendVerification");
const signOutButton = document.getElementById("signOutButton");

let currentUser = null;
let resendCooldown = false;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function setStatus(message, success = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("success", success);
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (!user) {
    location.replace("login.html");
    return;
  }

  if (user.emailVerified) {
    location.replace("home.html");
    return;
  }

  emailLabel.textContent = user.email || "your email address";
});

checkButton.addEventListener("click", async () => {
  if (!currentUser) return;
  checkButton.disabled = true;
  errorBox.hidden = true;
  setStatus("Checking verification…");

  try {
    await reload(currentUser);
    if (currentUser.emailVerified) {
      setStatus("Email verified. Opening SparkSocial…", true);
      setTimeout(() => location.replace("home.html"), 400);
    } else {
      setStatus("Not verified yet. Open the latest email from SparkSocial, tap the verification link, then try again.");
      checkButton.disabled = false;
    }
  } catch (error) {
    console.error("Verification check error:", error);
    showError("We couldn't check your verification status. Please try again.");
    checkButton.disabled = false;
  }
});

resendButton.addEventListener("click", async () => {
  if (!currentUser || resendCooldown) return;
  resendCooldown = true;
  resendButton.disabled = true;
  errorBox.hidden = true;

  try {
    await sendEmailVerification(currentUser);
    setStatus("A fresh verification email has been sent. Check your inbox and spam folder.", true);
  } catch (error) {
    console.error("Verification email error:", error);
    if (error?.code === "auth/too-many-requests") {
      showError("Please wait before requesting another verification email.");
    } else {
      showError("We couldn't send the verification email. Check your connection and try again.");
    }
  } finally {
    setTimeout(() => {
      resendCooldown = false;
      resendButton.disabled = false;
    }, 60000);
  }
});

signOutButton.addEventListener("click", async () => {
  signOutButton.disabled = true;
  await signOut(auth);
  location.replace("login.html");
});