import { auth } from "./firebase.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

document.getElementById("backBtn").addEventListener("click", () => {
    history.back();
});

document.getElementById("editProfile").addEventListener("click", () => {
    location.href = "edit-profile.html";
});

document.getElementById("privacy").addEventListener("click", () => {
    location.href = "privacy.html";
});

document.getElementById("notifications").addEventListener("click", () => {
    location.href = "notifications.html";
});

document.getElementById("faq").addEventListener("click", () => {
    location.href = "faq.html";
});

document.getElementById("privacyPolicy").addEventListener("click", () => {
    location.href = "privacy-policy.html";
});

document.getElementById("terms").addEventListener("click", () => {
    location.href = "terms.html";
});

document.getElementById("about").addEventListener("click", () => {
    location.href = "about.html";
});

document.getElementById("logout").addEventListener("click", async () => {

    if (confirm("Log out of Lovena?")) {

        await signOut(auth);

        location.href = "login.html";

    }

});