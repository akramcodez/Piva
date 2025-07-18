// src/app/(publicRoutes)/live-webinar/[liveWebinarId]/_components/RenderWebinar.tsx
'use client';

import React, { useEffect } from 'react';
import { User, WebinarStatusEnum } from '@prisma/client';
import WebinarUpcomingState from './UpcomingWebinar/WebinarUpcomingState';
import { usePathname, useRouter } from 'next/navigation';
import { useAttendeeStore } from '@/store/useAttendeeStore';
import { toast } from 'sonner';
import LiveStreamState from './LiveWebinar/LiveStreamState';
import {
  ClientProduct,
  WebinarWithPresenter,
  AttendanceUser, // Assuming AttendanceUser is attendee type with callStatus
} from '@/lib/type'; //
import Participant from './Participant/Participant';

type Props = {
  error: string | undefined;
  user: User | null;
  webinar: WebinarWithPresenter;
  apiKey: string;
  product?: ClientProduct | null;
  hasWebinarAttendance: boolean; // New prop
  serverAttendee: AttendanceUser | null; // New prop, attendee if found in DB
};

const RenderWebinar = ({
  error,
  user,
  webinar,
  apiKey,
  product,
  hasWebinarAttendance,
  serverAttendee,
}: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const { attendee, setAttendee } = useAttendeeStore(); // Access attendee from Zustand

  // If server provided an attendee record, and Zustand doesn't have it, set it.
  // This helps rehydrate Zustand on initial load if user is already a DB attendee
  useEffect(() => {
    if (serverAttendee && !attendee) {
      setAttendee(serverAttendee);
    }
  }, [serverAttendee, attendee, setAttendee]);

  useEffect(() => {
    if (error) {
      // Only show toast if there's an actual error message
      toast.error(error);
      router.push(pathname); // Consider whether you always want to push to pathname on error
    }
  }, [error, router, pathname]);

  // Determine if the user should directly join or register
  const shouldJoinDirectly =
    user?.id === webinar.presenterId || (attendee && hasWebinarAttendance);
  const showRegistrationForm = !shouldJoinDirectly;

  return (
    <React.Fragment>
      {webinar.webinarStatus === 'LIVE' ? (
        <React.Fragment>
          {user?.id === webinar.presenterId ? ( // Is host?
            <LiveStreamState
              apiKey={apiKey}
              webinar={webinar}
              callId={webinar.id}
              user={user}
              product={product}
            />
          ) : showRegistrationForm ? ( // Not host, and needs to register for *this specific webinar*
            <WebinarUpcomingState
              webinar={webinar}
              currentUser={user || null}
            />
          ) : (
            // Not host, but has an attendance record for *this specific webinar* (or is a valid attendee from store)
            <Participant
              apiKey={apiKey}
              webinar={webinar}
              callId={webinar.id}
              product={product}
            />
          )}
        </React.Fragment>
      ) : webinar.webinarStatus === WebinarStatusEnum.CANCELLED ? (
        <div className="flex justify-center items-center h-full w-full">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-semibold text-primary">
              {webinar?.title}
            </h3>
            <p className="text-muted-foreground text-sm">
              This Webinar has been cancelled
            </p>
          </div>
        </div>
      ) : webinar.webinarStatus === WebinarStatusEnum.ENDED ? (
        <div className="flex justify-center items-center h-full w-full">
          <div className="text-center space-y-4">
            <h3 className="text-4xl font-semibold text-primary">
              {webinar?.title}
            </h3>
            <p className="text-muted-foreground text-xl">
              This webinar has Ended. No recording is available
            </p>
          </div>
        </div>
      ) : (
        // All other statuses (SCHEDULED, WAITING_ROOM)
        <WebinarUpcomingState webinar={webinar} currentUser={user || null} />
      )}
    </React.Fragment>
  );
};

export default RenderWebinar;
