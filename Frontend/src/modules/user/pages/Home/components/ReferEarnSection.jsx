import React from 'react';
import { FiArrowRight, FiGift } from 'react-icons/fi';

// One gift box, drawn around (cx, cy) at size s
const Gift = ({ id, cx, cy, s, box, boxDark, lid, ribbon, ribbonDark, bow = ribbon, bowDark = ribbonDark }) => (
  <g>
    <defs>
      <linearGradient id={`${id}-box`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={box} />
        <stop offset="1" stopColor={boxDark} />
      </linearGradient>
    </defs>
    {/* bow */}
    <ellipse cx={cx - s * 0.12} cy={cy - s * 0.22} rx={s * 0.17} ry={s * 0.1} fill={bow} transform={`rotate(-28 ${cx - s * 0.12} ${cy - s * 0.2})`} />
    <ellipse cx={cx + s * 0.12} cy={cy - s * 0.22} rx={s * 0.17} ry={s * 0.1} fill={bow} transform={`rotate(28 ${cx + s * 0.12} ${cy - s * 0.2})`} />
    <ellipse cx={cx - s * 0.11} cy={cy - s * 0.2} rx={s * 0.08} ry={s * 0.04} fill={bowDark} opacity="0.55" transform={`rotate(-28 ${cx - s * 0.11} ${cy - s * 0.2})`} />
    <ellipse cx={cx + s * 0.11} cy={cy - s * 0.2} rx={s * 0.08} ry={s * 0.04} fill={bowDark} opacity="0.55" transform={`rotate(28 ${cx + s * 0.11} ${cy - s * 0.2})`} />
    {/* body */}
    <rect x={cx - s * 0.29} y={cy + s * 0.03} width={s * 0.58} height={s * 0.38} rx={s * 0.04} fill={`url(#${id}-box)`} />
    {/* lid */}
    <rect x={cx - s * 0.34} y={cy - s * 0.14} width={s * 0.68} height={s * 0.18} rx={s * 0.04} fill={lid} />
    <rect x={cx - s * 0.34} y={cy + s * 0.02} width={s * 0.68} height={s * 0.025} fill={boxDark} opacity="0.35" />
    {/* ribbon */}
    <rect x={cx - s * 0.065} y={cy - s * 0.14} width={s * 0.13} height={s * 0.55} fill={ribbon} />
    <rect x={cx + s * 0.02} y={cy - s * 0.14} width={s * 0.045} height={s * 0.55} fill={ribbonDark} opacity="0.35" />
    <circle cx={cx} cy={cy - s * 0.16} r={s * 0.065} fill={bowDark} />
  </g>
);

// Rounded tile holding a gift, rotated around its centre
const GiftTile = ({ id, cx, cy, size, angle, tile, tileDark, gift }) => (
  <g transform={`rotate(${angle} ${cx} ${cy})`} filter="url(#refer-tile-shadow)">
    <defs>
      <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={tile} />
        <stop offset="1" stopColor={tileDark} />
      </linearGradient>
    </defs>
    <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} rx={size * 0.2} fill={`url(#${id}-tile)`} />
    <rect x={cx - size / 2 + 2} y={cy - size / 2 + 2} width={size - 4} height={size - 4} rx={size * 0.19} fill="none" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="2" />
    <Gift id={id} cx={cx} cy={cy - size * 0.04} s={size * 0.9} {...gift} />
  </g>
);

const ReferGiftsIllustration = () => (
  <svg viewBox="0 0 360 260" className="w-full h-auto" aria-hidden="true">
    <defs>
      <filter id="refer-tile-shadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#0F4D3A" floodOpacity="0.18" />
      </filter>
      <radialGradient id="refer-ground" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#0F4D3A" stopOpacity="0.16" />
        <stop offset="1" stopColor="#0F4D3A" stopOpacity="0" />
      </radialGradient>
    </defs>

    {/* ground shadow */}
    <ellipse cx="200" cy="246" rx="150" ry="11" fill="url(#refer-ground)" />

    {/* sparkles */}
    <g stroke="#1E8A6B" strokeWidth="4" strokeLinecap="round">
      <line x1="10" y1="168" x2="34" y2="164" />
      <line x1="16" y1="140" x2="34" y2="152" />
      <line x1="16" y1="196" x2="34" y2="184" />
      <line x1="302" y1="38" x2="316" y2="8" />
      <line x1="314" y1="54" x2="340" y2="40" />
      <line x1="290" y1="28" x2="288" y2="14" />
      <line x1="112" y1="40" x2="122" y2="52" />
    </g>

    <GiftTile
      id="refer-cream" cx={200} cy={66} size={118} angle={-6}
      tile="#FFF7E6" tileDark="#F5E5C2"
      gift={{ box: '#F8CB4C', boxDark: '#EBAE2C', lid: '#FBD764', ribbon: '#E85D4A', ribbonDark: '#C8432F' }}
    />
    <GiftTile
      id="refer-blue" cx={292} cy={130} size={118} angle={8}
      tile="#E1EDFD" tileDark="#BDD5F7"
      gift={{ box: '#5089EA', boxDark: '#3467CC', lid: '#6C9EF2', ribbon: '#F6C544', ribbonDark: '#D9A52A' }}
    />
    <GiftTile
      id="refer-green" cx={124} cy={158} size={164} angle={-8}
      tile="#35B28E" tileDark="#1C8466"
      gift={{ box: '#F8CB4C', boxDark: '#EBAE2C', lid: '#FBD764', ribbon: '#2A9C79', ribbonDark: '#1D7C5F', bow: '#F8CB4C', bowDark: '#D99E22' }}
    />
  </svg>
);

// Sizes use container units (cqw) so the card keeps the same proportions at every width
const ReferEarnSection = ({ onReferClick }) => {
  return (
    <div className="px-4 sm:px-5 w-full lg:max-w-3xl lg:mx-auto">
      <div
        role="button"
        tabIndex={0}
        aria-label="Refer and get free services"
        onClick={onReferClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onReferClick?.();
          }
        }}
        className="@container relative overflow-hidden rounded-[22px] sm:rounded-[28px] cursor-pointer group active:scale-[0.99] transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        style={{ background: 'linear-gradient(100deg, #E9F6F1 0%, #E1F2EB 55%, #D6EDE4 100%)' }}
      >
        {/* soft light band on the right */}
        <div className="pointer-events-none absolute -right-[22%] -top-[40%] w-[72%] aspect-square rounded-full bg-white/30" />

        <div className="relative flex items-center pl-[5.1cqw] pr-[2.4cqw] py-[4.6cqw]">
          {/* Copy + CTA */}
          <div className="relative z-10 w-[54%] shrink-0">
            <span className="inline-flex items-center gap-[1.3cqw] rounded-full border border-[#BFE3D3] bg-[#E3F4ED] px-[2.2cqw] py-[1.1cqw] text-[max(10px,2.6cqw)] font-semibold text-accent">
              <FiGift className="w-[max(12px,3.2cqw)] h-[max(12px,3.2cqw)]" strokeWidth={2.4} />
              Special Offer
            </span>

            <h2 className="mt-[3.6cqw] text-[max(19px,5.6cqw)] font-bold leading-[1.22] tracking-[-0.01em] text-ink">
              Refer and get free services
            </h2>

            <p className="mt-[1.8cqw] text-[max(13px,3.6cqw)] font-semibold text-[#5B6B78]">
              Invite and get ₹100*
            </p>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReferClick?.();
              }}
              className="mt-[5.2cqw] inline-flex items-center gap-[2.6cqw] rounded-full bg-accent pl-[6cqw] pr-[5cqw] py-[2.4cqw] text-[max(13px,3.4cqw)] font-bold text-white shadow-[0_10px_22px_-10px_rgba(15,116,87,0.7)] hover:bg-accent-dark active:scale-95 transition-all"
            >
              Refer Now
              <FiArrowRight className="w-[max(15px,3.4cqw)] h-[max(15px,3.4cqw)] transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} />
            </button>
          </div>

          {/* Illustration */}
          <div className="relative flex-1 min-w-0 -ml-[4cqw] translate-y-[2cqw] transition-transform duration-500 group-hover:translate-y-0">
            <ReferGiftsIllustration />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferEarnSection;
