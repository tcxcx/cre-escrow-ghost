import { resolve } from './core';

// Google Calendar (reuses existing Gmail OAuth app — calendar scopes added)
export const getGoogleCalendarClientId = () => resolve('GOOGLE_CALENDAR_CLIENT_ID');
export const getGoogleCalendarClientSecret = () => resolve('GOOGLE_CALENDAR_CLIENT_SECRET');

// Attio
export const getAttioClientId = () => resolve('ATTIO_CLIENT_ID');
export const getAttioClientSecret = () => resolve('ATTIO_CLIENT_SECRET');

// Fireflies.ai
export const getFirefliesClientId = () => resolve('FIREFLIES_CLIENT_ID');
export const getFirefliesClientSecret = () => resolve('FIREFLIES_CLIENT_SECRET');

// Fathom
export const getFathomClientId = () => resolve('FATHOM_CLIENT_ID');
export const getFathomClientSecret = () => resolve('FATHOM_CLIENT_SECRET');
