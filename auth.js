import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const form = document.getElementById("signupForm");
if (!form) throw new Error("Signup form not found.");

const displayNameInput = document.getElementById("displayName");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const termsInput = document.getElementById("terms");
const button = document.getElementById("signupButton");
const errorBox = document.getElementById("signupError");
const togglePassword = document.getElementById("togglePassword");

const errorMessages = {
  "auth/email-already-in-use": "That email is already registered. Try signing in instead.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Use a stronger password with at least 8 characters.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/operation-not-allowed": "Email/password accounts are not enabled in Firebase yet.",
  "auth/too-many-requests": "Too many attempts. Please wait a little and try again.",
  "permission-denied": "We couldn't save your profile. Check your Firestore rules and try again."
};

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function normalizeUsername(value) {
  return value.trim().toLowerCase();
}

function validPassword(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const showing = passwordInput.type === "text";
    passwordInput.type = showing ? "password" : "text";
    togglePassword.textContent = showing ? "Show" : "Hide";
    togglePassword.setAttribute("aria-label", showing ? "Show password" : "Hide password");
  });
}

// Never redirect a signed-in but unverified account into the app.
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (user.emailVerified) location.replace("home.html");
    else location.replace("verify-email.html");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;

  const displayName = displayNameInput.value.trim();
  const username = normalizeUsername(usernameInput.value);
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  if (displayName.length < 2) return showError("Please enter a display name.");
  if (!/^[a-z0-9_.]{3,24}$/.test(username)) return showError("Username must be 3–24 characters using letters, numbers, underscores or periods.");
  if (!validPassword(password)) return showError("Password must be 8+ characters and contain at least one letter and one number.");
  if (!termsInput.checked) return showError("Please accept the community and privacy terms to continue.");

  button.disabled = true;
  button.querySelector(".button-label").textContent = "Creating account…";

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Reserve the username atomically so two accounts cannot claim it simultaneously.
    try {
      await runTransaction(db, async (transaction) => {
        const usernameRef = doc(db, "usernames", username);
        const existing = await transaction.get(usernameRef);
        if (existing.exists()) throw new Error("USERNAME_TAKEN");

        const userRef = doc(db, "users", user.uid);
        transaction.set(usernameRef, {
          uid: user.uid,
          username,
          createdAt: serverTimestamp()
        });
        transaction.set(userRef, {
          uid: user.uid,
          username,
          usernameLower: username,
          displayName,
          displayNameLower: displayName.toLowerCase(),
          email,
          photoURL: "",
          coverURL: "",
          bio: "Hey there 👋 I'm using SparkSocial.",
          location: null,
          accountType: "user",
          isVerified: false,
          isPrivate: false,
          isOnline: false,
          lastSeenAt: null,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          sparkXP: 0,
          sparkLevel: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
    } catch (profileError) {
      await user.delete().catch(() => {});
      if (profileError?.message === "USERNAME_TAKEN") throw new Error("USERNAME_TAKEN");
      throw profileError;
    }

    await updateProfile(user, { displayName });
    await sendEmailVerification(user);
    location.replace("verify-email.html");
  } catch (error) {
    if (error?.message === "USERNAME_TAKEN") {
      showError("That username is already taken. Choose another one.");
    } else {
      console.error("SparkSocial signup error:", error);
      showError(errorMessages[error?.code] || "We couldn't create your account. Please try again.");
    }
    button.disabled = false;
    button.querySelector(".button-label").textContent = "Create Account";
  }
});