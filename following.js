import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const followingList = document.getElementById("followingList");

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "login.html";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));

    const data = snap.data();

    const following = data.following || [];

    followingList.innerHTML = "";

    if (following.length === 0) {
        followingList.innerHTML = "<p>You're not following anyone yet.</p>";
        return;
    }

    for (const uid of following) {

        const userSnap = await getDoc(doc(db, "users", uid));

        if (!userSnap.exists()) continue;

        const person = userSnap.data();

        followingList.innerHTML += `
    <div class="post"
         onclick="location.href='user.html?uid=${uid}'"
         style="cursor:pointer;">

        <h3>${following.fullname || "Lovena User"}</h3>

        <p>@${following.username || "user"}</p>

        <p>${following.bio || ""}</p>

    </div>
`;
    }

});