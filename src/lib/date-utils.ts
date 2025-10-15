import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TIMEZONE = 'Europe/Paris';

/**
 * Get the current date and time in Paris timezone
 */
export const getNow = (): Date => {
  return toZonedTime(new Date(), TIMEZONE);
};

/**
 * Convert a date to Paris timezone
 */
export const toParisTime = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(dateObj, TIMEZONE);
};

/**
 * Convert a Paris time to UTC for database storage
 */
export const toUTC = (date: Date): Date => {
  return fromZonedTime(date, TIMEZONE);
};

/**
 * Format a date in French locale with Paris timezone
 */
export const formatParisDate = (
  date: Date | string,
  formatStr: string = 'PP'
): string => {
  const parisDate = toParisTime(date);
  return format(parisDate, formatStr, { locale: fr });
};

/**
 * Get ISO string in Paris timezone
 */
export const toParisISO = (date?: Date): string => {
  const now = date || getNow();
  return toUTC(now).toISOString();
};

/**
 * Format date for French display (DD/MM/YYYY)
 */
export const toFrenchDate = (date: Date | string): string => {
  return formatParisDate(date, 'dd/MM/yyyy');
};

/**
 * Format datetime for French display (DD/MM/YYYY HH:mm)
 */
export const toFrenchDateTime = (date: Date | string): string => {
  return formatParisDate(date, 'dd/MM/yyyy HH:mm');
};
