import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiRefreshCw, FiCheck, FiCheckCircle, FiTrash2, FiFilter, FiUser, FiDollarSign, FiUserCheck, FiSend, FiPlus, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import api from '../../../../services/api';
import AdminZoneSelect from '../../components/AdminZoneSelect';
import ModalLock from '../../../../components/common/ModalLock';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [refreshing, setRefreshing] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    audience: 'all', // all, users, workers
    zoneId: '',
    skipPush: false
  });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications', {
        params: { limit: 50 }
      });
      if (res.data.success) {
        setNotifications(res.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
    toast.success('Notifications refreshed');
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      toast.error('Please fill in title and message');
      return;
    }
    try {
      setSendingBroadcast(true);
      const res = await api.post('/notifications/broadcast', {
        title: broadcastForm.title.trim(),
        message: broadcastForm.message.trim(),
        audience: broadcastForm.audience,
        zoneId: broadcastForm.zoneId || null,
        skipPush: broadcastForm.skipPush
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Notification broadcast successfully!');
        setIsBroadcastOpen(false);
        setBroadcastForm({ title: '', message: '', audience: 'all', zoneId: '', skipPush: false });
        fetchNotifications();
      }
    } catch (err) {
      console.error('Broadcast error:', err);
      toast.error(err.response?.data?.message || 'Failed to send broadcast notification');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'vendor_withdrawal_request':
        return <FiDollarSign className="text-green-500" />;
      case 'vendor_approval_request':
        return <FiUserCheck className="text-blue-500" />;
      case 'vendor_cash_limit_exceeded':
        return <FiDollarSign className="text-red-500" />;
      default:
        return <FiBell className="text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FiBell className="text-blue-600 text-lg" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Notifications</h1>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBroadcastOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <FiSend className="text-xs" />
              Send Notification
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={refreshing}
            >
              <FiRefreshCw className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <FiCheckCircle className="text-sm" />
                Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete all notifications?')) {
                    try {
                      await api.delete('/notifications/delete-all');
                      setNotifications([]);
                      toast.success('All notifications cleared');
                    } catch (error) {
                      console.error('Error clearing notifications:', error);
                      toast.error('Failed to clear notifications');
                    }
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <FiTrash2 className="text-sm" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          {['all', 'unread', 'read'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${filter === f
                ? 'bg-blue-600 text-white'
                : 'text-gray-500 hover:bg-gray-100'
                }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-xs text-gray-500 mt-2">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center">
            <FiBell className="text-4xl text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notifications found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence>
              {filteredNotifications.map(notification => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 ${!notification.isRead ? 'bg-blue-50/30' : ''
                    }`}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-2">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <FiCheck className="text-xs" />
                          Mark as read
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="text-[10px] font-semibold text-red-500 hover:underline flex items-center gap-1"
                      >
                        <FiTrash2 className="text-xs" />
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2"></div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Broadcast Notification Modal */}
      <AnimatePresence>
        {isBroadcastOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <ModalLock />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FiSend className="text-base" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Send Notification Broadcast</h2>
                    <p className="text-xs text-gray-500">Deliver announcements & push alerts with zone targeting</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBroadcastOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="text-lg" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSendBroadcast} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Audience</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'all', label: 'All Users & Workers' },
                      { key: 'users', label: 'Users Only' },
                      { key: 'workers', label: 'Workers Only' },
                    ].map(aud => (
                      <button
                        type="button"
                        key={aud.key}
                        onClick={() => setBroadcastForm(f => ({ ...f, audience: aud.key }))}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-all ${
                          broadcastForm.audience === aud.key
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {aud.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Operating Zone <span className="font-normal text-gray-400">(optional - empty = entire city / all zones)</span>
                  </label>
                  <AdminZoneSelect
                    value={broadcastForm.zoneId}
                    onChange={(val) => setBroadcastForm(f => ({ ...f, zoneId: val }))}
                    isMulti={false}
                    placeholder="All Zones (Global broadcast)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={broadcastForm.title}
                    onChange={(e) => setBroadcastForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Special Weekend Offer in Your Zone!"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Message *</label>
                  <textarea
                    rows={3}
                    required
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Enter notification details..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-bold text-gray-800">Send Push Notification</p>
                    <p className="text-[11px] text-gray-500">Deliver instant device push notification via Firebase</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!broadcastForm.skipPush}
                    onChange={(e) => setBroadcastForm(f => ({ ...f, skipPush: !e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsBroadcastOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingBroadcast}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    <FiSend className={`text-xs ${sendingBroadcast ? 'animate-pulse' : ''}`} />
                    {sendingBroadcast ? 'Broadcasting...' : 'Send Broadcast'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Notifications;
