import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiTrendingUp } from 'react-icons/fi';
import { FaLeaf, FaRecycle } from 'react-icons/fa';
import { MdOutlineVerifiedUser, MdCurrencyRupee } from 'react-icons/md';
import scrapBoxImg from '../../../../../assets/images/pages/Home/Scrap/scrap-box.webp';

const HIGHLIGHTS = [
  { id: 'eco', icon: FaRecycle, line1: 'Eco Friendly', line2: 'Process' },
  { id: 'pickup', icon: MdOutlineVerifiedUser, line1: 'Safe & Secure', line2: 'Pickup' },
  { id: 'cash', icon: MdCurrencyRupee, line1: 'Get Instant', line2: 'Cash', ringed: true },
];

// Sizes use container units (cqw) so the card keeps the same proportions at every width
const ScrapPromotionCard = ({ onClick }) => {
  return (
    <div className="px-4 sm:px-5 w-full lg:max-w-3xl lg:mx-auto">
      <motion.div
        whileTap={{ scale: 0.99 }}
        role="button"
        tabIndex={0}
        aria-label="Sell scrap now"
        className="@container relative overflow-hidden rounded-[22px] sm:rounded-[26px] cursor-pointer group"
        style={{ background: 'linear-gradient(100deg, #E3F2EF 0%, #DCEEE9 55%, #D4E8E1 100%)' }}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        <div className="flex items-stretch pl-[3.4cqw] pr-[2.2cqw] py-[2.4cqw]">
          {/* Left: copy + CTA */}
          <div className="relative z-10 w-[45%] shrink-0 flex flex-col justify-center py-[0.6cqw]">
            <span className="self-start inline-flex items-center gap-[1.1cqw] rounded-full bg-[#CDE9E1] px-[1.8cqw] py-[0.9cqw] text-[max(8px,1.95cqw)] font-bold uppercase tracking-[0.02em] text-[#0A6B55]">
              <FaLeaf className="w-[max(9px,2.1cqw)] h-[max(9px,2.1cqw)]" />
              Eco-Friendly Service
            </span>

            <h2 className="mt-[2.4cqw] whitespace-nowrap text-[max(17px,5.1cqw)] font-extrabold leading-[1.16] tracking-[-0.01em] text-[#0D1F35]">
              Turn Your <span className="text-[#0A7760]">Scrap</span>
              <br />
              into <span className="text-[#0A7760]">Instant Cash</span>
            </h2>

            <p className="mt-[2cqw] text-[max(9.5px,2.45cqw)] leading-[1.4] font-medium text-[#5B6B78]">
              Get the best price for your scrap with easy doorstep pickup.
            </p>

            <span className="mt-[3cqw] self-start inline-flex items-center gap-[2.2cqw] rounded-full bg-accent-dark pl-[3.6cqw] pr-[1cqw] py-[1cqw] text-[max(11px,2.6cqw)] font-bold text-white shadow-[0_8px_18px_-8px_rgba(11,90,67,0.6)] transition-colors group-hover:bg-accent">
              Sell Scrap Now
              <span className="flex items-center justify-center rounded-full bg-white w-[max(22px,5cqw)] h-[max(22px,5cqw)]">
                <FiArrowRight className="w-[60%] h-[60%] text-accent-dark transition-transform group-hover:translate-x-0.5" strokeWidth={2.5} />
              </span>
            </span>

            <div className="mt-[2.6cqw] flex items-center gap-[1.6cqw]">
              <span className="flex items-center justify-center rounded-full bg-[#3F8B76] w-[max(18px,4cqw)] h-[max(18px,4cqw)]">
                <FiTrendingUp className="w-[58%] h-[58%] text-white" strokeWidth={2.5} />
              </span>
              <span className="text-[max(9px,2cqw)] font-semibold text-[#0D1F35]">Best Market Rates</span>
            </div>
          </div>

          {/* Middle: illustration */}
          <div className="relative flex-1 min-w-0 flex items-end justify-center">
            <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[112%] aspect-square rounded-full bg-white/35" />
            <img
              src={scrapBoxImg}
              alt="Scrap box ready for pickup"
              className="relative w-full max-w-[32cqw] h-auto object-contain transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            />
          </div>

          {/* Right: highlights */}
          <ul className="relative z-10 w-[24%] sm:w-[21%] shrink-0 flex flex-col justify-center gap-[1.8cqw]">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-[1.2cqw] rounded-[max(10px,2.6cqw)] bg-white/90 px-[1.3cqw] py-[1.8cqw] shadow-[0_6px_16px_-10px_rgba(15,27,45,0.25)]"
                >
                  <span className={`shrink-0 flex items-center justify-center text-[#0A7760] w-[max(14px,4.2cqw)] h-[max(14px,4.2cqw)] ${item.ringed ? 'rounded-full border-[1.5px] border-[#0A7760]' : ''}`}>
                    <Icon className={item.ringed ? 'w-[68%] h-[68%]' : 'w-full h-full'} />
                  </span>
                  <span className="min-w-0 whitespace-nowrap text-[max(8px,1.8cqw)] leading-[1.35] font-medium text-[#0D1F35]">
                    {item.line1}
                    <br />
                    {item.line2}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default ScrapPromotionCard;
