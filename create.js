import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


const createPostBtn = document.getElementById("createPostBtn");
const createContent = document.getElementById("createContent");
const goLiveBtn = document.getElementById("goLiveBtn");


let currentUser = null;



onAuthStateChanged(auth,(user)=>{

    if(!user){

        location.href="login.html";
        return;

    }


    currentUser = user;

});





// CREATE POST

createPostBtn.addEventListener("click",async()=>{


if(!currentUser) return;


const text = createContent.value.trim();


if(!text) return;



await addDoc(
collection(db,"posts"),
{

uid:currentUser.uid,

username:
currentUser.displayName || "Lovena User",

content:text,

likes:0,

createdAt:serverTimestamp()

}

);



createContent.value="";


alert("Posted ❤️");


});






// START LIVE

goLiveBtn.addEventListener("click",async()=>{


if(!currentUser) return;



const liveRef = await addDoc(
collection(db,"liveSessions"),
{

uid:currentUser.uid,

status:"live",

viewers:[],

startedAt:serverTimestamp()

}

);



location.href =
`live.html?id=${liveRef.id}`;


});