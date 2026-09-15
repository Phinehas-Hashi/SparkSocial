import { auth, db } from "./firebase.js";


import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";


import {
doc,
getDoc,
updateDoc,
arrayUnion
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


import {
startLive,
stopLive
} from "./liveAgora.js";



const APP_ID =
"e866571f8d394aa8b991fb67237a5542";



const params =
new URLSearchParams(window.location.search);


const liveId =
params.get("id");



const hostInfo =
document.getElementById("hostInfo");


const viewerCount =
document.getElementById("viewerCount");


const liveStatus =
document.getElementById("liveStatus");


const endLiveBtn =
document.getElementById("endLiveBtn");



let currentUser;

let liveData;




onAuthStateChanged(
auth,
async(user)=>{


if(!user){

location.href="login.html";

return;

}



currentUser=user;



const liveSnap =
await getDoc(
doc(db,"liveSessions",liveId)
);



if(!liveSnap.exists()){

hostInfo.innerHTML="Live not found";

return;

}



liveData =
liveSnap.data();




const hostSnap =
await getDoc(
doc(db,"users",liveData.uid)
);



const host =
hostSnap.data();



hostInfo.innerHTML =
`
🔴 ${host.fullname || "User"} is Live
`;





if(liveData.uid !== currentUser.uid){


await updateDoc(
doc(db,"liveSessions",liveId),
{

viewers:
arrayUnion(currentUser.uid)

}

);


}




await startLive(
APP_ID,
liveId,
liveData.uid === currentUser.uid
);



liveStatus.innerHTML =
"🔴 Connected";



viewerCount.innerHTML =
`
👀 ${(liveData.viewers || []).length} viewers
`;



});







endLiveBtn.addEventListener(
"click",
async()=>{


await stopLive();



await updateDoc(
doc(db,"liveSessions",liveId),
{

status:"ended"

}

);



liveStatus.innerHTML =
"⛔ Live ended";


});
const liveRoom = document.getElementById("liveRoom");
const sparkLayer = document.getElementById("sparkLayer");
const likeCount = document.getElementById("likeCount");

let likes = 0;


liveRoom.addEventListener("click",(e)=>{

if(e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;


createSpark(e.clientX,e.clientY);

likes++;

likeCount.innerText = likes;

});



function createSpark(x,y){

const spark=document.createElement("div");

spark.className="spark";

spark.innerHTML="✨";

spark.style.left=x+"px";

spark.style.top=y+"px";


sparkLayer.appendChild(spark);


setTimeout(()=>{

spark.remove();

},1000);

}