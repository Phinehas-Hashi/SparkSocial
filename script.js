function login() {
    let user = document.getElementById("username").value;

    if (user !== "") {
        localStorage.setItem("lovenaUser", user);

        document.getElementById("loginPage").style.display = "none";
        document.getElementById("appPage").style.display = "block";

        document.getElementById("message").innerHTML =
            "🎉 Welcome " + user;
    } else {
        document.getElementById("loginMessage").innerHTML =
            "⚠️ Enter username";
    }
}

function join() {
    document.getElementById("message").innerHTML =
        "💚 Welcome to Lovena!";
}

function learnMore() {
    document.getElementById("message").innerHTML =
        "🚀 Lovena connects people meaningfully.";
}

function follow() {
    let btn = document.getElementById("followBtn");

    if (btn.innerHTML === "Follow") {
        btn.innerHTML = "Following ✅";
    } else {
        btn.innerHTML = "Follow";
    }
}

function logout() {
    localStorage.removeItem("lovenaUser");
    location.reload();
}
// Load posts when app opens
window.onload = function () {
    let user = localStorage.getItem("lovenaUser");

    if (user) {
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("appPage").style.display = "block";

        document.getElementById("message").innerHTML =
            "👋 Welcome back " + user;

        loadPosts();
    }
};

function createPost() {
    let text = document.getElementById("postInput").value;

    if (text !== "") {
        let posts = JSON.parse(localStorage.getItem("posts") || "[]");
        posts.unshift(text);
        localStorage.setItem("posts", JSON.stringify(posts));

        document.getElementById("postInput").value = "";

        loadPosts();
    }
}

function loadPosts() {
    let feed = document.getElementById("feed");
    feed.innerHTML = "";

    let posts = JSON.parse(localStorage.getItem("posts") || "[]");

    posts.forEach(p => {
        let div = document.createElement("div");
        div.className = "card";
        div.innerHTML = "💬 " + p;
        feed.appendChild(div);
    });
}