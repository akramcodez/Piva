'use client';

import { getStreamIoToken } from '@/actions/streamIo';
import { Button } from '@/components/ui/button';
import { ClientProduct, WebinarWithPresenter } from '@/lib/type';
import { useAttendeeStore } from '@/store/useAttendeeStore';
import {
  StreamVideoClient,
  type User,
  type Call,
  StreamVideo,
  StreamCall,
} from '@stream-io/video-react-sdk';
import { AlertCircle, Cast, CircleCheckBig, WifiOff } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; // Only if you truly need a new UUID for a guest if attendee is consistently null
import LiveWebinarView from '../Common/LiveWebinarView';

type Props = {
  apiKey: string;
  callId: string;
  webinar: WebinarWithPresenter;
  product?: ClientProduct | null;
};

const Participant = ({ apiKey, callId, webinar, product }: Props) => {
  const { attendee } = useAttendeeStore();
  const [showChat, setShowChat] = useState(true);
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connectionStatus, setConnectionstatus] = useState<
    'connecting' | 'failed' | 'reconnecting' | 'connected'
  >('connecting');

  const clientInitialized = useRef<boolean>(false);

  useEffect(() => {
    if (!attendee || clientInitialized.current) {
      return;
    }

    const initClient = async () => {
      try {
        setConnectionstatus('connecting');
        const userIdToUse = attendee.id;
        const userNameToUse = attendee.name;

        const user: User = {
          id: userIdToUse,
          name: userNameToUse,
          image: `https://api.dicebear.com/7.x/initials/svg?seed=${userNameToUse}`,
        };

        const userToken = await getStreamIoToken(attendee);
        setToken(userToken);

        const streamClient = new StreamVideoClient({
          apiKey,
          user,
          token: userToken,
        });
        streamClient.on('connection.changed', (event) => {
          if (event.online) {
            setConnectionstatus('connected');
          } else {
            setConnectionstatus('reconnecting');
          }
        });

        await streamClient.connectUser(user, userToken);
        const streamCall = streamClient.call('livestream', callId);
        await streamCall.join({ create: true });

        setClient(streamClient);
        setCall(streamCall);
        setConnectionstatus('connected');
        clientInitialized.current = true;
      } catch (error) {
        console.log('Error initializing client or joining call:', error);
        setConnectionstatus('failed');
        setErrorMessage(
          (error as { message?: string })?.message ||
            'Failed to connect to webinar',
        );
      }
    };

    initClient();

    return () => {
      const currentCall = call;
      const currentClient = client;

      if (currentCall && currentClient) {
        currentCall
          .leave()
          .then(() => {
            console.log('left the call');
            currentClient.disconnectUser();
            clientInitialized.current = false;
          })
          .catch((error: unknown) => {
            console.log('Error leaving call', error);
          });
      }
    };
  }, [apiKey, callId, attendee, call, client]);

  if (!attendee) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center max-w-md p-8 rounded-lg border border-border bg-card">
          <h2 className="text-2xl font-bold mb-4">
            Please register to join the webinar
          </h2>
          <p className="text-muted-foreground mb-6">
            Registration is required to participate in this webinar.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-accent-primary hover:bg-accent-primary/90 text-accent-foreground"
          >
            Register Now
          </Button>
        </div>
      </div>
    );
  }

  if (!client || !call || !token) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="text-center max-w-md p-8 rounded-lg border border-border bg-card">
          {connectionStatus === 'connecting' && (
            <>
              <div className="relative mx-auto w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-full border-t-2 border-accent-primary animate-spin"></div>
                <div className="absolute inset-3 rounded-full bg-card flex items-center justify-center">
                  <Cast className="h-10 w-10 text-accent-primary animate-pulse" />
                </div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Joining Webinar</h2>
              <p className="text-muted-foreground">
                Connecting to {webinar.title}...
              </p>
              <div className="mt-6 flex justify-center space-x-1">
                <span className="h-2 w-2 bg-accent-primary rounded-full animate-bounce"></span>
                <span
                  className="h-2 w-2 bg-accent-primary rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></span>
                <span
                  className="h-2 w-2 bg-accent-primary rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                ></span>
              </div>
            </>
          )}
          {connectionStatus === 'reconnecting' && (
            <>
              <div className="mx-auto w-16 mb-4 text-amber-500">
                <WifiOff className="h-16 w-16 animate-pulse" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Reconnecting</h2>
              <p className="text-muted-foreground mb-4">
                Connection lost. Attempting to reconnect...
              </p>
              <div className="w-full bg-muted rounded-full h-2 mb-6">
                <div
                  className="bg-amber-500 h-2 rounded-full animate-pulse"
                  style={{ width: '60%' }}
                ></div>
              </div>
            </>
          )}
          {connectionStatus === 'failed' && (
            <>
              <div className="mx-auto w-16 h-16 mb-4 text-destructive">
                <AlertCircle className="h-16 w-16" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage || 'Unable to connect to the webinar'}
              </p>
              <div className="flex space-x-4 justify-center">
                <Button
                  variant={'outline'}
                  onClick={() => window.location.reload()}
                >
                  Try Again
                </Button>
                <Button
                  className="bg-accent-primary hover:bg-accent-primary/90 text-accent-foreground"
                  onClick={() => (window.location.href = '/')}
                >
                  Back to Home
                </Button>
              </div>
            </>
          )}
          {connectionStatus === 'connected' && (
            <>
              <div className="mx-auto w-16 h-16 text-green-500">
                <CircleCheckBig className="h-16 w-16" />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        <LiveWebinarView
          showChat={showChat}
          setShowChat={setShowChat}
          isHost={false}
          webinar={webinar}
          username={attendee.name}
          userId={attendee.id}
          call={call}
          userToken={token}
          product={product}
        />
      </StreamCall>
    </StreamVideo>
  );
};

export default Participant;
