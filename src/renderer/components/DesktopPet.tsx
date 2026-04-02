import React, { useEffect, useMemo, useState } from 'react';
import { usePetStore } from '../store/pet';

type PetSize = 'small' | 'large';

interface DesktopPetProps {
  size?: PetSize;
  showBubble?: boolean;
}

const TICK_MS = 420;
const IDLE_SEQUENCE = [0, 0, 1, 0, 0, 2, 0, 1];

const PET_COPY = {
  idle: '躺平中',
  working: '干活中',
  sleeping: '睡觉中'
} as const;

const SPRITES = {
  idle: [
    [
      '000110000000011000',
      '001111000000111100',
      '011111111111111110',
      '111111111111111111',
      '111211111111112111',
      '111111133311111111',
      '111111111111111111',
      '011111111111111110',
      '001101001001001100',
      '000100001001000100'
    ],
    [
      '000110000000011000',
      '001111000000111100',
      '011111111111111110',
      '111111111111111111',
      '111211111111112111',
      '111111133311111111',
      '111111111111111111',
      '011111111111111110',
      '000110100100100110',
      '000010000100000010'
    ],
    [
      '000110000000011000',
      '001111000000111100',
      '011111111111111110',
      '111111111111111111',
      '111311111111113111',
      '111111133311111111',
      '111111111111111111',
      '011111111111111110',
      '001101001001001100',
      '000100001001000100'
    ]
  ],
  working: [
    [
      '000110000000011000',
      '001111000000111100',
      '011111111111111110',
      '111111111111111111',
      '111211111111112111',
      '111111133311111111',
      '111111111111111111',
      '011111111111111110',
      '000110100100100110',
      '000010000100000010'
    ],
    [
      '000110000000011000',
      '001111000000111100',
      '011111111111111110',
      '111111111111111111',
      '111211111111112111',
      '111111133311111111',
      '111111111111111111',
      '011111111111111110',
      '001101001001001100',
      '000100001001000100'
    ]
  ],
  sleeping: [
    [
      '000110000000011000',
      '001111000000111100',
      '011111111111111110',
      '111111111111111111',
      '111333333333333111',
      '111111133311111111',
      '111111111111111111',
      '011111111111111110',
      '001101001001001100',
      '000100001001000100'
    ]
  ]
} as const;

const PIXEL_COLORS: Record<string, string> = {
  '0': 'transparent',
  '1': 'rgb(251, 104, 54)',
  '2': '#1f2937',
  '3': '#f8efe8'
};

const SIZE_PRESET: Record<
  PetSize,
  {
    dockHeight: number;
    bubbleTop: number;
    bubbleFontSize: number;
    bubblePadding: string;
    bubbleMaxWidth: number;
    scale: number;
    sleepOffsetRight: number;
    sleepOffsetBottom: number;
    sleepFontSize: number;
  }
> = {
  small: {
    dockHeight: 16,
    bubbleTop: 0,
    bubbleFontSize: 10,
    bubblePadding: '4px 8px',
    bubbleMaxWidth: 100,
    scale: 0.42,
    sleepOffsetRight: -2,
    sleepOffsetBottom: 8,
    sleepFontSize: 8
  },
  large: {
    dockHeight: 200,
    bubbleTop: 18,
    bubbleFontSize: 11,
    bubblePadding: '6px 10px',
    bubbleMaxWidth: 148,
    scale: 1.35,
    sleepOffsetRight: 38,
    sleepOffsetBottom: 90,
    sleepFontSize: 16
  }
};

function spriteFor(mode: keyof typeof SPRITES, tick: number): string[] {
  if (mode === 'sleeping') {
    return SPRITES.sleeping[0];
  }

  if (mode === 'working') {
    return SPRITES.working[tick % SPRITES.working.length];
  }

  return SPRITES.idle[IDLE_SEQUENCE[tick % IDLE_SEQUENCE.length] ?? 0];
}

export function DesktopPet({ size = 'large', showBubble = true }: DesktopPetProps) {
  const mode = usePetStore((state) => state.mode);
  const currentCommand = usePetStore((state) => state.currentCommand);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const sprite = useMemo(() => spriteFor(mode, tick), [mode, tick]);
  const cells = useMemo(
    () =>
      sprite.flatMap((row, y) =>
        [...row].map((value, x) => ({
          key: `${x}-${y}`,
          color: PIXEL_COLORS[value] ?? 'transparent'
        }))
      ),
    [sprite]
  );

  const preset = SIZE_PRESET[size];
  const bubbleText =
    mode === 'working' && currentCommand ? `干活中\n${currentCommand}` : PET_COPY[mode];
  const lift = mode === 'working' ? -4 : mode === 'sleeping' ? 8 : 2;

  return (
    <div className={`pet-dock ${size} ${mode}`}>
      {showBubble ? <div className="pet-bubble">{bubbleText}</div> : null}
      {mode === 'sleeping' ? <div className="pet-sleep">z</div> : null}
      <div
        className="pet-grid"
        aria-hidden="true"
        style={{
          transform: `translateY(${lift}px) scale(${preset.scale})`
        }}
      >
        {cells.map((cell) => (
          <span key={cell.key} className="pet-pixel" style={{ background: cell.color }} />
        ))}
      </div>

      <style>{`
        .pet-dock {
          position: relative;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          width: 100%;
          background: transparent;
          pointer-events: none;
        }
        .pet-dock.small {
          height: ${preset.dockHeight}px;
          padding: 0;
        }
        .pet-dock.large {
          height: ${preset.dockHeight}px;
          padding: 0 0 18px;
        }
        .pet-bubble {
          position: absolute;
          top: ${preset.bubbleTop}px;
          left: 50%;
          z-index: 2;
          max-width: ${preset.bubbleMaxWidth}px;
          padding: ${preset.bubblePadding};
          transform: translateX(-50%);
          background: rgba(255, 255, 255, 0.92);
          color: #374151;
          font-size: ${preset.bubbleFontSize}px;
          line-height: 1.35;
          text-align: center;
          white-space: pre-wrap;
          word-break: break-word;
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .pet-bubble::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: -5px;
          width: 10px;
          height: 10px;
          background: rgba(255, 255, 255, 0.92);
          transform: translateX(-50%) rotate(45deg);
        }
        .pet-grid {
          display: grid;
          grid-template-columns: repeat(18, 6px);
          grid-template-rows: repeat(10, 6px);
          gap: 0;
          transform-origin: center bottom;
          filter: drop-shadow(0 8px 12px rgba(15, 23, 42, 0.08));
        }
        .pet-pixel {
          width: 6px;
          height: 6px;
        }
        .pet-sleep {
          position: absolute;
          right: ${preset.sleepOffsetRight}px;
          bottom: ${preset.sleepOffsetBottom}px;
          color: rgb(251, 104, 54);
          font-family: var(--mono);
          font-size: ${preset.sleepFontSize}px;
          letter-spacing: 0.04em;
          text-transform: lowercase;
        }
      `}</style>
    </div>
  );
}
