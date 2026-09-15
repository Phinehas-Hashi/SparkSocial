const AgoraRTC = window.AgoraRTC;

let client = null;

let localAudioTrack = null;

let localVideoTrack = null;

export async function joinCall(appId, channelName, isVideo = false){

    client = AgoraRTC.createClient({

        mode: "rtc",

        codec: "vp8"

    });

    client.on("user-published", async(user, mediaType)=>{

        await client.subscribe(user, mediaType);

        if(mediaType === "audio"){

            user.audioTrack.play();

        }

        if(mediaType === "video"){

            user.videoTrack.play("remoteVideo");

        }

    });

    await client.join(

        appId,

        channelName,

        null,

        null

    );

    if(isVideo){

        [localAudioTrack, localVideoTrack] =

        await AgoraRTC.createMicrophoneAndCameraTracks();

        localVideoTrack.play("localVideo");

        await client.publish([

            localAudioTrack,

            localVideoTrack

        ]);

    }else{

        localAudioTrack =

        await AgoraRTC.createMicrophoneAudioTrack();

        await client.publish([

            localAudioTrack

        ]);

    }

}

export async function leaveCall(){

    if(localAudioTrack){

        localAudioTrack.stop();

        localAudioTrack.close();

    }

    if(localVideoTrack){

        localVideoTrack.stop();

        localVideoTrack.close();

    }

    if(client){

        await client.leave();

    }

}

export async function toggleMute(){

    if(!localAudioTrack) return false;

    const muted = localAudioTrack.muted;

    await localAudioTrack.setMuted(!muted);

    return !muted;

}