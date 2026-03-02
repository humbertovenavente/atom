import { defineEventHandler, readBody, createError } from 'h3';
import { appointmentService } from '../../services/appointment.service';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { sessionId, validationData } = body ?? {};

  if (!sessionId || !validationData) {
    throw createError({ statusCode: 400, statusMessage: 'sessionId and validationData are required' });
  }

  const { fullName, preferredDate, preferredTime } = validationData;
  if (!fullName || !preferredDate || !preferredTime) {
    throw createError({ statusCode: 400, statusMessage: 'fullName, preferredDate, and preferredTime are required' });
  }

  const result = await appointmentService.bookAppointment(
    preferredDate,
    preferredTime,
    fullName,
    sessionId
  );

  return result;
});
