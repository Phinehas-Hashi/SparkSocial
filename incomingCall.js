import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const overlay = document.createElement("div");

overlay.id = "incomingCallOverlay";
overlay.style.position = "fixed";
overlay.style.top = "0";
overlay.style.left = "0";
overlay.style.width = "100%";
overlay.style.height = "100%";
overlay.style.zIndex = "99999";
overlay.style.display = "none";
overlay.innerHTML = `

<div class="incoming-card" style="
width:320px;
padding:30px;
border-radius:30px;
background:rgba(20,27,45,0.85);
backdrop-filter:blur(20px);
text-align:center;
color:white;
box-shadow:0 20px 60px rgba(0,0,0,0.45);
">

    <div id="incomingAvatar" style="
width:80px;
height:80px;
border-radius:50%;
margin:0 auto 15px;
display:flex;
align-items:center;
justify-content:center;
font-size:28px;
font-weight:700;
background:linear-gradient(135deg,#3b82f6,#8b5cf6);
color:white;
box-shadow:0 0 35px rgba(59,130,246,.6);
animation:ringPulse 1.5s infinite;
">
    👤
</div>

    <h2 id="incomingName">
        Unknown User
    </h2>

    <p id="incomingType" style="
animation:blinkText 1.2s infinite;
">
    Incoming Voice Call
</p>

    <div style="
display:flex;
justify-content:center;
gap:20px;
margin-top:25px;
">

<button id="declineIncoming" style="
width:55px;
height:55px;
border-radius:50%;
border:none;
background:#ef4444;
color:white;
font-size:18px;
box-shadow:0 10px 25px rgba(239,68,68,.4);
">
✕
</button>


<button id="acceptIncoming" style="
width:55px;
height:55px;
border-radius:50%;
border:none;
background:#22c55e;
color:white;
font-size:18px;
box-shadow:0 10px 25px rgba(34,197,94,.4);
">
✓
</button>

</div>

</div>


`;
if (!document.getElementById("incomingCallOverlay")) {
    document.body.appendChild(overlay);
}

    const incomingAvatar = document.getElementById("incomingAvatar");

const incomingName = document.getElementById("incomingName");

const incomingType = document.getElementById("incomingType");

const acceptIncoming = document.getElementById("acceptIncoming");

const declineIncoming = document.getElementById("declineIncoming");

let currentUser = null;
let incomingCallId = null;
let incomingTimeout = null;

onAuthStateChanged(auth, (user)=>{

    if(!user) return;

    currentUser = user;

console.log("Incoming call system ready:", currentUser.uid);

if (!window.incomingCallListenerStarted) {

    window.incomingCallListenerStarted = true;

    listenForIncomingCalls();

}

});
function showIncomingCall(){

    overlay.style.display = "flex";
    overlay.style.pointerEvents = "auto";
    clearTimeout(incomingTimeout);

incomingTimeout = setTimeout(async()=>{
if(!incomingCallId) return;
    if(incomingCallId){

        await updateDoc(
            doc(
                db,
                "calls",
                incomingCallId
            ),
            {
                status:"missed"
            }
        );

    }

    hideIncomingCall();

},30000);

    const card = overlay.querySelector(".incoming-card");

    card.style.transform = "translateY(-40px)";
    card.style.opacity = "0";

    setTimeout(()=>{

        card.style.transition = "0.35s ease";

        card.style.transform = "translateY(0)";
        card.style.opacity = "1";

    },50);

}

function hideIncomingCall(){

    const card = overlay.querySelector(".incoming-card");

    card.style.transition = "0.25s ease";

    card.style.transform = "translateY(-40px)";
    card.style.opacity = "0";


    setTimeout(()=>{

        overlay.style.display = "none";
        overlay.style.pointerEvents = "none";
        incomingCallId = null;

    },250);

}

function listenForIncomingCalls(){
  console.log("listenForIncomingCalls() started");

    const q = query(
        collection(db,"calls"),
        where(
            "receiver",
            "==",
            currentUser.uid
        ),
        where(
            "status",
            "==",
            "ringing"
        )
    );


    onSnapshot(q, async(snapshot)=>{
      console.log("Snapshot fired");
      console.log("CALL SNAPSHOT:", snapshot.docs.length);


      if(snapshot.empty){

    clearTimeout(incomingTimeout);

    hideIncomingCall();

    incomingCallId = null;

    return;

}


        const callDoc = snapshot.docs[0];
        incomingCallId = callDoc.id;

        const call = callDoc.data();


        const callerSnap = await getDoc(
            doc(
                db,
                "users",
                call.caller
            )
        );


        if(!callerSnap.exists()) return;


        const caller = callerSnap.data();


        incomingName.textContent =
        caller.fullname || "Unknown User";


        incomingType.textContent =
        call.type === "video"
        ? "Incoming Video Call"
        : "Incoming Voice Call";


        incomingAvatar.textContent =
        (caller.fullname || "U")
        .split(" ")
        .map(n=>n[0])
        .join("")
        .substring(0,2)
        .toUpperCase();

console.log("📞 Incoming call detected:", callDoc.id);
        showIncomingCall();
        acceptIncoming.onclick = ()=>{

    if(!incomingCallId) return;

    clearTimeout(incomingTimeout);

    location.href =
`call.html?id=${incomingCallId}`;

};
declineIncoming.onclick = async()=>{
  clearTimeout(incomingTimeout);

    await updateDoc(
        doc(
            db,
            "calls",
            incomingCallId
        ),
        {
            status:"rejected"
        }
    );


    hideIncomingCall();

};

    });

}
const style = document.createElement("style");

style.textContent = `

@keyframes ringPulse{

    0%{
        transform:scale(1);
        box-shadow:0 0 35px rgba(59,130,246,.6);
    }

    50%{
        transform:scale(1.08);
        box-shadow:0 0 55px rgba(59,130,246,.9);
    }

    100%{
        transform:scale(1);
        box-shadow:0 0 35px rgba(59,130,246,.6);
    }

}


@keyframes blinkText{

    0%,100%{
        opacity:1;
    }

    50%{
        opacity:.45;
    }

}

`;

document.head.appendChild(style);
