import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Zap,
  DollarSign
} from 'lucide-react';

interface PaymentSummary {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  totalRevenue: number;
  pendingCount: number;
  paidCount: number;
}

interface FuturisticPaymentDashboardProps {
  paymentSummary: PaymentSummary;
  isLoading: boolean;
}

export default function FuturisticPaymentDashboard({
  paymentSummary,
  isLoading
}: FuturisticPaymentDashboardProps) {
  const [animatedValues, setAnimatedValues] = useState({ paid: 0, pending: 0, overdue: 0 });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  // Calculate percentages
  const total = paymentSummary.totalRevenue || 1;
  const paidPercent = (paymentSummary.totalPaid / total) * 100;
  const pendingPercent = (paymentSummary.totalPending / total) * 100;
  const overduePercent = (paymentSummary.totalOverdue / total) * 100;

  // Animate values on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValues({
        paid: paidPercent,
        pending: pendingPercent,
        overdue: overduePercent
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [paidPercent, pendingPercent, overduePercent]);

  if (isLoading) {
    return (
      <div className="relative w-full h-80 bg-gradient-to-br from-slate-900 via-indigo-900 to-black rounded-2xl border border-cyan-400/30 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-pulse"></div>
        <div className="flex items-center justify-center h-full">
          <div className="w-32 h-32 border-4 border-cyan-400/30 rounded-full animate-spin border-t-cyan-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-gradient-to-br from-slate-900 via-indigo-900 to-black rounded-2xl border border-cyan-400/30 overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,182,212,0.1)_1px,transparent_1px),linear-gradient(rgba(6,182,212,0.1)_1px,transparent_1px)] bg-[size:20px_20px] animate-pulse"></div>
      </div>

      {/* Holographic scanning line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>

      <div className="relative z-10 p-6">
        {/* Main circular visualization */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 w-64 h-64 rounded-full border-2 border-cyan-400/20 animate-spin" style={{ animationDuration: '20s' }}></div>
            
            {/* Main payment rings */}
            <div className="relative w-64 h-64 flex items-center justify-center">
              {/* Paid Ring (Green) */}
              <svg className="absolute inset-0 w-64 h-64 transform -rotate-90" viewBox="0 0 256 256">
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  fill="none"
                  stroke="rgba(0, 255, 136, 0.2)"
                  strokeWidth="12"
                />
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  fill="none"
                  stroke="#00ff88"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(animatedValues.paid / 100) * 691} 691`}
                  className="transition-all duration-2000 ease-out"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(0, 255, 136, 0.8))'
                  }}
                />
              </svg>

              {/* Pending Ring (Orange) */}
              <svg className="absolute inset-0 w-56 h-56 transform -rotate-90" viewBox="0 0 224 224" style={{ top: '16px', left: '16px' }}>
                <circle
                  cx="112"
                  cy="112"
                  r="96"
                  fill="none"
                  stroke="rgba(255, 170, 0, 0.2)"
                  strokeWidth="10"
                />
                <circle
                  cx="112"
                  cy="112"
                  r="96"
                  fill="none"
                  stroke="#ffaa00"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(animatedValues.pending / 100) * 603} 603`}
                  className="transition-all duration-2000 ease-out"
                  style={{
                    filter: 'drop-shadow(0 0 8px rgba(255, 170, 0, 0.8))'
                  }}
                />
              </svg>

              {/* Overdue Ring (Red) */}
              <svg className="absolute inset-0 w-48 h-48 transform -rotate-90" viewBox="0 0 192 192" style={{ top: '32px', left: '32px' }}>
                <circle
                  cx="96"
                  cy="96"
                  r="82"
                  fill="none"
                  stroke="rgba(255, 68, 68, 0.2)"
                  strokeWidth="8"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="82"
                  fill="none"
                  stroke="#ff4444"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(animatedValues.overdue / 100) * 515} 515`}
                  className="transition-all duration-2000 ease-out"
                  style={{
                    filter: 'drop-shadow(0 0 6px rgba(255, 68, 68, 0.8))'
                  }}
                />
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center bg-slate-900/80 backdrop-blur-sm rounded-full p-6 border border-cyan-400/30">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center relative">
                    <TrendingUp className="h-6 w-6 text-white" />
                    <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-ping"></div>
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {formatCurrency(paymentSummary.totalRevenue)}
                  </div>
                  <div className="text-cyan-300 text-sm">
                    Total Revenue
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats panels */}
        <div className="grid grid-cols-3 gap-4">
          {/* Paid Stats */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-600/5 border border-green-400/30 rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="text-xs text-green-300 font-mono">{paidPercent.toFixed(1)}%</div>
              </div>
              <div className="text-xl font-bold text-green-400 mb-1">
                {formatCurrency(paymentSummary.totalPaid)}
              </div>
              <div className="text-green-300 text-xs">
                {paymentSummary.paidCount} Completed
              </div>
              <div className="absolute bottom-0 left-0 h-1 bg-green-400" style={{ width: `${paidPercent}%` }}></div>
            </div>
          </div>

          {/* Pending Stats */}
          <div className="bg-gradient-to-br from-orange-500/10 to-amber-600/5 border border-orange-400/30 rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-5 w-5 text-orange-400" />
                <div className="text-xs text-orange-300 font-mono">{pendingPercent.toFixed(1)}%</div>
              </div>
              <div className="text-xl font-bold text-orange-400 mb-1">
                {formatCurrency(paymentSummary.totalPending)}
              </div>
              <div className="text-orange-300 text-xs">
                {paymentSummary.pendingCount} Pending
              </div>
              <div className="absolute bottom-0 left-0 h-1 bg-orange-400" style={{ width: `${pendingPercent}%` }}></div>
            </div>
          </div>

          {/* Overdue Stats */}
          <div className="bg-gradient-to-br from-red-500/10 to-rose-600/5 border border-red-400/30 rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-red-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="text-xs text-red-300 font-mono">{overduePercent.toFixed(1)}%</div>
              </div>
              <div className="text-xl font-bold text-red-400 mb-1">
                {formatCurrency(paymentSummary.totalOverdue)}
              </div>
              <div className="text-red-300 text-xs">
                Overdue
              </div>
              <div className="absolute bottom-0 left-0 h-1 bg-red-400" style={{ width: `${overduePercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* Energy pulse indicators */}
        <div className="flex justify-center mt-4 space-x-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  );
}