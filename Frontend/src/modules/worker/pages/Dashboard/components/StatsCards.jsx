import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiCheckCircle, FiStar, FiCalendar } from 'react-icons/fi';
import { FaWallet } from 'react-icons/fa';

const StatsCards = memo(({ stats = {} }) => {
  const navigate = useNavigate();

  const totalEarnings = stats.totalEarnings || stats.totalRevenue || 0;
  const monthlyEarnings = stats.monthlyEarnings || Math.round(totalEarnings * 0.4);
  const completedServices = stats.completedServices ?? stats.completedJobs ?? 0;
  const pendingServices = stats.pendingServices ?? ((stats.pendingAlerts || 0) + (stats.activeJobs || 0));
  const avgRating = stats.averageRating || stats.rating || 5.0;

  const topCards = [
    {
      title: "Total Earnings",
      value: `₹${Number(totalEarnings).toLocaleString()}`,
      subtext: "Lifetime Revenue",
      icon: FaWallet,
      onClick: () => navigate('/worker/wallet')
    },
    {
      title: "Monthly Earnings",
      value: `₹${Number(monthlyEarnings).toLocaleString()}`,
      subtext: "This Month",
      icon: FiCalendar,
      onClick: () => navigate('/worker/wallet')
    }
  ];

  const subCards = [
    {
      title: "Average Rating",
      value: `${Number(avgRating).toFixed(1)} ★`,
      icon: FiStar,
      iconColor: "text-amber-500",
      onClick: () => navigate('/worker/ratings')
    },
    {
      title: "Completed",
      value: completedServices,
      icon: FiCheckCircle,
      iconColor: "text-emerald-600",
      onClick: () => navigate('/worker/jobs?tab=completed')
    },
    {
      title: "Pending",
      value: pendingServices,
      icon: FiClock,
      iconColor: "text-slate-600",
      onClick: () => navigate('/worker/booking-alerts')
    }
  ];

  return (
    <div className="px-4 pt-4 space-y-3">
      {/* Top Main Cards: Total & Monthly Earnings */}
      <div className="grid grid-cols-2 gap-3">
        {topCards.map((card, idx) => {
          const IconComp = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 cursor-pointer active:scale-95 transition-all shadow-xs hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[#163B66]">
                  <IconComp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {card.value}
              </div>
              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                {card.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sub Analytics Cards: Rating, Completed, Pending */}
      <div className="grid grid-cols-3 gap-2.5">
        {subCards.map((card, idx) => {
          const IconComp = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className="bg-white rounded-xl p-3 border border-slate-200/80 cursor-pointer active:scale-95 transition-all shadow-xs hover:shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                  {card.title}
                </span>
                <IconComp className={`w-3.5 h-3.5 ${card.iconColor}`} />
              </div>
              <div className="text-lg font-black mt-1.5 text-slate-900">
                {card.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

StatsCards.displayName = 'WorkerStatsCards';

export default StatsCards;
