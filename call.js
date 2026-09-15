import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    doc,
    getDoc,
    onSnapshot,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

import {

    joinCall,

    leaveCall,

    toggleMute

} from "./agora.js";


const APP_ID = "e866571f8d394aa8b991fb67237a5542";


const params = new URLSearchParams(window.location.search);

const callId = params.get("id");
console.log("CALL PAGE ID:", callId);


const callTitle = document.getElementById("callTitle");

const callStatus = document.getElementById("callStatus");

const callAvatar = document.getElementById("callAvatar");

const acceptBtn = document.getElementById("acceptBtn");

const rejectBtn = document.getElementById("rejectBtn");

const muteBtn = document.getElementById("muteBtn");


let currentUser = null;
let call = null;
let ringingTimeout = null;
let joinedCall = false;

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        location.href = "login.html";
        return;

    }

    currentUser = user;

    if (!callId) {

        callStatus.textContent = "Invalid call.";
        return;

    }

    const callRef = doc(db, "calls", callId);

    onSnapshot(callRef, async (snap) => {

        if (!snap.exists()) {

            callStatus.textContent = "Call not found";
            return;

        }

        call = snap.data();
        if(call.status === "accepted"){

    callStatus.textContent = "Connected";

    acceptBtn.style.display = "none";

    rejectBtn.style.display = "flex";
    if(!joinedCall){

    joinedCall = true;

    await joinCall(
        APP_ID,
        callId,
        call.type === "video"
    );

}

}
        if(call.status === "ended"){

    callStatus.textContent = "Call ended";

    await leaveCall();

    setTimeout(()=>{

        location.href = "messages.html";

    },1500);

}

        if(
    (call.status === "accepted" ||
     call.status === "rejected" ||
     call.status === "missed")
     && ringingTimeout
){

    clearTimeout(ringingTimeout);

    ringingTimeout = null;

}
if(call.status === "missed"){

    callStatus.textContent = "📵 No answer";

    setTimeout(()=>{

        location.href = "messages.html";

    },2000);

}

        console.log("Call Data:", call);

const otherUserId =
    currentUser.uid === call.caller
    ? call.receiver
    : call.caller;

const userSnap = await getDoc(
    doc(db, "users", otherUserId)
);

if(!userSnap.exists()) return;

const otherUser = userSnap.data();

callTitle.textContent =
    otherUser.fullname || "Unknown User";

const initials = (otherUser.fullname || "U")
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0,2)
    .toUpperCase();

callAvatar.textContent = initials;

if(currentUser.uid === call.caller){

    acceptBtn.style.display = "none";

    if(call.status === "accepted"){

        callStatus.textContent = "Connected";

    }else{

        callStatus.textContent = "Calling...";

    }

    if(call.status === "ringing" && !ringingTimeout){

        ringingTimeout = setTimeout(async()=>{

            await updateDoc(
                doc(db,"calls",callId),
                {
                    status:"missed"
                }
            );

        },30000);

    }

}else{

    if(call.status === "ringing"){

        callStatus.textContent = "📲 Incoming call";

        acceptBtn.style.display = "flex";

    }

}
});

});
acceptBtn.onclick = async()=>{

    await updateDoc(
        doc(db,"calls",callId),
        {
            status:"accepted"
        }
    );

    if(!joinedCall){

    joinedCall = true;

    await joinCall(
        APP_ID,
        callId,
        call.type === "video"
    );

}

};
rejectBtn.onclick = async()=>{

    await updateDoc(
        doc(db,"calls",callId),
        {
            status:"rejected"
        }
    );

    await leaveCall();

    location.href = "messages.html";

};
muteBtn.onclick = async()=>{

    const muted = await toggleMute();

    muteBtn.textContent =
    muted ? "Unmute" : "Mute";

};
window.addEventListener("beforeunload", ()=>{

    leaveCall();

});