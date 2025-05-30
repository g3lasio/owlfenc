import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Zap,
  Shield
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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const calculatePercentages = () => {
    const total = paymentSummary.totalRevenue;
    if (total === 0) return { paid: 0, pending: 0, overdue: 0 };
    
    return {
      paid: (paymentSummary.totalPaid / total) * 100,
      pending: (paymentSummary.totalPending / total) * 100,
      overdue: (paymentSummary.totalOverdue / total) * 100
    };
  };

  const percentages = calculatePercentages();

  // Calculate stroke-dasharray for each segment
  const circumference = 2 * Math.PI * 120;
  const paidStroke = (percentages.paid / 100) * circumference;
  const pendingStroke = (percentages.pending / 100) * circumference;
  const overdueStroke = (percentages.overdue / 100) * circumference;

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 border-cyan-500/30">
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="w-64 h-64 rounded-full border-4 border-cyan-500/30 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      {/* Main Futuristic Dashboard */}
      <Card className="bg-gradient-to-br from-slate-900 via-blue-900 to-cyan-900 border-cyan-500/30 shadow-2xl shadow-cyan-500/20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent animate-pulse"></div>
        
        <CardContent className="p-8 relative z-10">
          <div className="flex items-center justify-center relative">
            {/* Outer Glow Ring */}
            <div className="absolute w-80 h-80 rounded-full border border-cyan-500/20 animate-ping"></div>
            <div className="absolute w-72 h-72 rounded-full border border-cyan-400/30"></div>
            
            {/* Main Circular Chart */}
            <div className="relative w-64 h-64">
              <svg width="256" height="256" className="transform -rotate-90">
                {/* Background Circle */}
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="rgba(6, 182, 212, 0.1)"
                  strokeWidth="8"
                />
                
                {/* Paid Amount Arc */}
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="url(#paidGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${paidStroke} ${circumference}`}
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))'
                  }}
                />
                
                {/* Pending Amount Arc */}
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="url(#pendingGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${pendingStroke} ${circumference}`}
                  strokeDashoffset={-paidStroke}
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(251, 146, 60, 0.5))'
                  }}
                />
                
                {/* Overdue Amount Arc */}
                <circle
                  cx="128"
                  cy="128"
                  r="120"
                  fill="none"
                  stroke="url(#overdueGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${overdueStroke} ${circumference}`}
                  strokeDashoffset={-(paidStroke + pendingStroke)}
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.5))'
                  }}
                />
                
                {/* Gradients */}
                <defs>
                  <linearGradient id="paidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </linearGradient>
                  <linearGradient id="pendingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#ea580c" />
                  </linearGradient>
                  <linearGradient id="overdueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Center Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    <TrendingUp className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-2xl font-bold text-cyan-100">
                    {formatCurrency(paymentSummary.totalRevenue)}
                  </div>
                  <div className="text-sm text-cyan-300 font-medium">
                    Total Revenue
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {/* Paid Stats */}
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-300">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-xl font-bold text-green-400">
                {formatCurrency(paymentSummary.totalPaid)}
              </div>
              <div className="text-xs text-green-300">
                {paymentSummary.paidCount} Payments
              </div>
              <div className="text-xs text-cyan-200">
                {percentages.paid.toFixed(1)}% Complete
              </div>
            </div>
            
            {/* Pending Stats */}
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-all duration-300">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-xl font-bold text-orange-400">
                {formatCurrency(paymentSummary.totalPending)}
              </div>
              <div className="text-xs text-orange-300">
                {paymentSummary.pendingCount} Pending
              </div>
              <div className="text-xs text-cyan-200">
                {percentages.pending.toFixed(1)}% Waiting
              </div>
            </div>
            
            {/* Overdue Stats */}
            <div className="text-center group">
              <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30 group-hover:shadow-red-500/50 transition-all duration-300">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-xl font-bold text-red-400">
                {formatCurrency(paymentSummary.totalOverdue)}
              </div>
              <div className="text-xs text-red-300">
                Overdue
              </div>
              <div className="text-xs text-cyan-200">
                {percentages.overdue.toFixed(1)}% Critical
              </div>
            </div>
          </div>
        </CardContent>
        
        {/* Bottom Glow Effect */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
      </Card>
      
      {/* Side Accent Cards */}
      <div className="absolute -right-6 top-1/2 transform -translate-y-1/2 space-y-4">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50 animate-pulse">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
          <Shield className="h-6 w-6 text-white" />
        </div>
      </div>
      
      <div className="absolute -left-6 top-1/2 transform -translate-y-1/2 space-y-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/50">
          <TrendingUp className="h-6 w-6 text-white" />
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50 animate-pulse">
          <CheckCircle className="h-6 w-6 text-white" />
        </div>
      </div>
      
      {/* Corner Effects */}
      <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-cyan-500/50"></div>
      <div className="absolute top-0 right-0 w-8 h-8 border-r-2 border-t-2 border-cyan-500/50"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-cyan-500/50"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-cyan-500/50"></div>
    </div>
  );
}