import { auth, db } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    addDoc, arrayRemove, arrayUnion, collection, doc, getDoc,
    increment, onSnapshot, orderBy, query, serverTimestamp,
    updateDoc, where
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const els = {
    postContent: document.getElementById("postContent"),
    postBtn: document.getElementById("postBtn"),
    postCounter: document.getElementById("postCounter"),
    composerAvatar: document.getElementById("composerAvatar"),
    homeSubtitle: document.getElementById("homeSubtitle"),
    feed: document.getElementById("feed"),
    notificationBtn: document.getElementById("notificationBtn"),
    notificationBadge: document.getElementById("notificationBadge")
};

let currentUser = null;
let currentUserData = {};
let unsubscribeFeed = null;
let unsubscribeNotifications = null;
const commentUnsubscribers = new Map();

function navigate(path) { window.location.assign(path); }

function displayName() {
    return currentUserData.fullname || currentUser?.displayName || "Spark user";
}

function initials(name = "SparkSocial") {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "S";
}

function setBusy(button, busy, label = "Share spark") {
    button.disabled = busy;
    button.querySelector("span").textContent = busy ? "Sharing…" : label;
}

function showFeedState(message) {
    els.feed.replaceChildren();
    const state = document.createElement("div");
    state.className = "feed-state";
    state.textContent = message;
    els.feed.appendChild(state);
}

function createAvatar(user, small = false) {
    const avatar = document.createElement("div");
    avatar.className = `post-avatar${small ? " small-avatar" : ""}`;
    avatar.setAttribute("aria-hidden", "true");

    if (user.photoURL) {
        const image = document.createElement("img");
        image.src = user.photoURL;
        image.alt = "";
        image.loading = "lazy";
        avatar.appendChild(image);
    } else {
        avatar.textContent = initials(user.fullname || user.displayName);
    }
    return avatar;
}

function createUserButton(user, fallbackName = "Spark user") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "post-author";
    button.dataset.uid = user.uid || "";
    button.appendChild(createAvatar(user, true));

    const info = document.createElement("span");
    info.className = "post-author-info";

    const name = document.createElement("strong");
    name.textContent = user.fullname || user.displayName || fallbackName;

    const badges = [];
    if (user.verified) badges.push("✓");
    if (user.founder) badges.push("Founder");
    if (user.ceo) badges.push("CEO");
    if (user.premium) badges.push("Premium");

    const meta = document.createElement("small");
    meta.textContent = badges.length ? badges.join(" • ") : "SparkSocial member";

    info.append(name, meta);
    button.appendChild(info);
    return button;
}

function createPostCard(postId, post) {
    const card = document.createElement("article");
    card.className = "post";
    card.dataset.postId = postId;

    const header = document.createElement("div");
    header.className = "post-header";

    const author = createUserButton({
        uid: post.uid,
        fullname: post.username,
        photoURL: post.photoURL,
        verified: post.verified,
        founder: post.founder,
        ceo: post.ceo,
        premium: post.premium
    });

    const menu = document.createElement("button");
    menu.type = "button";
    menu.className = "post-menu";
    menu.textContent = "•••";
    menu.setAttribute("aria-label", "Post options");
    menu.dataset.action = "post-menu";
    header.append(author, menu);

    const body = document.createElement("div");
    body.className = "post-body";
    const content = document.createElement("p");
    content.className = "post-content";
    content.textContent = post.content || "";
    body.appendChild(content);

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const liked = Array.isArray(post.likedBy) && post.likedBy.includes(currentUser.uid);
    const likeButton = document.createElement("button");
    likeButton.type = "button";
    likeButton.className = `likeBtn${liked ? " is-liked" : ""}`;
    likeButton.dataset.action = "like";
    likeButton.dataset.id = postId;
    likeButton.textContent = `${liked ? "♥" : "♡"} ${post.likes || 0}`;
    likeButton.setAttribute("aria-label", liked ? "Unlike post" : "Like post");

    const commentButton = document.createElement("button");
    commentButton.type = "button";
    commentButton.dataset.action = "focus-comment";
    commentButton.textContent = "Comment";
    actions.append(likeButton, commentButton);

    const commentsSection = document.createElement("div");
    commentsSection.className = "comments-section";

    const commentsList = document.createElement("div");
    commentsList.className = "comments-list";
    commentsList.id = `comments-${postId}`;

    const commentBox = document.createElement("form");
    commentBox.className = "comment-box";
    commentBox.dataset.postId = postId;

    const input = document.createElement("input");
    input.type = "text";
    input.name = "comment";
    input.maxLength = 500;
    input.placeholder = "Add a comment…";
    input.autocomplete = "off";

    const send = document.createElement("button");
    send.type = "submit";
    send.textContent = "➤";
    send.setAttribute("aria-label", "Send comment");

    commentBox.append(input, send);
    commentsSection.append(commentsList, commentBox);
    card.append(header, body, actions, commentsSection);
    return card;
}

async function loadCurrentUser(user) {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    currentUserData = snapshot.exists() ? snapshot.data() : {};

    const name = displayName();
    els.homeSubtitle.textContent = `Welcome back, ${name.split(" ")[0]}. What’s sparking your mind?`;
    els.composerAvatar.replaceChildren();
    els.composerAvatar.textContent = initials(name);
}

function subscribeToFeed() {
    if (unsubscribeFeed) unsubscribeFeed();

    const postsQuery = query(collection(db, "posts"), orderBy("createdAt", "desc"));

    unsubscribeFeed = onSnapshot(postsQuery, snapshot => {
        commentUnsubscribers.forEach(unsubscribe => unsubscribe());
        commentUnsubscribers.clear();

        if (snapshot.empty) {
            showFeedState("No sparks yet. Be the first to share something.");
            return;
        }

        const fragment = document.createDocumentFragment();
        snapshot.forEach(postSnapshot => fragment.appendChild(createPostCard(postSnapshot.id, postSnapshot.data())));
        els.feed.replaceChildren(fragment);

        snapshot.forEach(postSnapshot => subscribeToComments(postSnapshot.id));
    }, error => {
        console.error("Feed error:", error);
        showFeedState("We couldn’t load the feed. Please try again.");
    });
}

function subscribeToComments(postId) {
    const commentsQuery = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(commentsQuery, snapshot => {
        const list = document.getElementById(`comments-${postId}`);
        if (!list) return;

        const fragment = document.createDocumentFragment();
        snapshot.forEach(commentSnapshot => {
            const comment = commentSnapshot.data();
            const item = document.createElement("div");
            item.className = "comment";

            const avatar = createAvatar({ fullname: comment.username }, true);
            const content = document.createElement("div");
            const name = document.createElement("strong");
            name.textContent = comment.username || "Spark user";
            const text = document.createElement("p");
            text.textContent = comment.text || "";

            content.append(name, text);
            item.append(avatar, content);
            fragment.appendChild(item);
        });
        list.replaceChildren(fragment);
    }, error => console.error(`Comments error for ${postId}:`, error));

    commentUnsubscribers.set(postId, unsubscribe);
}

async function createPost() {
    if (!currentUser) return;
    const text = els.postContent.value.trim();
    if (!text) {
        els.postContent.focus();
        return;
    }

    setBusy(els.postBtn, true);
    try {
        await addDoc(collection(db, "posts"), {
            uid: currentUser.uid,
            username: displayName(),
            photoURL: currentUserData.photoURL || currentUser.photoURL || "",
            founder: Boolean(currentUserData.founder),
            ceo: Boolean(currentUserData.ceo),
            verified: Boolean(currentUserData.verified),
            premium: Boolean(currentUserData.premium),
            content: text,
            likes: 0,
            likedBy: [],
            createdAt: serverTimestamp()
        });
        els.postContent.value = "";
        updateCounter();
    } catch (error) {
        console.error("Create post error:", error);
        alert("We couldn’t share your spark. Please try again.");
    } finally {
        setBusy(els.postBtn, false);
    }
}

async function toggleLike(postId) {
    if (!currentUser) return;

    const postRef = doc(db, "posts", postId);
    const snapshot = await getDoc(postRef);
    if (!snapshot.exists()) return;

    const post = snapshot.data();
    const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
    const alreadyLiked = likedBy.includes(currentUser.uid);

    await updateDoc(postRef, {
        likes: increment(alreadyLiked ? -1 : 1),
        likedBy: alreadyLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
    });

    if (!alreadyLiked && post.uid && post.uid !== currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
            receiver: post.uid,
            sender: currentUser.uid,
            senderName: displayName(),
            type: "like",
            postId,
            read: false,
            createdAt: serverTimestamp()
        });
    }
}

async function addComment(postId, input) {
    const text = input.value.trim();
    if (!text || !currentUser) return;

    const button = input.parentElement.querySelector("button");
    button.disabled = true;
    try {
        await addDoc(collection(db, "posts", postId, "comments"), {
            uid: currentUser.uid,
            username: displayName(),
            photoURL: currentUserData.photoURL || currentUser.photoURL || "",
            text,
            createdAt: serverTimestamp()
        });
        input.value = "";
    } catch (error) {
        console.error("Comment error:", error);
        alert("We couldn’t add your comment. Please try again.");
    } finally {
        button.disabled = false;
    }
}

function subscribeToNotifications() {
    if (unsubscribeNotifications) unsubscribeNotifications();

    const notificationQuery = query(
        collection(db, "notifications"),
        where("receiver", "==", currentUser.uid),
        where("read", "==", false)
    );

    unsubscribeNotifications = onSnapshot(notificationQuery, snapshot => {
        const count = snapshot.size;
        els.notificationBadge.textContent = count > 99 ? "99+" : String(count);
        els.notificationBadge.hidden = count === 0;
    }, error => console.error("Notification error:", error));
}

function updateCounter() {
    els.postCounter.textContent = `${els.postContent.value.length} / 2000`;
}

els.postContent.addEventListener("input", updateCounter);
els.postBtn.addEventListener("click", createPost);
els.notificationBtn.addEventListener("click", () => navigate("notifications.html"));

els.feed.addEventListener("click", async event => {
    const author = event.target.closest(".post-author");
    if (author) {
        const uid = author.dataset.uid;
        if (uid) navigate(`profile.html?uid=${encodeURIComponent(uid)}`);
        return;
    }

    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;

    if (actionTarget.dataset.action === "like") {
        actionTarget.disabled = true;
        try { await toggleLike(actionTarget.dataset.id); }
        catch (error) { console.error("Like error:", error); }
        finally { actionTarget.disabled = false; }
        return;
    }

    if (actionTarget.dataset.action === "focus-comment") {
        actionTarget.closest(".post")?.querySelector(".comment-box input")?.focus();
    }
});

els.feed.addEventListener("submit", async event => {
    const form = event.target.closest(".comment-box");
    if (!form) return;
    event.preventDefault();
    await addComment(form.dataset.postId, form.querySelector("input[name=comment]"));
});

onAuthStateChanged(auth, async user => {
    if (!user) {
        navigate("login.html");
        return;
    }

    currentUser = user;
    try {
        await loadCurrentUser(user);
        subscribeToFeed();
        subscribeToNotifications();
    } catch (error) {
        console.error("Home initialization error:", error);
        showFeedState("SparkSocial couldn’t finish loading. Please refresh.");
    }
});

window.addEventListener("beforeunload", () => {
    if (unsubscribeFeed) unsubscribeFeed();
    if (unsubscribeNotifications) unsubscribeNotifications();
    commentUnsubscribers.forEach(unsubscribe => unsubscribe());
});
