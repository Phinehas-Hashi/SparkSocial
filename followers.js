import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const followersList = document.getElementById("followersList");

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "login.html";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));

    const data = snap.data();

    const followers = data.followers || [];

    followersList.innerHTML = "";

    if (followers.length === 0) {
        followersList.innerHTML = "<p>No followers yet.</p>";
        return;
    }

    for (const uid of followers) {

        const userSnap = await getDoc(doc(db, "users", uid));

        if (!userSnap.exists()) continue;

        const follower = userSnap.data();

        followersList.innerHTML += `
    <div class="post"
         onclick="location.href='user.html?uid=${uid}'"
         style="cursor:pointer;">

        <h3>${follower.fullname || "Lovena User"}</h3>

        <p>@${follower.username || "user"}</p>

        <p>${follower.bio || ""}</p>

    </div>
`;
    }

});