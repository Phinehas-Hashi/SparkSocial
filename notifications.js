import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const notificationsList =
document.getElementById("notificationsList");

onAuthStateChanged(auth, (user)=>{

    if(!user){

        location.href = "login.html";
        return;

    }

    const q = query(
        collection(db,"notifications"),
        where("receiver","==",user.uid),
    );

    onSnapshot(q,(snapshot)=>{

        notificationsList.innerHTML = "";

        if(snapshot.empty){

            notificationsList.innerHTML =
            "<p>No notifications yet.</p>";

            return;

        }

        snapshot.forEach((docSnap)=>{

            const n = docSnap.data();
            
            if (!n.read) {

    updateDoc(
        doc(db, "notifications", docSnap.id),
        {
            read: true
        }
    );

}

            let message = "";

            if(n.type === "follow"){

                message =
                `👤 ${n.senderName} started following you`;

            }

            if(n.type === "like"){

                message =
                `❤️ ${n.senderName} liked your post`;

            }
            if(n.type === "comment"){

    message =
    `💬 ${n.senderName} commented on your post`;

}

            notificationsList.innerHTML += `

<div class="post"
onclick="openNotification('${n.type}', '${n.sender || ""}', '${n.postId || ""}')"
style="cursor:pointer;">

    ${message}

</div>

`;

        });

    });

});
window.openNotification = function(type, sender, postId){

    if(type === "follow"){

        location.href =
        `user.html?uid=${sender}`;

    }


    if(type === "like" || type === "comment"){

    location.href = `home.html#post-${postId}`;

}

};