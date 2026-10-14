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
    <div className="flex items-center gap-3 w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Search for services"
        className="flex-1 relative cursor-pointer group"
        onClick={onInputClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onInputClick?.();
          }
        }}
      >
        {/* Search icon */}
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
          <FiSearch
            className="w-[22px] h-[22px] text-gray-500 group-hover:text-accent transition-colors duration-300"
          />
        </div>

        {/* Simulated Input */}
        <div
          className="w-full pl-14 pr-5 rounded-full bg-white border border-gray-100 flex items-center h-14 shadow-[0_8px_28px_-12px_rgba(15,27,45,0.14)] transition-shadow duration-300 group-hover:shadow-[0_10px_30px_-10px_rgba(15,27,45,0.2)]"
        >
          {/* Placeholder text with typing animation */}
          <span className="block min-w-0 text-[15px] text-gray-400 truncate">
            Search for Services, e.g. <span className="text-gray-500">
              {displayedText}
              <span className="animate-pulse ml-0.5 text-accent">|</span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
