import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    collection,
    getDocs,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
const usersList = document.getElementById("usersList");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "login.html";
        return;
    }

    currentUser = user;

    loadUsers();

});
async function loadUsers() {

    usersList.innerHTML = "Loading users...";

    const snapshot = await getDocs(collection(db, "users"));

    usersList.innerHTML = "";

    snapshot.forEach((docSnap) => {

        if (docSnap.id === currentUser.uid) return;

        const user = docSnap.data();
user.uid = docSnap.id;

      usersList.innerHTML += `
<div class="post">

    <div onclick="location.href='user.html?uid=${user.uid}'"
         style="cursor:pointer;">

        <h3>${user.fullname || "No name"}</h3>

        <p>@${user.username || "user"}</p>

    </div>

    <button onclick="event.stopPropagation(); followUser('${user.uid}')">
        Follow
    </button>

</div>
`;

    });

}
async function followUser(targetUid) {

    try {

        await updateDoc(doc(db, "users", currentUser.uid), {
            following: arrayUnion(targetUid)
        });

        await updateDoc(doc(db, "users", targetUid), {
            followers: arrayUnion(currentUser.uid)
        });

        alert("Followed successfully!");

    } catch (error) {
        console.error(error);
        alert(error.message);
    }

}

window.followUser = followUser;