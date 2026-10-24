import React, { useState, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';

const SearchBar = ({ onInputClick }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);

  const serviceNames = [
    'AC service and repair',
    'Washing machine services',
    'Cooler repair at Home',
    'R.O. repair installation',
    'Microwave repair',
    'Geyser repair',
    'Bathroom appliance installation',
    'Fridge at Home'
  ];

  useEffect(() => {
    let timer;
    const currentFullText = serviceNames[currentServiceIndex];

    if (isTyping) {
      if (displayedText.length < currentFullText.length) {
        timer = setTimeout(() => {
          setDisplayedText(currentFullText.slice(0, displayedText.length + 1));
        }, 150);
      } else {
        timer = setTimeout(() => setIsTyping(false), 2000);
      }
    } else {
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText(currentFullText.slice(0, displayedText.length - 1));
        }, 100);
      } else {
        setCurrentServiceIndex((prev) => (prev + 1) % serviceNames.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isTyping, currentServiceIndex]);

  return (
    <div className="w-full max-w-full min-w-0">
      <div
        role="button"
        tabIndex={0}
        aria-label="Search for services"
        className="w-full max-w-full min-w-0 relative cursor-pointer group"
        onClick={onInputClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onInputClick?.();
          }
        }}
      >
        {/* Search icon */}
        <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none z-10">
          <FiSearch
            className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-gray-400 group-hover:text-accent transition-colors duration-300 shrink-0"
          />
        </div>

        {/* Simulated Input Pill */}
        <div
          className="w-full max-w-full min-w-0 pl-11 sm:pl-13 pr-4 sm:pr-5 rounded-full bg-white border border-gray-200/90 flex items-center h-11 sm:h-13 shadow-[0_2px_12px_rgba(15,27,45,0.06)] transition-all duration-300 group-hover:shadow-[0_6px_20px_rgba(15,27,45,0.1)] group-hover:border-gray-300/90 overflow-hidden"
        >
          {/* Placeholder text with typing animation */}
          <span className="block w-full min-w-0 text-[13.5px] sm:text-[14.5px] text-gray-400 truncate select-none leading-none">
            <span className="hidden sm:inline">Search for services, e.g. </span>
            <span className="sm:hidden">Search for </span>
            <span className="text-gray-700 font-medium">
              &lsquo;{displayedText}&rsquo;
              <span className="animate-pulse ml-0.5 text-accent font-normal">|</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
