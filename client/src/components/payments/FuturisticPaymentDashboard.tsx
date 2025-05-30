import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp
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

  // Prepare data for the donut chart
  const data = [
    { 
      name: 'Payments Completed', 
      value: paymentSummary.totalPaid,
      color: '#00ff88', // Bright green
      glowColor: 'rgba(0, 255, 136, 0.3)',
      count: paymentSummary.paidCount
    },
    { 
      name: 'Payments Pending', 
      value: paymentSummary.totalPending,
      color: '#ffaa00', // Bright orange/amber
      glowColor: 'rgba(255, 170, 0, 0.3)',
      count: paymentSummary.pendingCount
    },
    { 
      name: 'Payments Overdue', 
      value: paymentSummary.totalOverdue,
      color: '#ff4444', // Bright red
      glowColor: 'rgba(255, 68, 68, 0.3)',
      count: 0 // Assuming we don't have overdue count
    }
  ].filter(item => item.value > 0); // Only show segments with data

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-black min-h-[500px] rounded-2xl flex items-center justify-center border border-cyan-500/20">
        <div className="w-80 h-80 rounded-full border-4 border-cyan-500/30 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-black rounded-xl relative overflow-hidden border border-cyan-500/20 p-6">
      {/* Main content container */}
      <div className="flex items-center justify-center mb-6">
        {/* Circular chart */}
        <div className="relative w-72 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {/* Neon glow filters */}
                <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="orangeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={2}
                stroke="rgba(0,0,0,0.8)"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    filter={
                      entry.name.includes('Completed') ? 'url(#greenGlow)' :
                      entry.name.includes('Pending') ? 'url(#orangeGlow)' :
                      'url(#redGlow)'
                    }
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center" style={{
                boxShadow: '0 0 15px rgba(6, 182, 212, 0.6)'
              }}>
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {formatCurrency(paymentSummary.totalRevenue)}
              </div>
              <div className="text-cyan-300 text-sm font-medium">
                Total Revenue
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Payments Completed */}
        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/40 rounded-lg p-4 text-center backdrop-blur-sm" style={{
          boxShadow: '0 0 15px rgba(0, 255, 136, 0.2)'
        }}>
          <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center" style={{
            boxShadow: '0 0 10px rgba(0, 255, 136, 0.4)'
          }}>
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
          <div className="text-xl font-bold text-green-400 mb-1">
            {formatCurrency(paymentSummary.totalPaid)}
          </div>
          <div className="text-green-300 text-xs">
            {paymentSummary.paidCount} Payments completed
          </div>
        </div>

        {/* Payments Pending */}
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/40 rounded-lg p-4 text-center backdrop-blur-sm" style={{
          boxShadow: '0 0 15px rgba(255, 170, 0, 0.2)'
        }}>
          <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center" style={{
            boxShadow: '0 0 10px rgba(255, 170, 0, 0.4)'
          }}>
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div className="text-xl font-bold text-orange-400 mb-1">
            {formatCurrency(paymentSummary.totalPending)}
          </div>
          <div className="text-orange-300 text-xs">
            {paymentSummary.pendingCount} Pending
          </div>
        </div>

        {/* Payments Overdue */}
        <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/40 rounded-lg p-4 text-center backdrop-blur-sm" style={{
          boxShadow: '0 0 15px rgba(255, 68, 68, 0.2)'
        }}>
          <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center" style={{
            boxShadow: '0 0 10px rgba(255, 68, 68, 0.4)'
          }}>
            <AlertCircle className="h-5 w-5 text-white" />
          </div>
          <div className="text-xl font-bold text-red-400 mb-1">
            {formatCurrency(paymentSummary.totalOverdue)}
          </div>
          <div className="text-red-300 text-xs">
            Overdue
          </div>
        </div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-2 left-2 w-6 h-6 border-l-2 border-t-2 border-cyan-400/60"></div>
      <div className="absolute top-2 right-2 w-6 h-6 border-r-2 border-t-2 border-cyan-400/60"></div>
      <div className="absolute bottom-2 left-2 w-6 h-6 border-l-2 border-b-2 border-cyan-400/60"></div>
      <div className="absolute bottom-2 right-2 w-6 h-6 border-r-2 border-b-2 border-cyan-400/60"></div>
    </div>
  );
}