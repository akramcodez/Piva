import type { User, Webinar } from '@prisma/client';
import { AttendedTypeEnum, CallStatusEnum } from '@prisma/client';

export type validationError = Record<string, string>;

export type ValidationResult = {
  valid: boolean;
  errors: validationError;
};

export const validateBasicInfo = (data: {
  webinarName?: string;
  description?: string;
  date?: Date;
  time?: string;
  timeFormat?: 'AM' | 'PM';
}): ValidationResult => {
  const errors: validationError = {};

  if (!data.webinarName?.trim()) {
    errors.webinarName = 'Webinar Name is required';
  }

  if (!data.description?.trim()) {
    errors.description = 'Description is required';
  }

  if (!data.date) {
    errors.date = 'Date is required';
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (data.date < today) {
      errors.date = 'Webinar date cannot be in the past';
    }
  }

  if (!data.time?.trim()) {
    errors.time = 'Time is required';
  } else {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(data.time)) {
      errors.time = 'Invalid time format. Use HH:MM';
    } else if (data.date) {
      const [hours, minutes] = data.time.split(':').map(Number);
      const selectedDateTime = new Date(data.date);
      selectedDateTime.setHours(
        data.timeFormat === 'PM' && hours !== 12 ? hours + 12 : hours,
        minutes,
      );

      const currentDate = new Date();
      if (
        data.date.toDateString() === currentDate.toDateString() &&
        selectedDateTime < currentDate
      ) {
        errors.time = 'Webinar time cannot be in the past';
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateCTA = (data: {
  ctaLabel?: string;
  tags?: string[];
  ctaType?: string;
  aiAgent?: string;
}): ValidationResult => {
  const errors: validationError = {};

  if (!data.ctaLabel?.trim()) {
    errors.ctaLabel = 'CTA Label is required';
  }

  if (!data.ctaType) {
    errors.aiAgent = 'AI Agent is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateAdditionalInfo = (data: {
  lockChat?: boolean;
  couponCode?: string;
  couponEnabled?: boolean;
}): ValidationResult => {
  const errors: validationError = {};

  if (data.couponEnabled && !data.couponCode?.trim()) {
    errors.couponCode = 'Coupon Code is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export type AttendanceUser = {
  id: string;
  name: string;
  email: string;
  attendedAt: Date;
  updatedAt: Date;
  createdAt: Date;
  callStatus: CallStatusEnum;
};

export type AttendanceData = {
  count: number;
  users: AttendanceUser[];
};

//remove this if not using in future
export type WebinarAttendanceResponse = {
  success: boolean;
  data?: Record<AttendedTypeEnum, AttendanceData>;
  ctaType?: string;
  tags?: string[];
  status?: number;
  message?: string;
};

export type WebinarWithPresenter = Webinar & {
  presenter: User;
};

export type StreamCallRecording = {
  fileName: string;
  url: string;
  start_time: Date;
  end_time: Date;
  session_id: string;
};

export type ClientProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  status: string;
  image: string | null;
  ownerId: string;
  totalSales: number;
  createdAt: string;
  updatedAt: string;
};
