import { useState, useEffect } from 'react';

interface LocalDateTimeOptions {
  updateInterval?: number; // in milliseconds, default 60000 (1 minute)
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
}

export const useLocalDateTime = (options: LocalDateTimeOptions = {}) => {
  const {
    updateInterval = 60000, // Update every minute by default
    dateStyle = 'full',
    timeStyle = 'short',
  } = options;

  const [dateTime, setDateTime] = useState(() => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return {
      formatted: new Date().toLocaleString('fr-FR', {
        timeZone: userTimezone,
        dateStyle,
        timeStyle,
      }),
      timezone: userTimezone,
      raw: new Date(),
    };
  });

  useEffect(() => {
    const updateDateTime = () => {
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      setDateTime({
        formatted: now.toLocaleString('fr-FR', {
          timeZone: userTimezone,
          dateStyle,
          timeStyle,
        }),
        timezone: userTimezone,
        raw: now,
      });
    };

    // Update immediately
    updateDateTime();

    // Set up interval for periodic updates
    const interval = setInterval(updateDateTime, updateInterval);

    return () => clearInterval(interval);
  }, [dateStyle, timeStyle, updateInterval]);

  return dateTime;
};

/**
 * Get user's timezone
 */
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Format a date in user's local timezone
 */
export const formatLocalDate = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const userTimezone = getUserTimezone();
  
  return dateObj.toLocaleString('fr-FR', {
    timeZone: userTimezone,
    ...options,
  });
};
