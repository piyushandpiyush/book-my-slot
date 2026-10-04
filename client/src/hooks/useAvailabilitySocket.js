import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

// Calls `onChange` whenever slot availability for this business changes (any date).
export function useAvailabilitySocket(businessId, onChange) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    if (!businessId) return undefined;
    const socket = io({ withCredentials: true });
    socket.on('connect', () => socket.emit('watch:business', businessId));
    socket.on('availability:changed', (p) => { if (p.businessId === businessId) cb.current(p); });
    return () => socket.close();
  }, [businessId]);
}
