import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2 } from 'lucide-react';
import { socket } from '../../lib/socket';
import { useStore } from '../../store/useStore';
import type { CallData } from '../../types';

interface Props {
  activeCall: CallData | null;
  onEndCall: () => void;
}

export const CallModal: React.FC<Props> = ({ activeCall, onEndCall }) => {
  const { user } = useStore();
  const [callStatus, setCallStatus] = useState<'calling' | 'incoming' | 'connected' | 'ended'>('idle' as any);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [duration, setDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  const cleanupCall = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!activeCall) return;
    setCallStatus(activeCall.status as any);
    setIsVideoEnabled(activeCall.isVideo);

    const initWebRTC = async () => {
      try {
        const constraints = {
          audio: true,
          video: activeCall.isVideo
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('iceCandidate', {
              targetUserId: activeCall.targetUserId || activeCall.callerId,
              candidate: event.candidate
            });
          }
        };

        if (activeCall.status === 'calling') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('callUser', {
            targetUserId: activeCall.targetUserId,
            callerId: user?.id,
            callerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
            callerAvatar: user?.avatarUrl,
            isVideo: activeCall.isVideo,
            signalData: offer
          });
        }
      } catch (err) {
        console.warn('[WebRTC Init Error]:', err);
      }
    };

    void initWebRTC();

    socket.on('callAccepted', async (data: { signalData: any }) => {
      setCallStatus('connected');
      if (peerConnectionRef.current && data.signalData) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.signalData));
      }
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    });

    socket.on('iceCandidate', async (data: { candidate: any }) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {
          // ignore candidate error
        }
      }
    });

    socket.on('callEnded', () => {
      cleanupCall();
      onEndCall();
    });

    socket.on('callRejected', () => {
      cleanupCall();
      onEndCall();
    });

    return () => {
      cleanupCall();
      socket.off('callAccepted');
      socket.off('iceCandidate');
      socket.off('callEnded');
      socket.off('callRejected');
    };
  }, [activeCall, user, cleanupCall, onEndCall]);

  const handleAcceptCall = async () => {
    if (!activeCall || !peerConnectionRef.current) return;
    setCallStatus('connected');

    if (activeCall.signalData) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(activeCall.signalData));
      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);

      socket.emit('answerCall', {
        targetUserId: activeCall.callerId,
        signalData: answer
      });
    }

    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleEndCall = () => {
    if (activeCall) {
      socket.emit('endCall', { targetUserId: activeCall.targetUserId || activeCall.callerId });
    }
    cleanupCall();
    onEndCall();
  };

  const handleRejectCall = () => {
    if (activeCall) {
      socket.emit('rejectCall', { targetUserId: activeCall.callerId });
    }
    cleanupCall();
    onEndCall();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  if (!activeCall) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 select-none font-sans">
      <div className="w-full max-w-lg bg-[#0B0B0B] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center relative overflow-hidden">
        {activeCall.isVideo && callStatus === 'connected' ? (
          <div className="w-full h-80 bg-[#000000] rounded-2xl overflow-hidden relative border border-white/10 mb-6">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 w-28 h-20 object-cover rounded-xl border border-white/20 shadow-lg" />
          </div>
        ) : (
          <div className="flex flex-col items-center my-6">
            <div className="relative mb-4">
              <img
                src={activeCall.callerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeCall.callerName}`}
                alt={activeCall.callerName}
                className="w-28 h-28 rounded-full object-cover border-4 border-[#229ED9]/30 shadow-2xl animate-pulse"
              />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#229ED9] flex items-center justify-center text-white shadow-lg">
                <Volume2 size={16} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{activeCall.callerName}</h3>
            <p className="text-xs text-[#229ED9] font-medium">
              {callStatus === 'calling' ? "Qo'ng'iroq qilinmoqda..." : callStatus === 'incoming' ? "Kiruvchi qo'ng'iroq..." : formatDuration(duration)}
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-subtle cursor-pointer ${isMuted ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
            title={isMuted ? "Mikrofonni yoqish" : "Mikrofonni o'chirish"}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {activeCall.isVideo && (
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-subtle cursor-pointer ${!isVideoEnabled ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
              title={!isVideoEnabled ? "Kamerani yoqish" : "Kamerani o'chirish"}
            >
              {!isVideoEnabled ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}

          {callStatus === 'incoming' ? (
            <>
              <button
                onClick={handleAcceptCall}
                className="w-14 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 cursor-pointer"
                title="Qabul qilish"
              >
                <Phone size={24} />
              </button>
              <button
                onClick={handleRejectCall}
                className="w-14 h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 cursor-pointer"
                title="Rad etish"
              >
                <PhoneOff size={24} />
              </button>
            </>
          ) : (
            <button
              onClick={handleEndCall}
              className="w-14 h-14 rounded-2xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 cursor-pointer"
              title="Qo'ng'iroqni yakunlash"
            >
              <PhoneOff size={24} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
