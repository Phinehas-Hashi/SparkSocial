import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";


import {
    doc,
    getDoc,
    collection,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


// DOM

const profileName = document.getElementById("profileName");
const profileBio = document.getElementById("profileBio");
const followersCount = document.getElementById("followersCount");
const followingCount = document.getElementById("followingCount");
const followersBox = document.getElementById("followersBox");
const followingBox = document.getElementById("followingBox");
const postsCount = document.getElementById("postsCount");
const editProfileBtn =document.getElementById("editProfileBtn");
const editProfileBox = document.getElementById("editProfileBox");

const editName = document.getElementById("editName");
const editUsername = document.getElementById("editUsername");
const editBio = document.getElementById("editBio");

const saveProfileBtn = document.getElementById("saveProfileBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const myPosts = document.getElementById("myPosts");
const profileUsername =
document.getElementById("profileUsername");
const menuBtn = document.getElementById("menuBtn");
const menuDropdown = document.getElementById("menuDropdown");

// Load Profile

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        location.href = "login.html";
        return;

    }


    const userRef = doc(db, "users", user.uid);

    const snap = await getDoc(userRef);


    if (snap.exists()) {

        const data = snap.data();
        
        const creatorLevel = document.getElementById("creatorLevel");
const creatorXP = document.getElementById("creatorXP");
const xpProgress = document.getElementById("xpProgress");


let level = data.level || 1;
let xp = data.xp || 0;


creatorLevel.innerHTML =
`⚡ Spark Creator Level ${level}`;


creatorXP.innerHTML =
`${xp} XP / ${level * 100} XP`;


let progress =
(xp / (level * 100)) * 100;


xpProgress.style.width =
progress + "%";


        profileName.innerHTML =
    data.fullname || "No name";

profileUsername.innerHTML =
    "@" + (data.username || "user");

profileBio.innerHTML =
    data.bio || "No bio";

        followersCount.innerHTML =
            data.followers ? data.followers.length : 0;


        followingCount.innerHTML =
            data.following ? data.following.length : 0;


    }


    // Count posts

    const postsSnap = await getDocs(collection(db, "posts"));

    let count = 0;


    postsSnap.forEach((post) => {

        if (post.data().uid === user.uid) {

            count++;

        }

    });


    postsCount.innerHTML = count;
    loadMyPosts(user.uid);


});
editProfileBtn.addEventListener("click", async()=>{

    const user = auth.currentUser;

    const snap = await getDoc(
        doc(db,"users",user.uid)
    );


    if(snap.exists()){

        const data = snap.data();


        editName.value =
        data.fullname || "";


        editUsername.value =
        data.username || "";


        editBio.value =
        data.bio || "";

    }


    editProfileBox.style.display = "block";

});

saveProfileBtn.addEventListener("click", async()=>{

    const newName = editName.value.trim();
    const newUsername = editUsername.value.trim();
    const newBio = editBio.value.trim();


    if(!newName || !newUsername){
        alert("Name and username are required");
        return;
    }


    await updateDoc(
        doc(db,"users",auth.currentUser.uid),
        {
            fullname:newName,
            username:newUsername,
            bio:newBio
        }
    );


    profileName.innerHTML = newName;

    profileUsername.innerHTML =
    "@" + newUsername;

    profileBio.innerHTML =
    newBio;


    editProfileBox.style.display = "none";

});
async function loadMyPosts(uid){

    myPosts.innerHTML = "";

    const postsSnap = await getDocs(
        collection(db, "posts")
    );


    postsSnap.forEach((docSnap)=>{

        const post = docSnap.data();


        if(post.uid === uid){

            myPosts.innerHTML += `

            <div class="post">

                <p>${post.content}</p>

                <small>
                ❤️ ${post.likes || 0} likes
                </small>

            </div>

            `;

        }

    });

}
followersBox.addEventListener("click", () => {
    location.href = "followers.html";
});
followingBox.addEventListener("click", () => {
    location.href = "following.html";
});
menuBtn.addEventListener("click", () => {

    if (menuDropdown.style.display === "block") {

        menuDropdown.style.display = "none";

    } else {

        menuDropdown.style.display = "block";

    }

});

document.addEventListener("click", (e) => {

    if (
        !menuDropdown.contains(e.target) &&
        e.target !== menuBtn
    ) {

        menuDropdown.style.display = "none";

    }

});
const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", async(e)=>{

    e.preventDefault();

    await signOut(auth);

    location.href = "login.html";

});
if(cancelEditBtn && editProfileBox){

cancelEditBtn.addEventListener("click",()=>{

    editProfileBox.style.display = "none";

});

}