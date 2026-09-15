const Agora = window.AgoraRTC;


const client = Agora.createClient({

mode:"rtc",

codec:"vp8"

});


let localTracks = [];



export async function startLive(
appId,
channel,
isHost
){


await client.join(

appId,

channel,

null,

null

);



console.log("JOINED CHANNEL");



if(isHost){
  console.log("I AM HOST");


localTracks =
await Agora.createMicrophoneAndCameraTracks();
console.log("CAMERA CREATED");


const video =
document.getElementById("liveLocalVideo");


console.log("LOCAL VIDEO BOX:", video);


await localTracks[1].play(video);


console.log("HOST CAMERA SHOWING");


await client.publish(localTracks);


console.log("HOST PUBLISHED");

}


client.on(
"user-published",
async(user, mediaType)=>{


await client.subscribe(
user,
mediaType
);



if(mediaType==="video"){


const video =
document.getElementById("liveRemoteVideo");


user.videoTrack.play(video);


}



if(mediaType==="audio"){

user.audioTrack.play();

}


});


}





export async function stopLive(){


for(const track of localTracks){

track.stop();

track.close();

}


await client.leave();


}