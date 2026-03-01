import { connectDB } from '../db/connect';
import { Appointment } from '../models/appointment';
import { Book } from '../models/book';
import type { BookingResult } from '../../shared/types';

const MAX_BOOKINGS_PER_DAY = 4;

/**
 * Convert "15:00" + "2026-03-05" → "2026-03-05T15:00:00Z"
 * to match the ISO format stored in `slots`.
 */
function normaliseTime(date: string, time: string): string {
  return `${date}T${time}:00Z`;
}

/** Extract HH:mm from ISO time "2026-03-02T15:00:00Z" → "15:00" */
function toHHmm(iso: string): string {
  return iso.split('T')[1]?.replace(':00Z', '') ?? iso;
}

export async function getAvailableSlots(date: string): Promise<string[]> {
  await connectDB();
  const appointment = await Appointment.findOne({ date }).lean();
  if (!appointment) return [];
  const slots = (appointment as any).slots as string[];
  const booked = await Book.find({ date }).lean();
  const bookedTimes = new Set(booked.map((b: any) => b.time as string));
  return slots.filter(s => !bookedTimes.has(s)).map(toHHmm);
}

export const appointmentService = {
  async bookAppointment(
    preferredDate: string,
    preferredTime: string,
    fullName: string,
    sessionId: string
  ): Promise<BookingResult> {
    await connectDB();

    const isoTime = normaliseTime(preferredDate, preferredTime);

    // 1. Verify the date exists and the slot is valid in appointments
    const appointment = await Appointment.findOne({
      date: preferredDate,
      slots: isoTime,
    }).lean();

    if (!appointment) {
      const dateExists = await Appointment.findOne({ date: preferredDate }).lean();
      if (!dateExists) return { success: false, reason: 'date_not_found' };
      const availableSlots = await getAvailableSlots(preferredDate);
      return { success: false, reason: 'slot_not_available', availableSlots };
    }

    // 2. Check day limit
    const dayCount = await Book.countDocuments({ date: preferredDate });
    if (dayCount >= MAX_BOOKINGS_PER_DAY) {
      return { success: false, reason: 'day_fully_booked' };
    }

    // 3. Insert booking — unique index { date, time } prevents duplicates
    try {
      const doc = await Book.create({
        date: preferredDate,
        time: isoTime,
        fullName,
        sessionId,
      });

      return {
        success: true,
        booking: {
          date: doc.date,
          time: doc.time,
          fullName: doc.fullName,
          sessionId: doc.sessionId,
          bookedAt: doc.bookedAt,
        },
      };
    } catch (err: any) {
      if (err.code === 11000) {
        const availableSlots = await getAvailableSlots(preferredDate);
        return { success: false, reason: 'slot_already_booked', availableSlots };
      }
      throw err;
    }
  },
};
