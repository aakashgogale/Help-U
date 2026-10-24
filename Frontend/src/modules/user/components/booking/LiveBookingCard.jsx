import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiMapPin, FiTool, FiCheckCircle, FiChevronRight, FiNavigation, FiX } from 'react-icons/fi';
import userBookingService from '../../../../services/bookingService';
import { userTheme } from '../../../../theme';
import RatingModal from './RatingModal';
import { toast } from 'react-hot-toast';
import { useSocket } from '../../../../context/SocketContext';
import ChatButton from '../../../../components/booking/ChatButton';

const LiveBookingCard = ({ hasBottomNav }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const socket = useSocket();
  const [activeBooking, setActiveBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state when location changes (page changes)
  useEffect(() => {
    setIsDismissed(false);
  }, [location.pathname]);

  // Status mapping for UI
  const getStatusInfo = (status) => {
    switch (status?.toUpperCase()) {
      case 'ASSIGNED':
        return { label: 'Provider Assigned', icon: FiCheckCircle, color: 'bg-blue-500', sub: 'Provider will start journey soon' };
      case 'STARTED':
      case 'JOURNEY_STARTED':
        return { label: 'Provider on the Way', icon: FiNavigation, color: 'bg-orange-500', sub: 'Track location live', pulse: true };
      case 'VISITED':
        return { label: 'Reached & Started Work', icon: FiMapPin, color: 'bg-green-500', sub: 'At your location • Work Started' };
      case 'IN_PROGRESS':
        return { label: 'Reached & Working', icon: FiTool, color: 'bg-purple-500', sub: 'Work successfully started' };
      case 'WORK_DONE':
        return { label: 'Work Completed', icon: FiCheckCircle, color: 'bg-green-600', sub: 'Review payment details' };
      // New Finding Status
      case 'REQUESTED':
      case 'SEARCHING':
        return { label: 'Finding Nearby Workers', icon: FiClock, color: 'bg-teal-500', sub: 'Scanning within 10km...', pulse: true };
      default:
        return null;
    }
  };

  useEffect(() => {
    fetchActiveBooking();

    if (socket) {
      socket.on('booking_updated', fetchActiveBooking);
      socket.on('notification', fetchActiveBooking);
    }

    // Poll every 30 seconds for updates
    const interval = setInterval(fetchActiveBooking, 30000);
    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off('booking_updated', fetchActiveBooking);
        socket.off('notification', fetchActiveBooking);
      }
    };
  }, [socket]);

  const fetchActiveBooking = async () => {
    try {
      // Fetch bookings with active statuses
      // We manually fetch latest and check status on client or assume API supports status filter array
      // For now, getting all 'active' look-alikes by assuming 'current' sort order or specific API behaviour
      // Re-using getUserBookings with a broad status or custom logic if needed. 
      // Actually, relying on getUserBookings default which excludes 'SEARCHING'. 
      // We'll filter client side for the *most relevant* active one.

      const res = await userBookingService.getUserBookings({ limit: 5 });
      if (res.success && res.data.length > 0) {
        // Find the first booking that is in an active state (checking both cases to be safe)
        const ongoing = res.data.find(b => {
          const s = b.status?.toUpperCase();
          // Hide LiveBookingCard if status is WORK_DONE and review is already done
          if (s === 'WORK_DONE' && b.rating) return false;

          return ['ASSIGNED', 'STARTED', 'JOURNEY_STARTED', 'VISITED', 'IN_PROGRESS', 'WORK_DONE', 'SEARCHING', 'REQUESTED'].includes(s);
        });
        setActiveBooking(ongoing || null);
      }
    } catch (error) {
      // Failed to fetch active booking
    } finally {
      setLoading(false);
    }
  };

  // Auto-show rating modal when work is marked done
  useEffect(() => {
    if (activeBooking && activeBooking.status?.toUpperCase() === 'WORK_DONE' && !activeBooking.rating && !showRatingModal) {
      const dismissed = localStorage.getItem(`rating_dismissed_live_${activeBooking._id}`);
      if (!dismissed) {
        setShowRatingModal(true);
      }
    }
  }, [activeBooking]);

  const handleRateSubmit = async (ratingData) => {
    try {
      const response = await userBookingService.addReview(activeBooking._id || activeBooking.id, ratingData);
      if (response.success) {
        toast.success('Thank you for your rating!', {
          icon: '🌟',
          style: { borderRadius: '15px', background: '#333', color: '#fff' }
        });
        setShowRatingModal(false);
        fetchActiveBooking(); // Refresh to hide card or update state
      } else {
        toast.error(response.message || 'Failed to submit review');
      }
    } catch (error) {
      toast.error('Failed to submit review');
    }
  };

  if (!activeBooking || isDismissed) return null;

  const statusInfo = getStatusInfo(activeBooking.status);
  if (!statusInfo) return null;

  const Icon = statusInfo.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="live-booking-card"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        onClick={() => {
          const status = activeBooking.status?.toUpperCase();
          // If provider is on the way, go to tracking map
          if (status === 'STARTED' || status === 'JOURNEY_STARTED') {
            navigate(`/user/booking/${activeBooking._id || activeBooking.id}/track`);
          } else if (status === 'SEARCHING' || status === 'REQUESTED') {
            navigate(`/user/booking-confirmation/${activeBooking._id || activeBooking.id}`);
          } else {
            navigate(`/user/booking/${activeBooking._id || activeBooking.id}`);
          }
        }}
        className={`fixed ${hasBottomNav ? 'bottom-[calc(var(--bottom-nav-height,80px)-0.25rem)]' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))]'} left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50`}
      >
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_35px_-5px_rgba(15,27,45,0.18)] border border-gray-100 py-2.5 px-3.5 flex items-center gap-3 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform group">

          {/* Progress Bar Background */}
          <div className="absolute bottom-0 left-0 h-[2.5px] bg-gray-100 w-full overflow-hidden">
            <motion.div
              className={`h-full ${statusInfo.color}`}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Icon Box */}
          <div className={`w-9 h-9 rounded-xl ${statusInfo.color} flex items-center justify-center shrink-0 relative shadow-xs`}>
            {statusInfo.pulse && (
              <div className={`absolute inset-0 rounded-xl ${statusInfo.color} animate-ping opacity-40`} />
            )}
            <Icon className="text-white w-4.5 h-4.5 relative z-10" />
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0 pr-1">
            <h4 className="font-bold text-gray-900 text-[13px] leading-tight truncate">
              {statusInfo.label}
            </h4>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">
              {statusInfo.sub}{activeBooking.serviceName ? ` • ${activeBooking.serviceName}` : ''}
            </p>
          </div>

          {/* Action Chat & Arrow or Pay Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {Boolean(activeBooking.vendorId || activeBooking.assignedTo) && (
              <ChatButton
                role="user"
                booking={activeBooking}
                compact={true}
                className="w-8 h-8"
              />
            )}

            {activeBooking.status?.toUpperCase() === 'WORK_DONE' && !activeBooking.cashCollected ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/user/booking/${activeBooking._id || activeBooking.id}`);
                }}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-lg shadow-sm active:scale-95 transition-all"
              >
                PAY NOW
              </button>
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                <FiChevronRight className="text-gray-600 w-4 h-4" />
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
              aria-label="Dismiss"
              className="w-5 h-5 -mr-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors pointer-events-auto"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </motion.div>

      {/* Global Rating Modal */}
      <RatingModal
        key="rating-modal"
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          if (activeBooking) {
            localStorage.setItem(`rating_dismissed_live_${activeBooking._id}`, 'true');
          }
        }}
        onSubmit={handleRateSubmit}
        bookingName={activeBooking.serviceName || 'Service'}
        providerName={activeBooking.vendorId?.name || 'Service Provider'}
      />
    </AnimatePresence>
  );
};

export default LiveBookingCard;
