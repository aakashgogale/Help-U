import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUser, FiCheck, FiArrowRight } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { vendorTheme as themeColors } from '../../../../theme';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import { getBookingById, assignWorker as assignWorkerApi } from '../../services/bookingService';
import { getWorkers } from '../../services/workerService';

const AssignWorker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [assignToSelf, setAssignToSelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = themeColors.backgroundGradient;

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load booking details
        const bookingRes = await getBookingById(id);
        if (bookingRes.booking || bookingRes.data) {
          setBooking(bookingRes.booking || bookingRes.data);
        } else {
          throw new Error('Booking not found');
        }

        // Load workers
        const workersRes = await getWorkers();
        const workersList = Array.isArray(workersRes) ? workersRes : (workersRes.workers || workersRes.data || []);

        const available = workersList.filter(w => {
          const status = (w.status || w.availability || '').toUpperCase();
          return (status === 'ONLINE' || status === 'ACTIVE') && !w.currentJob;
        });
        
        setWorkers(workersList);
        
        // If no workers are online, auto-select assign to self
        if (available.length === 0) {
          setAssignToSelf(true);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load booking or workers');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  const handleAssign = async () => {
    if (!assignToSelf && !selectedWorker) {
      toast.error('Please select an online worker or assign to yourself');
      return;
    }

    if (selectedWorker) {
      const status = (selectedWorker.status || selectedWorker.availability || '').toUpperCase();
      if (status !== 'ONLINE' && status !== 'ACTIVE') {
        toast.error('Selected worker is currently offline! Please choose an online worker or assign to yourself.');
        return;
      }
    }

    try {
      setAssigning(true);

      const workerId = assignToSelf ? 'SELF' : selectedWorker.id || selectedWorker._id;

      const response = await assignWorkerApi(id, workerId);

      if (response && response.success) {
        toast.success('Worker assigned successfully');
        // Notify other components
        window.dispatchEvent(new Event('vendorJobsUpdated'));
        navigate(`/vendor/booking/${id}`);
      } else {
        throw new Error(response?.message || 'Failed to assign worker');
      }
    } catch (error) {
      console.error('Error assigning worker:', error);
      toast.error(error.message || 'Failed to assign worker. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  if (loading || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: themeColors.backgroundGradient }}>
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: themeColors.button }}></div>
          <p className="text-gray-600">Loading details...</p>
        </div>
      </div>
    );
  }

  const onlineWorkers = workers.filter(w => {
    const status = (w.status || w.availability || '').toUpperCase();
    return (status === 'ONLINE' || status === 'ACTIVE') && !w.currentJob;
  });

  // Helper for address display
  const getAddressString = (addr) => {
    if (!addr) return 'Address not available';
    if (typeof addr === 'string') return addr;
    return `${addr.addressLine1 || ''}, ${addr.city || ''} ${addr.pincode || ''}`;
  };

  return (
    <div className="min-h-screen pb-20" style={{ background: themeColors.backgroundGradient }}>
      <Header title="Assign Worker" />

      <main className="px-4 py-6">
        {/* Booking Summary */}
        <div
          className="bg-white rounded-xl p-4 mb-6 shadow-md"
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
        >
          <h3 className="font-bold text-gray-800 mb-2">{booking.serviceName || booking.serviceId?.title || 'Service'}</h3>
          <p className="text-sm text-gray-600">{getAddressString(booking.address || booking.location)}</p>
          <p className="text-sm font-semibold mt-2" style={{ color: themeColors.button }}>
            ₹{booking.finalAmount || booking.price || 0}
          </p>
        </div>

        {/* Offline Workers Warning Banner */}
        {onlineWorkers.length === 0 && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-sm">
            <span className="text-xl shrink-0 mt-0.5">⚠️</span>
            <div>
              <h4 className="font-bold text-amber-900 text-sm mb-1">No Workers Currently Online</h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                {workers.length > 0
                  ? 'All your registered workers are currently Offline. You can assign this booking to yourself below, or ask your workers to toggle their status to Online.'
                  : 'You have no registered workers yet. You can do this job yourself or add a worker.'}
              </p>
            </div>
          </div>
        )}

        {/* Self Assignment Option */}
        <div className="mb-6">
          <button
            onClick={() => {
              setAssignToSelf(true);
              setSelectedWorker(null);
            }}
            className={`w-full p-4 rounded-xl text-left transition-all ${assignToSelf
              ? 'border-2'
              : 'bg-white border border-gray-200'
              }`}
            style={
              assignToSelf
                ? {
                  borderColor: themeColors.button,
                  background: `${themeColors.button}10`,
                }
                : {
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }
            }
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${assignToSelf ? 'bg-white' : 'bg-gray-100'
                  }`}
                style={
                  assignToSelf
                    ? {
                      border: `3px solid ${themeColors.button}`,
                    }
                    : {}
                }
              >
                {assignToSelf ? (
                  <FiCheck className="w-6 h-6" style={{ color: themeColors.button }} />
                ) : (
                  <FiUser className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">I'll do this job myself</h3>
                  {onlineWorkers.length === 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">Assign the booking to yourself</p>
              </div>
            </div>
          </button>
        </div>

        {/* Available & Registered Workers */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800">Your Workers</h3>
            <span className="text-xs text-gray-500 font-medium">
              {onlineWorkers.length} of {workers.length} Online
            </span>
          </div>

          {workers.length === 0 ? (
            <div
              className="bg-white rounded-xl p-6 text-center shadow-md"
              style={{
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              }}
            >
              <FiUser className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 mb-2">No workers found</p>
              <p className="text-sm text-gray-500 mb-4">You have not added any workers yet</p>
              <button
                onClick={() => navigate('/vendor/workers/add')}
                className="px-4 py-2 rounded-lg font-semibold text-white text-sm"
                style={{
                  background: themeColors.button,
                  boxShadow: `0 2px 8px ${themeColors.button}40`,
                }}
              >
                Add Worker
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {workers.map((worker) => {
                const workerId = worker._id || worker.id;
                const isSelected = (selectedWorker?._id || selectedWorker?.id) === workerId;
                const status = (worker.status || worker.availability || '').toUpperCase();
                const isOnline = status === 'ONLINE' || status === 'ACTIVE';

                return (
                  <button
                    key={workerId}
                    disabled={!isOnline}
                    onClick={() => {
                      if (!isOnline) {
                        toast.error(`${worker.name} is currently Offline and cannot be assigned.`);
                        return;
                      }
                      setSelectedWorker(worker);
                      setAssignToSelf(false);
                    }}
                    className={`w-full p-4 rounded-xl text-left transition-all ${isSelected
                      ? 'border-2'
                      : !isOnline
                        ? 'bg-gray-50/80 border border-gray-200 opacity-75 cursor-not-allowed'
                        : 'bg-white border border-gray-200 hover:border-gray-300'
                      }`}
                    style={
                      isSelected
                        ? {
                          borderColor: themeColors.button,
                          background: `${themeColors.button}10`,
                        }
                        : {
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                        }
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${isSelected ? 'bg-white' : !isOnline ? 'bg-gray-200' : 'bg-gray-100'
                          }`}
                        style={
                          isSelected
                            ? {
                              border: `3px solid ${themeColors.button}`,
                            }
                            : {}
                        }
                      >
                        {isSelected ? (
                          <FiCheck className="w-6 h-6" style={{ color: themeColors.button }} />
                        ) : (
                          <FiUser className={`w-6 h-6 ${!isOnline ? 'text-gray-400' : 'text-gray-600'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-gray-800 truncate">{worker.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                              isOnline
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {isOnline ? '● Online' : '○ Offline'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{worker.phone || 'No phone'}</p>
                        {!isOnline && (
                          <p className="text-[11px] text-red-500 font-medium mt-1">
                            Worker is offline. Cannot receive booking.
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Assign Button */}
        <div className="mt-8">
          <button
            onClick={handleAssign}
            disabled={(!assignToSelf && !selectedWorker) || assigning}
            className="w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: themeColors.button,
              boxShadow: `0 4px 12px ${themeColors.button}40`,
            }}
          >
            {assigning ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Assigning...</span>
              </>
            ) : (
              <>
                <span>Assign</span>
                <FiArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default AssignWorker;

