import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

async function getUserLocation() {
  try {
    const response = await fetch("https://ipapi.co/json/", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Location request failed");
    const data = await response.json();
    return {
      country: data.country_name || "Unknown",
      continent: data.continent_code || "Unknown"
    };
  } catch {
    return { country: "Unknown", continent: "Unknown" };
  }
}

const errorMessages = {
  "auth/email-already-in-use": "That email is already registered. Try signing in instead.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "Your password is too weak. Use at least 6 characters.",
  "auth/network-request-failed": "Network error. Check your connection and try again.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled for this project."
};

function getErrorMessage(error) {
  return errorMessages[error?.code] || "We couldn't create your account. Please try again.";
}

const signupForm = document.getElementById("signupForm");

if (signupForm) {
  const fullNameInput = document.getElementById("fullName");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const button = document.getElementById("signupButton");
  const errorBox = document.getElementById("signupError");

  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.hidden = false;
  };

  onAuthStateChanged(auth, (user) => {
    if (user) location.replace("home.html");
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.hidden = true;

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (fullName.length < 2) return showError("Please enter your full name.");
    if (password.length < 6) return showError("Your password must be at least 6 characters.");

    button.disabled = true;
    button.textContent = "Creating account…";

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const user = credential.user;
      await updateProfile(user, { displayName: fullName });
      const locationData = await getUserLocation();

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullname: fullName,
        email,
        photo: "",
        bio: "Hey there 👋 I'm using SparkSocial.",
        followers: [],
        following: [],
        likes: 0,
        verified: false,
        country: locationData.country,
        continent: locationData.continent,
        locationVerified: true,
        sparkLevel: 1,
        sparkXP: 0,
        sparkBadges: [],
        createdAt: serverTimestamp()
      });

      location.replace("home.html");
    } catch (error) {
      showError(getErrorMessage(error));
      button.disabled = false;
      button.innerHTML = "Create Account <span>→</span>";
    }
  });
}