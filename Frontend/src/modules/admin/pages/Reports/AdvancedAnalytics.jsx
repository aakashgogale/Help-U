import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiTrendingUp,
  FiDollarSign,
  FiShoppingBag,
  FiUsers,
  FiRepeat,
  FiCheckCircle,
  FiXCircle,
  FiMapPin,
  FiGrid,
  FiAward,
  FiRefreshCw
} from 'react-icons/fi';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { toast } from 'react-hot-toast';
import dashboardService from '../../services/dashboardService';
import CardShell from '../UserCategories/components/CardShell';

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#64748B'];

const AdvancedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');
  const [data, setData] = useState({
    kpis: {},
    cityRevenue: [],
    categoryRevenue: [],
    vendorRevenue: [],
    gmvTrends: []
  });

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getAdvancedAnalytics({ days });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (error) {
      console.error('Fetch advanced analytics error:', error);
      toast.error('Failed to load marketplace analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const { kpis, cityRevenue, categoryRevenue, vendorRevenue, gmvTrends } = data;

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold text-amber-700 bg-amber-100 rounded-full">
              Executive View
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Marketplace Analytics</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Real-time GMV, AOV, Customer Retention cohorts, and City-Category revenue distribution
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1">
            {[
              { label: '7D', value: '7' },
              { label: '30D', value: '30' },
              { label: '90D', value: '90' },
              { label: 'All Time', value: 'all' }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setDays(tab.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  days === tab.value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh Data"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* GMV */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <CardShell className="p-5 border-l-4 border-l-amber-500 bg-gradient-to-br from-white to-amber-50/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Gross Merchandise Value (GMV)</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  ₹{(kpis?.gmv || 0).toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl shadow-inner">
                <FiDollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{kpis?.totalCompleted || 0}</span> orders completed
            </div>
          </CardShell>
        </motion.div>

        {/* AOV */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.05 }}>
          <CardShell className="p-5 border-l-4 border-l-blue-500 bg-gradient-to-br from-white to-blue-50/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Average Order Value (AOV)</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  ₹{(kpis?.aov || 0).toLocaleString('en-IN')}
                </h3>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl shadow-inner">
                <FiShoppingBag className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              Per fulfilled booking average
            </div>
          </CardShell>
        </motion.div>

        {/* Retention & Repeat Rate */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
          <CardShell className="p-5 border-l-4 border-l-emerald-500 bg-gradient-to-br from-white to-emerald-50/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Repeat Bookings & Retention</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  {kpis?.repeatBookingRate || 0}%
                </h3>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl shadow-inner">
                <FiRepeat className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span className="font-semibold text-gray-700">{kpis?.repeatCustomers || 0}</span> of {kpis?.totalCustomers || 0} repeat buyers
            </div>
          </CardShell>
        </motion.div>

        {/* Fulfillment vs Cancellation */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.15 }}>
          <CardShell className="p-5 border-l-4 border-l-purple-500 bg-gradient-to-br from-white to-purple-50/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Completion vs Cancellation</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  {kpis?.completionRate || 100}%
                </h3>
              </div>
              <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl shadow-inner">
                <FiCheckCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs">
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <FiCheckCircle /> {kpis?.totalCompleted || 0} Done
              </span>
              <span className="text-rose-500 font-semibold flex items-center gap-1">
                <FiXCircle /> {kpis?.cancellationRate || 0}% Cancelled
              </span>
            </div>
          </CardShell>
        </motion.div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GMV Timeline Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">GMV & Platform Revenue Growth</h2>
              <p className="text-xs text-gray-500">Gross customer spend vs net platform commissions</p>
            </div>
            <span className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-gray-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> GMV
              </span>
              <span className="flex items-center gap-1 text-gray-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Net Revenue
              </span>
            </span>
          </div>

          <div className="h-72 w-full">
            {gmvTrends && gmvTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={gmvTrends}>
                  <defs>
                    <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={v => `₹${v}`} />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="gmv" name="GMV" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#gmvGradient)" />
                  <Area type="monotone" dataKey="platformRevenue" name="Platform Revenue" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#revenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No revenue records in this timeframe
              </div>
            )}
          </div>
        </div>

        {/* City-wise Revenue Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FiMapPin className="text-amber-600" /> City Revenue Share
              </h2>
              <p className="text-xs text-gray-500">Gross revenue generated per city</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {cityRevenue && cityRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityRevenue} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} tickFormatter={v => `₹${v}`} />
                  <YAxis dataKey="city" type="category" stroke="#64748B" fontSize={11} width={80} tickLine={false} />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                    {cityRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No city booking data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown & Vendor Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Revenue Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FiGrid className="text-indigo-600" /> Category Revenue Breakdown
              </h2>
              <p className="text-xs text-gray-500">Top earning service verticals</p>
            </div>
          </div>

          <div className="space-y-3">
            {categoryRevenue && categoryRevenue.length > 0 ? (
              categoryRevenue.map((cat, idx) => {
                const total = categoryRevenue.reduce((acc, c) => acc + c.revenue, 0) || 1;
                const percentage = Math.round((cat.revenue / total) * 100);
                return (
                  <div key={idx} className="space-y-1.5 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-800">{cat.category}</span>
                      <span className="text-gray-900 font-bold">₹{cat.revenue.toLocaleString('en-IN')} <span className="text-gray-400 font-normal">({cat.bookings} jobs · {percentage}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: COLORS[idx % COLORS.length]
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-400 py-6 text-center">No category metrics available</p>
            )}
          </div>
        </div>

        {/* Top Vendor / Partner Revenue Leaderboard */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <FiAward className="text-amber-500" /> Top Partner Performance Leaderboard
              </h2>
              <p className="text-xs text-gray-500">Highest grossing professionals in this window</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 uppercase font-semibold">
                  <th className="pb-3">Partner</th>
                  <th className="pb-3 text-center">Jobs</th>
                  <th className="pb-3 text-right">Gross GMV</th>
                  <th className="pb-3 text-right">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vendorRevenue && vendorRevenue.length > 0 ? (
                  vendorRevenue.map((v, i) => (
                    <tr key={v.id || i} className="hover:bg-gray-50/50">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-semibold text-gray-800">{v.name}</p>
                            <p className="text-[10px] text-gray-400">⭐ {v.rating} {v.phone ? `· ${v.phone}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-center font-bold text-gray-700">{v.jobs}</td>
                      <td className="py-2.5 text-right font-black text-gray-900">₹{v.revenue.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-600">₹{v.earnings.toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-400">
                      No partner data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
