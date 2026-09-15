import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    updateDoc,
    increment,
    doc,
    getDoc,
    setDoc,
    arrayUnion,
    arrayRemove,
    where
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// ===========================
// DOM
// ===========================

const postContent = document.getElementById("postContent");
const postBtn = document.getElementById("postBtn");
const feed = document.getElementById("feed");
const notificationBtn =
document.getElementById("notificationBtn");
const notificationBadge =
document.getElementById("notificationBadge");
const homeTab = document.getElementById("homeTab");
const discoverTab = document.getElementById("discoverTab");

const homeScreen = document.getElementById("homeScreen");
const discoverScreen = document.getElementById("discoverScreen");

const usersList = document.getElementById("usersList");
const profileTab = document.getElementById("profileTab");
const createTab = document.getElementById("createTab");
const messagesTab = document.getElementById("messagesTab");

let currentUser = null;
let currentUserData = null;

// ===========================
// NAVIGATION
// ===========================

homeTab.addEventListener("click", () => {

    homeScreen.style.display = "block";
    discoverScreen.style.display = "none";

});

discoverTab.addEventListener("click", () => {

    homeScreen.style.display = "none";
    discoverScreen.style.display = "block";

    loadUsers();

});
profileTab.addEventListener("click", () => {

    location.href = "profile.html";

});
createTab.addEventListener("click", () => {

    location.href = "create.html";

});
messagesTab.addEventListener("click", () => {

    location.href = "messages.html";

});
notificationBtn.addEventListener("click",()=>{

    location.href = "notifications.html";

});
// ===========================
// AUTH
// ===========================

onAuthStateChanged(auth, async (user) => {
  
  console.log("AUTH USER:", user);

    if (!user) {

        console.log("No logged in user");

        location.href = "login.html";
        return;

    }


    currentUser = user;


    const mySnap = await getDoc(
        doc(db, "users", currentUser.uid)
    );


    if (mySnap.exists()) {

        currentUserData = mySnap.data();

    } else {

        currentUserData = {};

    }


    loadPosts();
    const notificationQuery = query(
    collection(db, "notifications"),
    where("receiver", "==", currentUser.uid),
    where("read", "==", false)
);

onSnapshot(notificationQuery, (snapshot) => {

    const count = snapshot.size;

    if (count > 0) {

        notificationBadge.style.display = "block";
        notificationBadge.innerHTML = count;

    } else {

        notificationBadge.style.display = "none";

    }

});

});


// ===========================
// CREATE POST
// ===========================

postBtn.addEventListener("click", async () => {

    const text = postContent.value.trim();

    if (!text) return;

    await addDoc(collection(db, "posts"), {

    uid: currentUser.uid,
    username: currentUserData.fullname || currentUser.displayName || "User",

    founder: currentUserData.founder || false,
    ceo: currentUserData.ceo || false,
    verified: currentUserData.verified || false,
    premium: currentUserData.premium || false,

    content: text,
    likes: 0,
    likedBy: [],
    createdAt: serverTimestamp()

});
  

    postContent.value = "";

});


// ===========================
// LOAD POSTS
// ===========================

function loadPosts() {

    console.log("Loading posts...");

    const q = query(
        collection(db, "posts"),
        orderBy("createdAt", "desc")
    );

    onSnapshot(q, (snapshot) => {

        feed.innerHTML = "";

        snapshot.forEach((docSnap) => {

            const post = docSnap.data();
            const liked =
    post.likedBy &&
    post.likedBy.includes(currentUser.uid);

            feed.innerHTML += `

                <div class="post-header">

    <div class="avatar">

        ${(post.username || "L").charAt(0).toUpperCase()}

    </div>

    <div>

        <h3 onclick="location.href='user.html?uid=${post.uid}'"
        style="cursor:pointer;">

            ${post.username || "Lovena User"}

            ${post.founder ? " 👑" : ""}
            ${post.ceo ? " 💼" : ""}
            ${post.verified ? " ✅" : ""}
            ${post.premium ? " 💎" : ""}

        </h3>

    </div>

</div>

                    <p>${post.content}</p>

                    <div class="post-actions">

                        <button
                            class="likeBtn"
                            data-id="${docSnap.id}">

                            ${liked ? "❤️" : "🤍"} ${post.likes || 0}

                        </button>

                    </div>

                    <div class="comments">

    <div class="comment-section">

    <div id="comments-${docSnap.id}" class="comments"></div>

    <div class="comment-input-box">

        <input
            type="text"
            id="commentInput-${docSnap.id}"
            placeholder="Write a comment...">

        <button
            class="sendCommentBtn"
            data-id="${docSnap.id}">
            ➤
        </button>

    </div>

</div>

                </div>

            `;

        });

        // Load comments for every post
        snapshot.forEach((docSnap) => {

            loadComments(docSnap.id);

        });

    });

}
document.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("followBtn")) return;

    if (!currentUser) {
        alert("Please login first");
        return;
    }

    const otherUid = e.target.dataset.id;

    const myRef = doc(db, "users", currentUser.uid);
    const otherRef = doc(db, "users", otherUid);

    try {

        const amIFollowing =
    currentUserData.following &&
    currentUserData.following.includes(otherUid);

if (amIFollowing) {

    // UNFOLLOW
    await updateDoc(myRef, {
        following: arrayRemove(otherUid)
    });

    await updateDoc(otherRef, {
        followers: arrayRemove(currentUser.uid)
    });

    currentUserData.following =
        (currentUserData.following || []).filter(uid => uid !== otherUid);

    e.target.innerHTML = "➕ Follow";
    e.target.disabled = false;

} else {

    // FOLLOW
    await setDoc(myRef, {
        following: arrayUnion(otherUid)
    }, { merge: true });

    await setDoc(otherRef, {
        followers: arrayUnion(currentUser.uid)
    }, { merge: true });

    currentUserData.following = [
        ...(currentUserData.following || []),
        otherUid
    ];

    e.target.innerHTML = "Following ❤️";
    e.target.disabled = false;
}
if (otherUid !== currentUser.uid) {
await addDoc(
    collection(db,"notifications"),
    {
        receiver: otherUid,
        sender: currentUser.uid,
        senderName: currentUserData.fullname || currentUser.displayName,
        type: "follow",
        read: false,
        createdAt: serverTimestamp()
    }
);

}
        e.target.innerHTML = "Following ❤️";
        

    } catch(error) {

        console.error("Follow error:", error);
        alert(error.message);

    }

});
function loadComments(postId){

    const commentsBox =
        document.getElementById(`comments-${postId}`);

    if(!commentsBox) return;

    const q = query(
        collection(db,"posts",postId,"comments"),
        orderBy("createdAt","asc")
    );

    onSnapshot(q,(snapshot)=>{

        commentsBox.innerHTML="";

        snapshot.forEach((docSnap)=>{

            const comment = docSnap.data();

            commentsBox.innerHTML += `
<div class="comment">

    <div class="comment-header">

        <div class="avatar small-avatar">

            ${(comment.username || "L").charAt(0).toUpperCase()}

        </div>

        <div>

            <h4 onclick="location.href='user.html?uid=${comment.uid}'"
                style="cursor:pointer;">
                ${comment.username || "Lovena User"}
            </h4>

            <p>${comment.text}</p>

        </div>

    </div>

    <button
        class="replyBtn"
        data-post="${postId}"
        data-comment="${docSnap.id}">
        ↩️ Reply
    </button>

    <div id="replies-${docSnap.id}"></div>

</div>
`;
            loadReplies(postId, docSnap.id);

        });

    });
}
document.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("sendCommentBtn")) return;
    console.log("Clicked:", e.target);

    const postId = e.target.dataset.id;

    const input = document.getElementById(`commentInput-${postId}`);

    const text = input.value.trim();

    if (!text) return;

    await addDoc(
        collection(db, "posts", postId, "comments"),
        {
            uid: currentUser.uid,
            username: currentUserData.fullname || currentUser.displayName || "User",
            text: text,
            createdAt: serverTimestamp()
        }
    );

    input.value = "";
});

    function loadReplies(postId, commentId) {

    const repliesBox =
        document.getElementById(`replies-${commentId}`);

    if (!repliesBox) return;

    const q = query(
        collection(
            db,
            "posts",
            postId,
            "comments",
            commentId,
            "replies"
        ),
        orderBy("createdAt", "asc")
    );


    onSnapshot(q, (snapshot) => {

        repliesBox.innerHTML = "";

        snapshot.forEach((docSnap) => {

            const reply = docSnap.data();

            repliesBox.innerHTML += `
                <div style="
                    margin-left:30px;
                    margin-top:8px;
                    border-left:2px solid #ddd;
                    padding-left:10px;
                ">
                    <strong>${reply.username}</strong><br>
                    ${reply.text}
                </div>
            `;

        });

    });

}

// ===========================
// LIKE POSTS
// ===========================

document.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("likeBtn")) return;

    const postId = e.target.dataset.id;

    const postRef = doc(db, "posts", postId);

    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) return;

    const post = postSnap.data();

    const likedBy = post.likedBy || [];

    const alreadyLiked = likedBy.includes(currentUser.uid);

    if (alreadyLiked) {

        await updateDoc(postRef, {

            likes: increment(-1),

            likedBy: arrayRemove(currentUser.uid)

        });
        
    } else {

        await updateDoc(postRef, {

            likes: increment(1),

            likedBy: arrayUnion(currentUser.uid)

        });
        console.log("Creating like notification");
        if (post.uid !== currentUser.uid) {

    await addDoc(
        collection(db, "notifications"),
        {
            receiver: post.uid,
            sender: currentUser.uid,
            senderName: currentUserData.fullname || currentUser.displayName,
            type: "like",
            postId: postId,
            read: false,
            createdAt: serverTimestamp()
        }
    );

}


    }

});
document.addEventListener("click", async (e) => {

    if (!e.target.classList.contains("replyBtn")) return;

    const reply = prompt("Write your reply");

    if (!reply) return;

    const postId = e.target.dataset.post;
    const commentId = e.target.dataset.comment;

    try {

        await addDoc(
            collection(
                db,
                "posts",
                postId,
                "comments",
                commentId,
                "replies"
            ),
            {
                uid: currentUser.uid,
                username: currentUserData.fullname || currentUser.displayName || "User",
                text: reply,
                createdAt: serverTimestamp()
            }
        );

        alert("Reply saved!");

    } catch (error) {

        alert(error.message);

    }

});
async function loadUsers() {

    usersList.innerHTML = "";

    const snapshot = await getDocs(collection(db, "users"));

    snapshot.forEach((docSnap) => {

        const user = docSnap.data();

        user.uid = docSnap.id;

        if (user.uid === currentUser.uid) return;


        const isFollowing =
            currentUserData.following &&
            currentUserData.following.includes(user.uid);


        usersList.innerHTML += `

        <div class="post">

    <div onclick="location.href='user.html?uid=${user.uid}'"
         style="cursor:pointer;">

        <h3>${user.fullname || "No name"}</h3>

        <p>${user.bio || "No bio"}</p>

    </div>


            ${user.isLive ? `

                <p>🔴 LIVE NOW</p>

                <button class="joinLiveBtn" data-id="${user.uid}">
                    👀 Join Live
                </button>

            ` : ""}


            <button class="followBtn" data-id="${user.uid}">
                ${isFollowing ? "Following ❤️" : "➕ Follow"}
            </button>


        </div>

        `;

    });
    
    // JOIN LIVE BUTTON

    document.querySelectorAll(".joinLiveBtn").forEach((button)=>{

        button.addEventListener("click", ()=>{

            const hostId = button.dataset.id;

            window.location.href =
            `live.html?host=${hostId}`;

        });

    });


}
document.addEventListener("click", (e)=>{

    if(!e.target.classList.contains("joinLiveBtn")) return;


    const hostId = e.target.dataset.id;


    location.href = `live.html?host=${hostId}`;

});
