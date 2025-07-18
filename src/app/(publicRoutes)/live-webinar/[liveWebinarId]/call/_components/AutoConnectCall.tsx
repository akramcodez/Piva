'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ClientProduct, WebinarWithPresenter } from '@/lib/type';
import { vapi } from '@/lib/vapi/vapiclient';
import { changeCallStatus } from '@/actions/attendence';
import { CallStatusEnum } from '@prisma/client';
import { toast } from 'sonner';
import { Clock, Loader2, Mic, MicOff, PhoneOff } from 'lucide-react';
import { RiRobot3Line } from 'react-icons/ri';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import PurchaseDialogBox from '../../_components/Common/PurchaseDialogBox';

const CallStatus = {
  CONNECTING: 'CONNECTING',
  ACTIVE: 'ACTIVE',
  FINISHED: 'FINISHED',
};

type Props = {
  userName?: string;
  assistantId: string;
  assistantName?: string;
  callTimeLimit?: number;
  webinar: WebinarWithPresenter;
  userId: string;
  product?: ClientProduct | null;
};

const AutoConnectCall = ({
  userName = 'User',
  assistantId,
  assistantName = 'Ai Assistant',
  callTimeLimit = 180,
  webinar,
  userId,
  product,
}: Props) => {
  const [callStatus, setCallStatus] = useState(CallStatus.CONNECTING);
  const [assistantIsSpeaking, setAssistantIsSpeaking] = useState(false);
  const [userIsSpeaking, setUserIsSpeaking] = useState(false);
  const [isMicMuted, setMicMuted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(callTimeLimit);
  const [purchaseDialog, setPurchaseDialog] = useState(false);

  const toggleMicMute = () => {
    if (refs.current.audioStream) {
      refs.current.audioStream.getAudioTracks().forEach((track) => {
        track.enabled = isMicMuted;
      });
    }
    setMicMuted(!isMicMuted);
  };

  const handleClick = () => {
    setPurchaseDialog(true);
  };

  const refs = useRef({
    countdownTimer: undefined as NodeJS.Timeout | undefined,
    audioStream: null as MediaStream | null,
    userSpeakingTimeout: undefined as NodeJS.Timeout | undefined,
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const cleanup = () => {
    if (refs.current.countdownTimer) {
      clearInterval(refs.current.countdownTimer);
      refs.current.countdownTimer = undefined;
    }

    if (refs.current.userSpeakingTimeout) {
      clearTimeout(refs.current.userSpeakingTimeout);
      refs.current.userSpeakingTimeout = undefined;
    }

    if (refs.current.audioStream) {
      refs.current.audioStream.getTracks().forEach((track) => track.stop());
      refs.current.audioStream = null;
    }
  };

  const setupAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      refs.current.audioStream = stream;

      const audioContext = new (window.AudioContext || window.AudioContext)();
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;

      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyzer);

      const checkAudioLevel = () => {
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(dataArray);

        const average =
          dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const normalizedVolume = average / 256;

        if (normalizedVolume > 0.15 && !assistantIsSpeaking && !isMicMuted) {
          setUserIsSpeaking(true);

          if (refs.current.userSpeakingTimeout) {
            clearTimeout(refs.current.userSpeakingTimeout);
          }

          refs.current.userSpeakingTimeout = setTimeout(() => {
            setUserIsSpeaking(false);
          }, 500);
        }
      };

      let running = true;
      const loop = () => {
        if (!running) return;
        checkAudioLevel();
        requestAnimationFrame(loop);
      };
      loop();

      return () => {
        running = false;
      };
    } catch (error) {
      console.error('Error in Audio: ', error);
    }
  };

  const stopCall = async () => {
    try {
      vapi.stop();
      setCallStatus(CallStatus.FINISHED);
      cleanup();
      const res = await changeCallStatus(userId, CallStatusEnum.COMPLETED);
      if (!res.success) {
        throw new Error('Failed to update call status');
      }
      toast.success('Call Ended Successfully');
    } catch (error) {
      console.error('Failed to stop call', error);
      toast.error('Failed to Stop call, Try Again');
    }
  };

  const startCall = async () => {
    try {
      setCallStatus(CallStatus.CONNECTING);

      // Defensive: stop any previous call before starting a new one
      if (typeof vapi.stop === 'function') {
        await vapi.stop();
      }

      await vapi.start(assistantId);
      const res = await changeCallStatus(userId, CallStatusEnum.InProgress);
      if (!res.success) {
        throw new Error('Failed to update call status');
      }
      toast.success('Call started successfully');
    } catch (error) {
      console.error('Failed to start Call: ', error);
      toast.error('Failed to start call. Please try again');
      setCallStatus(CallStatus.FINISHED);
    }
  };

  // Main useEffect controls the call
  // useEffect(() => {
  //   startCall();

  //   return () => {
  //     stopCall();
  //   };
  // }, []);

  useEffect(() => {
    const onCallStart = async () => {
      console.log('Call Started');
      setCallStatus(CallStatus.ACTIVE);
      setupAudio();

      setTimeRemaining(callTimeLimit);
      refs.current.countdownTimer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(refs.current.countdownTimer);
            stopCall();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const onCallEnd = () => {
      console.log('Call Ended');
      setCallStatus(CallStatus.FINISHED);
      cleanup();
    };

    const onSpeechStart = () => {
      setAssistantIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      setAssistantIsSpeaking(false);
    };

    const onError = (error: Error) => {
      console.error('Vapi error: ', error);
      setCallStatus(CallStatus.FINISHED);
      cleanup();
    };

    vapi.on('call-start', onCallStart);
    vapi.on('call-end', onCallEnd);
    vapi.on('speech-start', onSpeechStart);
    vapi.on('speech-end', onSpeechEnd);
    vapi.on('error', onError);

    return () => {
      vapi.off('call-start', onCallStart);
      vapi.off('call-end', onCallEnd);
      vapi.off('speech-start', onSpeechStart);
      vapi.off('speech-end', onSpeechEnd);
      vapi.off('error', onError);
    };
  }, [userName, callTimeLimit]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-background">
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 relative">
        <div className="flex-1 bg-card rounded-xl overflow-hidden shadow-lg relative">
          <div className="absolute top-4 left-4 bg-black/40 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1 z-10">
            <Mic
              className={cn('h-4 e-4', assistantIsSpeaking ? 'themeColor' : '')}
            />
            <span>{assistantName}</span>
          </div>

          <div className="h-full flex items-center justify-center">
            <div className="relative">
              {assistantIsSpeaking && (
                <>
                  <div
                    className="absolute inset-0 rounded-full border-4
                    themeBgBorder animate-ping opacity-20"
                    style={{ margin: '-8px' }}
                  />
                  <div
                    className="absolute inset-0 rounded-full border-4
                    themeBgBorder animate-ping opacity-10"
                    style={{ margin: '-16px', animationDelay: '0.5s' }}
                  />
                </>
              )}

              <div
                className={cn(
                  'flex justify-center items-center rounded-full overflow-hidden border-4 p-6',
                  assistantIsSpeaking ? 'themeBgBorder' : 'themeBgBorderLight',
                )}
              >
                <RiRobot3Line className="w-[70px] h-[70px]" />
              </div>
              {assistantIsSpeaking && (
                <div
                  className="absolute -bottom-0.5 -right-2 themeBgDark 
                text-white p-2 rounded-full"
                >
                  <Mic className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-card rounded-xl overflow-hidden shadow-lg relative">
          <div
            className="absolute top-4 left-4 bg-black/40 text-white px-3 py-1 
            rounded-full text-sm flex items-center gap-2 z-10"
          >
            {isMicMuted ? (
              <>
                <MicOff className="h-4 w-4 text-destructive" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Mic
                  className={cn('h-4 w-4', userIsSpeaking ? 'themeColor' : '')}
                />
                <span>{userName}</span>
              </>
            )}
          </div>

          <div
            className="absolute top-4 right-4 bg-black/40 text-white px-3 py-1
            rounded-full text-sm flex items-center gap-2 z-10"
          >
            <Clock className="h-4 w-4" />
            <span>{formatTime(timeRemaining)}</span>
          </div>

          <div className="h-full flex items-center justify-center">
            <div className="relative">
              {userIsSpeaking && !isMicMuted && (
                <>
                  <div
                    className="absolute inset-0 rounded-full border-4
                    themeBgBorder animate-ping opacity-20"
                    style={{ margin: '-8px' }}
                  ></div>
                </>
              )}

              <div
                className={cn(
                  'flex justify-center items-center rounded-full overflow-hidden border-4',
                  isMicMuted
                    ? 'border-destructive/50'
                    : userIsSpeaking
                    ? 'themeBgBorder'
                    : 'themeBgBorderLight',
                )}
              >
                <Avatar className="w-[110px] h-[110px]">
                  <AvatarImage src="/user-avatar.png" alt={userName} />
                  <AvatarFallback>
                    {userName.split('')?.[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              {isMicMuted && (
                <div
                  className="absolute -bottom-2 -right-2 bg-destructive 
                text-white p-2 rounded-full"
                >
                  <MicOff className="h-4 w-4" />
                </div>
              )}

              {userIsSpeaking && !isMicMuted && (
                <div
                  className="absolute -bottom-0.5 -right-2 themeBgDark 
                text-white p-2 rounded-full"
                >
                  <Mic className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        </div>

        {callStatus === CallStatus.CONNECTING && (
          <div
            className="absolute inset-0 bg-background/80 flex items-center
            justify-center gap-2 z-50"
          >
            <Loader2 className="h-10 w-10 animate-spin themeColor" />
            <h3 className="text-xl font-medium">Connecting...</h3>
          </div>
        )}

        {callStatus === CallStatus.FINISHED && (
          <div
            className="absolute inset-0 bg-background/90 flex items-center
            justify-center flex-col gap-2 z-50"
          >
            <h3 className="text-xl font-medium">Call Ended</h3>
            <p className="text-muted-foreground">Time Limit reached</p>
          </div>
        )}
      </div>

      <div className="bg-card border-t border-border p-4 rounded-lg">
        <div
          className="max-w-3xl mx-auto flex item-center justify-between 
          flex-wrap gap-3"
        >
          <div className="flex items-center gap-2">
            {callStatus === CallStatus.ACTIVE && (
              <>
                <Clock className="h-6 w-6 text-muted-foreground" />
                <span
                  className={cn(
                    'text-sm font-lg',
                    timeRemaining < 30
                      ? 'text-destructive animate-pulse'
                      : timeRemaining < 60
                      ? 'text-amber-500'
                      : 'text-muted-foreground',
                  )}
                >
                  {formatTime(timeRemaining)}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleMicMute}
              className={cn(
                'p-3 rounded-full transition-all',
                isMicMuted
                  ? 'bg-destructive text-primary'
                  : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border',
              )}
              disabled={callStatus !== CallStatus.ACTIVE}
            >
              {isMicMuted ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </button>

            <button
              onClick={stopCall}
              className="p-3 rounded-full bg-destructive text-primary hover:bg-destructive/90 transition-all"
              aria-label="End call"
              disabled={callStatus !== CallStatus.ACTIVE}
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </div>

          <Button
            variant={'outline'}
            onClick={handleClick}
            className="cursor-pointer mt-2"
          >
            Buy Now
          </Button>

          <div className="hidden md:block">
            {callStatus === CallStatus.ACTIVE && timeRemaining < 30 && (
              <span className="text-destructive font-medium">
                Call ending soon
              </span>
            )}
          </div>
        </div>
      </div>
      {purchaseDialog && (
        <PurchaseDialogBox
          open={purchaseDialog}
          onOpenChange={setPurchaseDialog}
          product={product}
          userId={webinar.presenterId}
          webinarId={webinar.id}
        />
      )}
    </div>
  );
};

export default AutoConnectCall;
