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
    <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-black rounded-xl relative overflow-hidden border border-cyan-500/20 p-4 max-h-96">
      {/* Compact main content */}
      <div className="flex items-center justify-center mb-4">
        {/* Compact circular chart */}
        <div className="relative w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {/* Neon glow filters */}
                <filter id="greenGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="orangeGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge> 
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
                innerRadius={50}
                outerRadius={85}
                paddingAngle={5}
                dataKey="value"
                strokeWidth={0}
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
                    style={{
                      filter: `drop-shadow(0 0 8px ${entry.glowColor})`
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto mb-1 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center" style={{
                boxShadow: '0 0 12px rgba(6, 182, 212, 0.6)'
              }}>
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {formatCurrency(paymentSummary.totalRevenue)}
              </div>
              <div className="text-cyan-300 text-xs font-medium">
                Total Revenue
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact stats cards */}
      <div className="grid grid-cols-3 gap-3">
        {/* Payments Completed */}
        <div className="bg-gradient-to-br from-green-500/15 to-green-600/5 border border-green-500/30 rounded-lg p-3 text-center backdrop-blur-sm" style={{
          boxShadow: '0 0 12px rgba(0, 255, 136, 0.15)'
        }}>
          <div className="w-8 h-8 mx-auto mb-2 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center" style={{
            boxShadow: '0 0 8px rgba(0, 255, 136, 0.4)'
          }}>
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
          <div className="text-lg font-bold text-green-400 mb-1">
            {formatCurrency(paymentSummary.totalPaid)}
          </div>
          <div className="text-green-300 text-xs">
            {paymentSummary.paidCount} Payments
          </div>
        </div>

        {/* Payments Pending */}
        <div className="bg-gradient-to-br from-orange-500/15 to-orange-600/5 border border-orange-500/30 rounded-lg p-3 text-center backdrop-blur-sm" style={{
          boxShadow: '0 0 12px rgba(255, 170, 0, 0.15)'
        }}>
          <div className="w-8 h-8 mx-auto mb-2 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center" style={{
            boxShadow: '0 0 8px rgba(255, 170, 0, 0.4)'
          }}>
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div className="text-lg font-bold text-orange-400 mb-1">
            {formatCurrency(paymentSummary.totalPending)}
          </div>
          <div className="text-orange-300 text-xs">
            {paymentSummary.pendingCount} Pending
          </div>
        </div>

        {/* Payments Overdue */}
        <div className="bg-gradient-to-br from-red-500/15 to-red-600/5 border border-red-500/30 rounded-lg p-3 text-center backdrop-blur-sm" style={{
          boxShadow: '0 0 12px rgba(255, 68, 68, 0.15)'
        }}>
          <div className="w-8 h-8 mx-auto mb-2 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center" style={{
            boxShadow: '0 0 8px rgba(255, 68, 68, 0.4)'
          }}>
            <AlertCircle className="h-4 w-4 text-white" />
          </div>
          <div className="text-lg font-bold text-red-400 mb-1">
            {formatCurrency(paymentSummary.totalOverdue)}
          </div>
          <div className="text-red-300 text-xs">
            Overdue
          </div>
        </div>
      </div>

      {/* Corner accents */}
      <div className="absolute top-1 left-1 w-4 h-4 border-l-2 border-t-2 border-cyan-400/60"></div>
      <div className="absolute top-1 right-1 w-4 h-4 border-r-2 border-t-2 border-cyan-400/60"></div>
      <div className="absolute bottom-1 left-1 w-4 h-4 border-l-2 border-b-2 border-cyan-400/60"></div>
      <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-cyan-400/60"></div>
    </div>
  );
}