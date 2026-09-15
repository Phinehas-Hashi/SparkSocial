import { auth, db } from "./firebase.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
    arrayRemove,
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const els = {
    search: document.getElementById("searchUser"),
    clear: document.getElementById("clearSearch"),
    list: document.getElementById("usersList"),
    count: document.getElementById("resultsCount")
};

let currentUser = null;
let currentUserData = {};
let users = [];

function navigate(path) {
    window.location.assign(path);
}

function displayName(user) {
    return user.fullname || user.displayName || "Spark user";
}

function initials(name = "Spark") {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "S";
}

function matchesSearch(user, term) {
    if (!term) return true;
    const haystack = `${displayName(user)} ${user.username || ""} ${user.bio || ""}`.toLowerCase();
    return haystack.includes(term.toLowerCase());
}

function createAvatar(user) {
    const avatar = document.createElement("div");
    avatar.className = "discover-avatar";

    if (user.photoURL) {
        const image = document.createElement("img");
        image.src = user.photoURL;
        image.alt = "";
        image.loading = "lazy";
        avatar.appendChild(image);
    } else {
        avatar.textContent = initials(displayName(user));
    }

    return avatar;
}

function createUserCard(user) {
    const card = document.createElement("article");
    card.className = "discover-user";

    const identity = document.createElement("button");
    identity.type = "button";
    identity.className = "discover-identity";
    identity.dataset.uid = user.uid;

    identity.appendChild(createAvatar(user));

    const info = document.createElement("span");
    info.className = "discover-user-info";

    const name = document.createElement("strong");
    name.textContent = displayName(user);

    const username = document.createElement("small");
    username.textContent = user.username ? `@${user.username}` : "SparkSocial member";

    const bio = document.createElement("p");
    bio.textContent = user.bio || "Ready to connect and share sparks.";

    info.append(name, username, bio);
    identity.appendChild(info);

    const following = Array.isArray(currentUserData.following) && currentUserData.following.includes(user.uid);
    const follow = document.createElement("button");
    follow.type = "button";
    follow.className = `follow-button${following ? " is-following" : ""}`;
    follow.dataset.action = "follow";
    follow.dataset.uid = user.uid;
    follow.textContent = following ? "Following" : "Follow";

    card.append(identity, follow);
    return card;
}

function renderUsers() {
    const term = els.search.value.trim();
    const filtered = users.filter(user => matchesSearch(user, term));

    els.count.textContent = `${filtered.length} ${filtered.length === 1 ? "person" : "people"}`;
    els.list.replaceChildren();

    if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "feed-state";
        empty.textContent = term ? "No people matched your search." : "No other SparkSocial members yet.";
        els.list.appendChild(empty);
        return;
    }

    const fragment = document.createDocumentFragment();
    filtered.forEach(user => fragment.appendChild(createUserCard(user)));
    els.list.appendChild(fragment);
}

async function loadUsers() {
    els.list.replaceChildren();
    const loading = document.createElement("div");
    loading.className = "feed-state";
    loading.textContent = "Finding people…";
    els.list.appendChild(loading);

    try {
        const snapshot = await getDocs(collection(db, "users"));
        users = snapshot.docs
            .filter(item => item.id !== currentUser.uid)
            .map(item => ({ uid: item.id, ...item.data() }));
        renderUsers();
    } catch (error) {
        console.error("Discover users error:", error);
        const state = document.createElement("div");
        state.className = "feed-state";
        state.textContent = "We couldn’t load people right now. Please try again.";
        els.list.replaceChildren(state);
    }
}

async function toggleFollow(targetUid, button) {
    if (!currentUser || targetUid === currentUser.uid) return;

    button.disabled = true;
    const myRef = doc(db, "users", currentUser.uid);
    const targetRef = doc(db, "users", targetUid);
    const following = Array.isArray(currentUserData.following) && currentUserData.following.includes(targetUid);

    try {
        if (following) {
            await updateDoc(myRef, { following: arrayRemove(targetUid) });
            await updateDoc(targetRef, { followers: arrayRemove(currentUser.uid) });
            currentUserData.following = (currentUserData.following || []).filter(uid => uid !== targetUid);
        } else {
            await updateDoc(myRef, { following: arrayUnion(targetUid) });
            await updateDoc(targetRef, { followers: arrayUnion(currentUser.uid) });
            currentUserData.following = [...(currentUserData.following || []), targetUid];
        }

        renderUsers();
    } catch (error) {
        console.error("Follow error:", error);
        alert("We couldn’t update that connection. Please try again.");
        button.disabled = false;
    }
}

els.search.addEventListener("input", () => {
    els.clear.hidden = !els.search.value;
    renderUsers();
});

els.clear.addEventListener("click", () => {
    els.search.value = "";
    els.clear.hidden = true;
    renderUsers();
    els.search.focus();
});

els.list.addEventListener("click", event => {
    const followButton = event.target.closest('[data-action="follow"]');
    if (followButton) {
        toggleFollow(followButton.dataset.uid, followButton);
        return;
    }

    const identity = event.target.closest(".discover-identity");
    if (identity?.dataset.uid) {
        navigate(`profile.html?uid=${encodeURIComponent(identity.dataset.uid)}`);
    }
});

onAuthStateChanged(auth, async user => {
    if (!user) {
        navigate("login.html");
        return;
    }

    currentUser = user;

    try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        currentUserData = snapshot.exists() ? snapshot.data() : {};
        await loadUsers();
    } catch (error) {
        console.error("Discover initialization error:", error);
        els.list.textContent = "SparkSocial couldn’t finish loading. Please refresh.";
    }
});
