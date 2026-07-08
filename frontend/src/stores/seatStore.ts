import { create } from 'zustand';

export interface Seat {
  _id: string;
  label: string;
  section: string;
  row: string;
  column: number;
  tier: string;
  status: 'available' | 'locked' | 'sold';
  price: number;
}

export interface SeatLock {
  seatId: string;
  token: string;
  expiresAt: string;
}

interface SeatState {
  seats: Record<string, Seat>;
  selectedSeatIds: string[];
  seatLocks: SeatLock[];
  setSeats: (seats: Seat[]) => void;
  updateSeat: (seatId: string, update: Partial<Seat>) => void;
  selectSeat: (seatId: string) => void;
  deselectSeat: (seatId: string) => void;
  clearSelection: () => void;
  addLock: (lock: SeatLock) => void;
  removeLock: (seatId: string) => void;
  clearLocks: () => void;
}

export const useSeatStore = create<SeatState>((set) => ({
  seats: {},
  selectedSeatIds: [],
  seatLocks: [],
  setSeats: (seats) =>
    set({ seats: Object.fromEntries(seats.map((s) => [s._id, s])) }),
  updateSeat: (seatId, update) =>
    set((state) => ({
      seats: { ...state.seats, [seatId]: { ...state.seats[seatId], ...update } },
    })),
  selectSeat: (seatId) =>
    set((state) => ({
      selectedSeatIds: state.selectedSeatIds.includes(seatId)
        ? state.selectedSeatIds
        : [...state.selectedSeatIds, seatId],
    })),
  deselectSeat: (seatId) =>
    set((state) => ({
      selectedSeatIds: state.selectedSeatIds.filter((id) => id !== seatId),
    })),
  clearSelection: () => set({ selectedSeatIds: [] }),
  addLock: (lock) =>
    set((state) => ({
      seatLocks: [
        ...state.seatLocks.filter((l) => l.seatId !== lock.seatId),
        lock,
      ],
    })),
  removeLock: (seatId) =>
    set((state) => ({
      seatLocks: state.seatLocks.filter((l) => l.seatId !== seatId),
    })),
  clearLocks: () => set({ seatLocks: [] }),
}));
