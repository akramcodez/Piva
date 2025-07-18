'use client';

import { ClientProduct, WebinarWithPresenter } from '@/lib/type';
import { Loader2, MessageSquare, User, Users } from 'lucide-react';
import {
  ParticipantView,
  useCallStateHooks,
  type Call,
} from '@stream-io/video-react-sdk';
import { StreamChat } from 'stream-chat';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CtaTypeEnum } from '@prisma/client';
import { Chat, Channel, MessageList, MessageInput } from 'stream-chat-react';
import CTADialogBox from './CTADialogBox';
import { useRouter } from 'next/navigation';
import { changeWebinarStatus } from '@/actions/webinar';
import { toast } from 'sonner';
import ObsDialogBox from './ObsDialogBox';
import PurchaseDialogBox from './PurchaseDialogBox';

type Props = {
  showChat: boolean;
  setShowChat: (show: boolean) => void;
  isHost?: boolean;
  webinar: WebinarWithPresenter;
  username: string;
  userId: string;
  call: Call;
  userToken: string;
  product?: ClientProduct | null;
};

const LiveWebinarView = ({
  showChat,
  setShowChat,
  isHost,
  webinar,
  username,
  userId,
  call,
  userToken,
  product,
}: Props) => {
  const { useParticipants, useParticipantCount } = useCallStateHooks();
  const viewCount = useParticipantCount();
  const participants = useParticipants();
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [obsDialogBox, setObsDialogBox] = useState(false);
  const [purchaseDialog, setPurchaseDialog] = useState(false);
  const router = useRouter();

  const handleEndStream = async () => {
    setLoading(true);
    try {
      call.stopLive({
        continue_recording: false,
      });
      call.endCall();

      const res = await changeWebinarStatus(webinar.id, 'ENDED');
      if (!res.success) {
        throw new Error(res.message);
      }
      toast.success('Webinar ended successfully');
      router.push('/');
    } catch (error) {
      console.error('Error ending stream', error);
      toast.success('Error ending stream');
    } finally {
      setLoading(false);
    }
  };

  const hostParticipant = participants.length > 0 ? participants[0] : null;

  const handleCTAButtonClick = async () => {
    if (!channel) return;
    console.log('CTA button clicked', channel);
    await channel.sendEvent({
      type: 'open_cta_dialog',
    });
  };

  useEffect(() => {
    const initChat = async () => {
      const client = StreamChat.getInstance(
        process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      );

      await client.connectUser(
        {
          id: userId,
          name: username,
        },
        userToken,
      );

      const channel = client.channel('livestream', webinar.id, {
        name: webinar.title,
      });

      await channel.watch();

      setChatClient(client);
      setChannel(channel);
    };

    initChat();

    return () => {
      if (chatClient) {
        chatClient.disconnectUser();
      }
    };
  }, [userId, username, userToken, webinar.id, webinar.title]);

  useEffect(() => {
    if (chatClient && channel) {
      channel.on((event: any) => {
        if (event.type === 'open_cta_dialog' && !isHost) {
          setDialogOpen(true);
        }
        if (event.type === 'start_live') {
          window.location.reload();
        }
      });
    }
  }, [chatClient, channel, isHost]);

  if (!chatClient || !channel) return null;

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden text-foreground">
      {/* Top Bar */}
      <div className="py-2 px-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="bg-accent-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive animate-pulse"></span>
            </span>
            LIVE
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 bg-muted/50 px-3 py-1 rounded-full">
            <User size={16} />
            <span className="text-sm">{viewCount}</span>
          </div>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`px-2 py-1 rounded-full text-sm flex items-center space-x-1 ${
              showChat
                ? 'animated-gradient-bg border border-border text-primary-foreground'
                : 'bg-muted/50'
            }`}
          >
            <MessageSquare size={16} />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 p-2 gap-2 overflow-hidden flex-col sm:flex-row">
        {/* Video Player / Waiting Screen */}
        <div className="flex-1 rounded-lg overflow-hidden border border-border flex flex-col bg-card">
          <div className="flex-1 relative overflow-hidden">
            {hostParticipant ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="relative w-full h-full max-w-[200px] max-h-[200px] aspect-square">
                  <ParticipantView
                    participant={hostParticipant}
                    className="w-full h-full !object-cover"
                  />
                </div>
              </div>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-muted-foreground
              flex-col space-y-4"
              >
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                  <Users size={40} className="text-muted-foreground" />
                </div>
                <p>Waiting for stream to start...</p>
              </div>
            )}

            {isHost && (
              <div className="absolute top-4 right-4 bg-[#232c23] text-white backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium shadow-md flex items-center">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 animate-pulse"></span>
                </span>
                HOST
              </div>
            )}
          </div>

          {/* Webinar Controls/Info */}
          <div className="p-2 border-t border-border flex flex-col sm:flex-row items-center justify-between py-2 gap-2">
            <div className="flex items-center space-x-2">
              <div className="text-sm font-capitalize">{webinar?.title}</div>
            </div>

            {isHost && (
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
                <Button
                  onClick={() => setObsDialogBox(true)}
                  variant={'outline'}
                  className="mr-2"
                >
                  Get Obs Creds
                </Button>
                <Button
                  onClick={async () => {
                    await channel.sendEvent({
                      type: 'start_live',
                    });
                  }}
                  variant="outline"
                  className="mr-2"
                >
                  Go Live
                </Button>
                <Button onClick={handleEndStream} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      Loading...
                    </>
                  ) : (
                    'End Stream'
                  )}
                </Button>
                <Button onClick={handleCTAButtonClick}>
                  {webinar.ctaType === CtaTypeEnum.BOOK_A_CALL
                    ? 'BOOK_A_CALL'
                    : 'Buy Now'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        {showChat && (
          <Chat client={chatClient}>
            <Channel channel={channel}>
              <div className="w-full sm:w-72 bg-card border border-border overflow-hidden flex flex-col mt-2 sm:mt-0">
                <div className="py-2 text-primary px-3 border-b border-border font-medium flex items-center justify-between">
                  <span className="text-white">Chat</span>
                  <span className="text-xs text-white bg-muted px-2 py-0.5 rounded-full">
                    {viewCount} viewers
                  </span>
                </div>

                <div className="flex-1 p-2">
                  <div className="rounded-lg bg-[#141414] h-full overflow-hidden">
                    <MessageList />
                  </div>
                </div>

                <div className="p-2 border-t border-border">
                  <div className="rounded-lg bg-[#141414]">
                    <MessageInput />
                  </div>
                </div>
              </div>
            </Channel>
          </Chat>
        )}
      </div>

      {/* Dialog Boxes */}
      {dialogOpen && (
        <CTADialogBox
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          setPurchaseDialog={setPurchaseDialog}
          purchase={purchaseDialog}
          webinar={webinar}
          userId={userId}
        />
      )}

      {obsDialogBox && (
        <ObsDialogBox
          open={obsDialogBox}
          onOpenChange={setObsDialogBox}
          rtmpURL={`rtmps://ingress.stream-io-video.com:443/${process.env.NEXT_PUBLIC_STREAM_API_KEY}.livestream.${webinar.id}`}
          streamKey={userToken}
        />
      )}

      {purchaseDialog && (
        <PurchaseDialogBox
          open={purchaseDialog}
          onOpenChange={setPurchaseDialog}
          product={product}
          userId={userId}
          webinarId={webinar.id}
        />
      )}
    </div>
  );
};

export default LiveWebinarView;
