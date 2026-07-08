import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSeatStore } from '../stores/seatStore';

const SOCKET_URL = import.meta.env.VITE_API_URL || window.location.origin;

let globalSocket: Socket | null = null;

function getSocket(token?: string): Socket {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
    });
  }
  return globalSocket;
}

export function useEventSocket(eventId: string) {
  const updateSeat = useSeatStore((s) => s.updateSeat);
  const setSeats = useSeatStore((s) => s.setSeats);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const token = localStorage.getItem('accessToken') || undefined;
    const sock = getSocket(token);
    socketRef.current = sock;

    sock.emit('join:event', eventId);

    sock.on(
      'seat:updated',
      (data: { seatId: string; status: string; lockedUntil?: string }) => {
        updateSeat(data.seatId, { status: data.status as 'available' | 'locked' | 'sold' });
      }
    );

    sock.on('seat:map', (seats: Parameters<typeof setSeats>[0]) => {
      setSeats(seats);
    });

    return () => {
      sock.emit('leave:event', eventId);
      sock.off('seat:updated');
      sock.off('seat:map');
    };
  }, [eventId, updateSeat, setSeats]);

  return socketRef;
}

export function useAdminSocket(
  onStats?: (data: unknown) => void,
  onQueueUpdate?: (data: unknown) => void
) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const adminSocket = io(`${SOCKET_URL}/admin`, {
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    socketRef.current = adminSocket;

    if (onStats) adminSocket.on('stats:update', onStats);
    if (onQueueUpdate) adminSocket.on('queue:update', onQueueUpdate);

    return () => {
      adminSocket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return socketRef;
}
