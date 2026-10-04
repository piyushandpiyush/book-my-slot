import { fmtTime } from '../utils/format.js';

const LABEL = { BOOKED: 'Booked', BREAK: 'Break', PAST: 'Passed' };

// Time-slot grid. Available = selectable; booked / break / passed are disabled and labelled.
// `flash` is a set of start times that just became booked (live update) and get a brief highlight.
export default function SlotPicker({ slots, value, onChange, hideUnavailable = false, flash }) {
  if (!slots) return null;
  const visible = hideUnavailable ? slots.filter((s) => s.available) : slots;
  if (visible.length === 0) return null;
  return (
    <div className="slots">
      {visible.map((s) => (
        <button
          key={s.startTime} type="button" disabled={!s.available}
          className={`slot ${value === s.startTime ? 'selected' : ''} ${s.available ? '' : 'taken'} ${flash?.has(s.startTime) ? 'flash' : ''}`}
          aria-pressed={value === s.startTime}
          title={s.available ? `${fmtTime(s.startTime)} – ${fmtTime(s.endTime)}` : LABEL[s.reason] || 'Unavailable'}
          onClick={() => onChange(s.startTime)}
        >
          {fmtTime(s.startTime)}
          <small>{s.available ? 'Available' : LABEL[s.reason] || 'Booked'}</small>
        </button>
      ))}
    </div>
  );
}

export const SlotLegend = () => (
  <div className="legend">
    <span><i style={{ background: 'var(--ok)' }} />Available</span>
    <span><i style={{ background: 'var(--gold)' }} />Selected</span>
    <span><i style={{ background: 'var(--s4)' }} />Booked / unavailable</span>
  </div>
);
