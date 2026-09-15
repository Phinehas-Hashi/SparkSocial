import { auth, db } from "./firebase.js";

import "./incomingCall.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    addDoc,
    setDoc,
    updateDoc,
    increment,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


// ============================
// DOM ELEMENTS
// ============================

const chatUsers = document.getElementById("chatUsers");

const activeChat = document.getElementById("activeChat");

const chatName = document.getElementById("chatName");

const chatAvatar = document.querySelector(".chat-avatar");

const chatStatus = document.getElementById("chatStatus");

const chatBox = document.getElementById("chatBox");

const messageInput = document.getElementById("messageInput");
const incomingOverlay = document.getElementById("incomingCallOverlay");
const incomingName = document.getElementById("incomingName");
const incomingAvatar = document.getElementById("incomingAvatar");
const incomingType = document.getElementById("incomingType");

const acceptIncoming = document.getElementById("acceptIncoming");
const declineIncoming = document.getElementById("declineIncoming");

messageInput.addEventListener("input", async () => {

    if (!selectedUser) return;

    await setDoc(
        doc(db, "typing", currentChatId),
        {
            [currentUser.uid]: true
        },
        { merge: true }
    );

    clearTimeout(typingTimeout);

    typingTimeout = setTimeout(async () => {

        await setDoc(
            doc(db, "typing", currentChatId),
            {
                [currentUser.uid]: false
            },
            { merge: true }
        );

    }, 1500);

});

const sendBtn = document.getElementById("sendBtn");

const backBtn = document.getElementById("backBtn");

const newChatBtn = document.getElementById("newChatBtn");

const voiceCallBtn = document.getElementById("voiceCallBtn");

const videoCallBtn = document.getElementById("videoCallBtn");
voiceCallBtn.addEventListener("click", startVoiceCall);

videoCallBtn.addEventListener("click", startVideoCall);


// ============================
// VARIABLES
// ============================

let currentUser = null;

let selectedUser = null;

let currentChatId = null;
let typingTimeout = null;


// Hide chat until user selected

activeChat.style.display = "none";


// ============================
// HELPERS
// ============================


function getChatId(uid1, uid2){

    return [uid1, uid2]
    .sort()
    .join("_");

}



function getInitials(name){

    if(!name) return "👤";

    const parts = name.split(" ");

    if(parts.length > 1){

        return (
            parts[0][0] +
            parts[1][0]
        ).toUpperCase();

    }

    return parts[0][0].toUpperCase();

}



function getAvatarColor(name=""){

    let hash = 0;

    for(let i = 0; i < name.length; i++){

        hash =
        name.charCodeAt(i)
        +
        ((hash << 5) - hash);

    }


    const colors = [

        "#4F7CFF",
        "#8B5CF6",
        "#00E5FF",
        "#22C55E",
        "#EF4444"

    ];


    return colors[
        Math.abs(hash) % colors.length
    ];

}


// ============================
// AUTH START
// ============================


onAuthStateChanged(auth, async(user)=>{


    if(!user){

        location.href="login.html";

        return;

    }


    currentUser = user;
    try {

    await updateDoc(
        doc(db, "users", currentUser.uid),
        {
            online: true,
            lastSeen: serverTimestamp()
        }
    );

    console.log("✅ User marked online");

} catch (err) {

    console.error("❌ Failed to update online status:", err);

}


    loadChats();


  // listenForCalls();


});

// ============================
// LOAD EXISTING CHATS
// ============================

function loadChats(){

    const q = query(
    collection(db,"conversations"),
    where(
        "users",
        "array-contains",
        currentUser.uid
    )
);

    onSnapshot(q, async(snapshot)=>{


        chatUsers.innerHTML = "";


        if(snapshot.empty){

            chatUsers.innerHTML =
            `
            <p>
            No chats yet 💬
            </p>
            `;

            return;

        }



        for(const chatDoc of snapshot.docs){


            const data = chatDoc.data();


            const otherUid =
            data.users.find(
                uid =>
                uid !== currentUser.uid
            );



            const userSnap =
            await getDoc(
                doc(
                    db,
                    "users",
                    otherUid
                )
            );


            if(!userSnap.exists())
            continue;



            const user =
            userSnap.data();



            chatUsers.innerHTML += `

<div
class="chat-user-card"
data-id="${otherUid}"
data-name="${user.fullname || "User"}"
>

    <div
    class="chat-avatar"
    style="background:${getAvatarColor(user.fullname)};">

        ${getInitials(user.fullname)}

        ${user.online
        ? '<span class="online-dot"></span>'
        : ""}

    </div>

    <div class="chat-user-text">

    <div class="chat-top">

        <h3>${user.fullname || "User"}</h3>

        <span class="chat-time">

            ${
                data.updatedAt
                ? data.updatedAt.toDate().toLocaleTimeString([],{
                    hour:"2-digit",
                    minute:"2-digit"
                  })
                : ""
            }

        </span>

    </div>

    <div class="chat-bottom">

        <p>${data.lastMessage || "Start chatting..."}</p>

        ${
            data.unreadCount &&
            data.unreadCount[currentUser.uid] > 0
            ? `<span class="unread-badge">
                ${data.unreadCount[currentUser.uid]}
               </span>`
            : ""
        }

    </div>

</div>

</div>

`;

        }


    });


}



// ============================
// OPEN CHAT
// ============================


document.addEventListener(
"click",
async(e)=>{


    const card =
e.target.closest(".chat-user-card");

if(!card) return;


    selectedUser = {

        uid: card.dataset.id,

        name: card.dataset.name

    };



    currentChatId =
    getChatId(
        currentUser.uid,
        selectedUser.uid
    );



    chatName.textContent =
    selectedUser.name;



    chatAvatar.textContent =
    getInitials(
        selectedUser.name
    );



    chatAvatar.style.background =
    getAvatarColor(
        selectedUser.name
    );



    activeChat.style.display = "flex";



    loadMessages();

listenForTyping();

markMessagesAsRead();



});



// ============================
// BACK BUTTON
// ============================

backBtn.addEventListener("click", () => {

    activeChat.style.display = "none";

    selectedUser = null;

    currentChatId = null;

});

// ============================
// LOAD MESSAGES
// ============================

function loadMessages(){

    const q = query(
        collection(
            db,
            "chats",
            currentChatId,
            "messages"
        ),
        orderBy(
            "createdAt",
            "asc"
        )
    );


    onSnapshot(q,(snapshot)=>{


        chatBox.innerHTML = "";


        snapshot.forEach((docSnap)=>{


            const msg = docSnap.data();


            const mine =
            msg.sender === currentUser.uid;



            chatBox.innerHTML += `

<div class="message-row ${mine ? "mine" : "theirs"}">

    <div class="message-bubble">

        <div class="message-text">

    ${msg.text}

</div>

<div class="message-meta">

    ${
        msg.createdAt
        ? new Date(
            msg.createdAt.toDate()
          ).toLocaleTimeString([],{
              hour:"2-digit",
              minute:"2-digit"
          })
        : ""
    }

    ${
    mine
    ? `<span class="message-status ${msg.status === "read" ? "read" : ""}">
        ${msg.status === "read" ? "✓✓" : "✓"}
      </span>`
    : ""
}

</div>

    </div>

</div>

`;


        });


        chatBox.scrollTop =
        chatBox.scrollHeight;


    });

}

function listenForTyping(){

    const typingRef = doc(db, "typing", currentChatId);

    const userRef = doc(db, "users", selectedUser.uid);

    let isTyping = false;
    let isOnline = false;

    function updateStatus(){

        if(isTyping){

            chatStatus.textContent = "⌨️ Typing...";

        }else if(isOnline){

            chatStatus.textContent = "🟢 Online";

        }else{

            chatStatus.textContent = "⚫ Offline";

        }

    }

    onSnapshot(typingRef, (snap)=>{

        if(snap.exists()){

            const data = snap.data();

            isTyping = data[selectedUser.uid] === true;

        }else{

            isTyping = false;

        }

        updateStatus();

    });

    onSnapshot(userRef, (snap)=>{

        if(snap.exists()){

            isOnline = snap.data().online === true;

        }else{

            isOnline = false;

        }

        updateStatus();

    });

}
async function markMessagesAsRead(){

    const snapshot = await getDocs(
        collection(
            db,
            "chats",
            currentChatId,
            "messages"
        )
    );

    for(const message of snapshot.docs){

        const data = message.data();

        if(
            data.sender !== currentUser.uid &&
            data.status !== "read"
        ){

            await updateDoc(
                message.ref,
                {
                    status:"read"
                }
            );

        }

    }

}
// ============================
// SEND MESSAGE
// ============================

sendBtn.addEventListener(
"click",
async()=>{


    const text =
    messageInput.value.trim();



    if(!text)
    return;



    if(!selectedUser){

        alert("Open a chat first");

        return;

    }

messageInput.value = "";

    await addDoc(

        collection(
            db,
            "chats",
            currentChatId,
            "messages"
        ),

{
    sender: currentUser.uid,

    text: text,

    createdAt: serverTimestamp(),

    status: "sent"
}

    );



    await setDoc(

        doc(
            db,
            "conversations",
            currentChatId
        ),

        {

            users:[

                currentUser.uid,

                selectedUser.uid

            ],


            lastMessage:text,


            updatedAt:
            serverTimestamp()

        },

        {
            merge:true
        }

    );



    await setDoc(
    doc(db, "typing", currentChatId),
    {
        [currentUser.uid]: false
    },
    { merge: true }
);



});
async function startVoiceCall(){

    if(!selectedUser) return;

    await createCall("voice");

}

async function startVideoCall(){

    if(!selectedUser) return;

    await createCall("video");

}
async function createCall(type){

    const callRef = await addDoc(
        collection(db, "calls"),
        {
            caller: currentUser.uid,
            receiver: selectedUser.uid,
            type: type,
            status: "ringing",
            createdAt: serverTimestamp()
        }
    );
    
console.log("CALL CREATED:", callRef.id);
console.log("Receiver:", selectedUser.uid);
console.log("Type:", type);

    location.href = `call.html?id=${callRef.id}`;

}
window.addEventListener("beforeunload", async () => {

    if (!currentUser) return;

    await updateDoc(
        doc(db, "users", currentUser.uid),
        {
            online: false,
            lastSeen: serverTimestamp()
        }
    );

});