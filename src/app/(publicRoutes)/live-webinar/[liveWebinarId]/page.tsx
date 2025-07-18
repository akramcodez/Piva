// src/app/(publicRoutes)/live-webinar/[liveWebinarId]/page.tsx
import { getWebinarById } from '@/actions/webinar'; //
import { onAuthenticateUser } from '@/actions/auth'; //
import { findOneProduct } from '@/actions/product'; //
import RenderWebinar from './_components/RenderWebinar';
import { WebinarWithPresenter, AttendanceUser } from '@/lib/type'; // Ensure AttendanceUser is imported
import { prismaClient } from '@/lib/prismaClient'; //
import { getAttendeeAttendanceForWebinar } from '@/actions/attendence'; //

type Props = {
  params: Promise<{
    liveWebinarId: string;
  }>;
  searchParams: Promise<{
    error: string;
  }>;
};

const page = async ({ params, searchParams }: Props) => {
  const { liveWebinarId } = await params;
  const { error } = await searchParams;

  const webinarData = (await getWebinarById(
    liveWebinarId,
  )) as WebinarWithPresenter; //

  if (!webinarData) {
    return (
      <div className="w-full min-h-screen flex justify-center items-center text-lg sm:text-4xl">
        Webinar Not Found
      </div>
    );
  }
  const checkUser = await onAuthenticateUser(); //

  let currentAttendeeDbRecord: AttendanceUser | null = null;
  let hasWebinarAttendance = false;

  if (checkUser.user?.email) {
    // If a logged-in user, use their email to find attendee
    const potentialAttendee = await prismaClient.attendee.findUnique({
      where: { email: checkUser.user.email },
      include: {
        // Include attendances to check for this webinar
        Attendance: {
          where: { webinarId: webinarData.id },
          take: 1, // Only need to check if one exists
        },
      },
    });

    if (potentialAttendee) {
      // If an Attendee record exists and has an attendance for this webinar
      if (potentialAttendee.Attendance.length > 0) {
        const attendanceForThisWebinar = potentialAttendee.Attendance[0];
        hasWebinarAttendance = true;

        // Construct the AttendanceUser object from both Attendee and Attendance data
        currentAttendeeDbRecord = {
          id: potentialAttendee.id,
          name: potentialAttendee.name,
          email: potentialAttendee.email,
          attendedAt: attendanceForThisWebinar.joinedAt, // From Attendance record
          updatedAt: potentialAttendee.updatedAt,
          createdAt: potentialAttendee.createdAt, // From Attendee record
          callStatus: potentialAttendee.callStatus,
        };
      } else {
        // If Attendee exists but not registered for THIS webinar
        // We still want to use their base info if we are going to prompt registration
        currentAttendeeDbRecord = {
          id: potentialAttendee.id,
          name: potentialAttendee.name,
          email: potentialAttendee.email,
          // attendedAt and stripeConnectId might be null or default here as they are specific to a confirmed attendance
          // For the purpose of setting up the store for registration, you might populate these with defaults or null
          // If you set them to null, ensure AttendanceUser allows null for them
          attendedAt: new Date(), // Or null if your AttendanceUser allows null/optional for un-registered state
          updatedAt: potentialAttendee.updatedAt,
          createdAt: potentialAttendee.createdAt,
          callStatus: potentialAttendee.callStatus,
        };
      }
    }
  }

  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY as string;

  const product = webinarData.priceId
    ? await findOneProduct(webinarData.priceId) //
    : null;

  return (
    <div className="w-full h-screen ">
      <RenderWebinar
        error={error}
        user={checkUser.user || null}
        webinar={webinarData}
        apiKey={apiKey}
        product={product}
        hasWebinarAttendance={hasWebinarAttendance}
        serverAttendee={currentAttendeeDbRecord} // Pass the correctly constructed object
      />
    </div>
  );
};

export default page;
