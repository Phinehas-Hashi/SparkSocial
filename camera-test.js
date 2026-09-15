const Agora = window.AgoraRTC;


const APP_ID =
"e866571f8d394aa8b991fb67237a5542";


const client = Agora.createClient({

mode:"rtc",

codec:"vp8"

});



async function testCamera(){


try{


await client.join(

APP_ID,

"test-channel",

null,

null

);



const tracks =
await Agora.createMicrophoneAndCameraTracks();



const video =
document.getElementById("camera");



console.log("VIDEO BOX:",video);



await tracks[1].play(video);



console.log("CAMERA SHOULD SHOW");



await client.publish(tracks);



console.log("PUBLISHED");


}
catch(error){


console.error("CAMERA ERROR:",error);


alert(error.message);


}


}



testCamera();