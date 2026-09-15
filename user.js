import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const uid = params.get("uid");

const profileName = document.getElementById("profileName");
const profileUsername = document.getElementById("profileUsername");
const profileBio = document.getElementById("profileBio");
const followersCount = document.getElementById("followersCount");
const followingCount = document.getElementById("followingCount");
const postsCount = document.getElementById("postsCount");
const userPosts = document.getElementById("userPosts");

onAuthStateChanged(auth, async (currentUser) => {

    if (!currentUser) {
        location.href = "login.html";
        return;
    }

    if (!uid) {
        profileName.innerHTML = "User not found";
        return;
    }

    const snap = await getDoc(doc(db, "users", uid));

    if (!snap.exists()) {
        profileName.innerHTML = "User not found";
        return;
    }

    const data = snap.data();

    profileName.innerHTML = data.fullname || "No name";

    profileUsername.innerHTML =
        "@" + (data.username || "user");

    profileBio.innerHTML =
        data.bio || "No bio";

    followersCount.innerHTML =
        data.followers ? data.followers.length : 0;

    followingCount.innerHTML =
        data.following ? data.following.length : 0;

    // Load posts
    const postsSnap = await getDocs(collection(db, "posts"));

    let count = 0;

    userPosts.innerHTML = "";

    postsSnap.forEach((docSnap) => {

        const post = docSnap.data();

        if (post.uid === uid) {

            count++;

            userPosts.innerHTML += `
                <div class="post">
                    <p>${post.content}</p>
                    <small>❤️ ${post.likes || 0} likes</small>
                </div>
            `;
        }

    });

    postsCount.innerHTML = count;

});