import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const signupForm = document.getElementById("signupForm");

const continentMap = {
  Kenya:"Africa", Nigeria:"Africa", "South Africa":"Africa", Egypt:"Africa",
  Canada:"North America", "United States":"North America", Mexico:"North America",
  Brazil:"South America", Argentina:"South America",
  "United Kingdom":"Europe", Germany:"Europe", France:"Europe",
  India:"Asia", China:"Asia", Japan:"Asia", Australia:"Oceania"
};

async function getUserLocation() {
  try {
    const response = await fetch("https://ipapi.co/json/", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Location lookup failed");
    const data = await response.json();
    const country = data.country_name || "Unknown";
    return { country, continent: continentMap[country] || "Unknown" };
  } catch {
    return { country: "Unknown", continent: "Unknown" };
  }
}

if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    if (fullName.length < 2) return alert("Please enter your full name.");
    if (password.length < 6) return alert("Password must be at least 6 characters.");

    const button = signupForm.querySelector("button[type=submit]");
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
        locationVerified: false,
        sparkLevel: 1,
        sparkXP: 0,
        sparkBadges: [],
        createdAt: serverTimestamp()
      });

      location.replace("home.html");
    } catch (error) {
      const messages = {
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Please choose a stronger password.",
      };
      alert(messages[error.code] || "Unable to create your account. Please try again.");
      button.disabled = false;
      button.textContent = "Create My Account";
    }
  });
}