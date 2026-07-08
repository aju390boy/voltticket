import { useMemo, useState } from 'react';
import { type Seat, useSeatStore } from '../stores/seatStore';

const SECTION_LABEL_COLORS: Record<string, string> = {
  GA:        '#059669',
  LOWER:     '#B8860B',
  UPPER:     '#C9A84C',
  VIP:       '#E8B923',
  BACKSTAGE: '#8B6508',
};

interface SeatMapProps {
  eventId: string;
  onSeatSelect: (seatId: string, action: 'select' | 'deselect') => void;
  maxSelectCount?: number;
}

interface TooltipState {
  seat: Seat;
  x: number;
  y: number;
}

export function SeatMap({ onSeatSelect, maxSelectCount = 4 }: SeatMapProps) {
  const seats = useSeatStore((s) => s.seats);
  const selectedSeatIds = useSeatStore((s) => s.selectedSeatIds);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const seatsBySection = useMemo(() => {
    const grouped: Record<string, Seat[]> = {};
    Object.values(seats).forEach((seat) => {
      if (!grouped[seat.section]) grouped[seat.section] = [];
      grouped[seat.section].push(seat);
    });
    return grouped;
  }, [seats]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'sold' || seat.status === 'locked') return;
    const isSelected = selectedSeatIds.includes(seat._id);
    if (!isSelected && selectedSeatIds.length >= maxSelectCount) return;
    onSeatSelect(seat._id, isSelected ? 'deselect' : 'select');
  };

  const getSeatColor = (seat: Seat): string => {
    if (selectedSeatIds.includes(seat._id)) return '#C9A84C';
    if (seat.status === 'sold')   return '#DC2626';
    if (seat.status === 'locked') return '#E8B923';
    return '#059669';
  };

  const WIDTH = 900;
  const SEAT_SIZE = 9;
  const SEAT_GAP = 3;

  const seatElements: React.ReactElement[] = [];
  let yOffset = 60;

  const sectionOrder = [
    'BACKSTAGE', 'VIP', 'VIP-L', 'VIP-R',
    'LOWER', 'LOWER-C', 'LOWER-L', 'LOWER-R',
    'UPPER', 'UPPER-L', 'UPPER-R',
    'GA',
  ].filter((s) => seatsBySection[s]);

  sectionOrder.forEach((sectionName) => {
    const sectionSeats = seatsBySection[sectionName] || [];
    const maxCol = Math.max(...sectionSeats.map((s) => s.column));
    const rows = [...new Set(sectionSeats.map((s) => s.row))].sort();
    const sectionWidth = maxCol * (SEAT_SIZE + SEAT_GAP);
    const xStart = (WIDTH - sectionWidth) / 2;

    const labelColor =
      SECTION_LABEL_COLORS[sectionName.split('-')[0]] || '#6b7280';

    seatElements.push(
      <text
        key={`label-${sectionName}`}
        x={WIDTH / 2}
        y={yOffset - 10}
        textAnchor="middle"
        fill={labelColor}
        fontSize={10}
        fontFamily="Inter"
        fontWeight="600"
        letterSpacing="1"
        opacity={0.8}
      >
        {sectionName}
      </text>
    );

    rows.forEach((row, rowIdx) => {
      const rowSeats = sectionSeats
        .filter((s) => s.row === row)
        .sort((a, b) => a.column - b.column);
      const y = yOffset + rowIdx * (SEAT_SIZE + SEAT_GAP);

      rowSeats.forEach((seat) => {
        const x = xStart + (seat.column - 1) * (SEAT_SIZE + SEAT_GAP);
        const isSelected = selectedSeatIds.includes(seat._id);

        seatElements.push(
          <rect
            key={seat._id}
            x={x}
            y={y}
            width={SEAT_SIZE}
            height={SEAT_SIZE}
            rx={2}
            ry={2}
            fill={getSeatColor(seat)}
            opacity={seat.status === 'sold' ? 0.45 : 1}
            style={{
              cursor:
                seat.status === 'available' ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
            onClick={() => handleSeatClick(seat)}
            onMouseEnter={(e) => {
              const rect = (e.target as SVGElement).getBoundingClientRect();
              setTooltip({
                seat,
                x: rect.left + rect.width / 2,
                y: rect.top - 8,
              });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        );

        if (isSelected) {
          seatElements.push(
            <rect
              key={`sel-${seat._id}`}
              x={x - 1.5}
              y={y - 1.5}
              width={SEAT_SIZE + 3}
              height={SEAT_SIZE + 3}
              rx={3}
              ry={3}
              fill="none"
              stroke="#E8B923"
              strokeWidth={1.5}
              style={{ pointerEvents: 'none' }}
            />
          );
        }
      });
    });

    yOffset += rows.length * (SEAT_SIZE + SEAT_GAP) + 28;
  });

  const totalHeight = yOffset + 40;

  return (
    <div style={{ position: 'relative' }}>
      {/* Stage */}
      <div
        style={{
          background: 'linear-gradient(135deg, #C9A84C 0%, #E8B923 50%, #B8860B 100%)',
          height: 36,
          borderRadius: '4px 4px 24px 24px',
          margin: '0 auto 12px',
          maxWidth: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: '#FFF8E8',
          letterSpacing: '0.18em',
          boxShadow: '0 4px 28px rgba(201, 168, 76, 0.55)',
        }}
      >
        🎤 STAGE
      </div>

      <div className="seat-map-container" style={{ overflowX: 'auto' }}>
        <svg
          width={WIDTH}
          height={totalHeight}
          viewBox={`0 0 ${WIDTH} ${totalHeight}`}
          style={{ maxWidth: '100%' }}
        >
          {seatElements}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%) translateY(-100%)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 12,
            pointerEvents: 'none',
            zIndex: 9999,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div
            style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}
          >
            {tooltip.seat.label}
          </div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>
            {tooltip.seat.tier} · ${tooltip.seat.price}
          </div>
          <div
            style={{
              color:
                tooltip.seat.status === 'available'
                  ? '#059669'
                  : tooltip.seat.status === 'locked'
                  ? '#B8860B'
                  : '#DC2626',
              textTransform: 'capitalize',
              fontWeight: 600,
            }}
          >
            ●{' '}
            {tooltip.seat.status === 'locked'
              ? 'Held'
              : tooltip.seat.status}
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 20,
          justifyContent: 'center',
          marginTop: 16,
          flexWrap: 'wrap',
        }}
      >
        {[
          ['#059669', 'Available'],
          ['#C9A84C', 'Selected'],
          ['#E8B923', 'Held'],
          ['#DC2626', 'Sold'],
        ].map(([color, label]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: color,
              }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
