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
    <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-black min-h-[500px] rounded-2xl relative overflow-hidden border border-cyan-500/20">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 p-8">
        {/* Central donut chart */}
        <div className="flex items-center justify-center mb-8">
          <div className="relative w-80 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
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
                  innerRadius={90}
                  outerRadius={140}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                  filter="url(#glow)"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      style={{
                        filter: `drop-shadow(0 0 10px ${entry.glowColor})`
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center" style={{
                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)'
                }}>
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <div className="text-4xl font-bold text-white mb-2">
                  {formatCurrency(paymentSummary.totalRevenue)}
                </div>
                <div className="text-cyan-300 text-lg font-medium">
                  Total Revenue
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats cards */}
        <div className="grid grid-cols-3 gap-6">
          {/* Payments Completed */}
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-6 text-center backdrop-blur-sm" style={{
            boxShadow: '0 0 20px rgba(0, 255, 136, 0.1)'
          }}>
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center" style={{
              boxShadow: '0 0 15px rgba(0, 255, 136, 0.3)'
            }}>
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {formatCurrency(paymentSummary.totalPaid)}
            </div>
            <div className="text-green-300 text-sm font-medium">
              {paymentSummary.paidCount} Payments
            </div>
            <div className="text-white/60 text-xs mt-1">
              Completed
            </div>
          </div>

          {/* Payments Pending */}
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-xl p-6 text-center backdrop-blur-sm" style={{
            boxShadow: '0 0 20px rgba(255, 170, 0, 0.1)'
          }}>
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center" style={{
              boxShadow: '0 0 15px rgba(255, 170, 0, 0.3)'
            }}>
              <Clock className="h-7 w-7 text-white" />
            </div>
            <div className="text-3xl font-bold text-orange-400 mb-2">
              {formatCurrency(paymentSummary.totalPending)}
            </div>
            <div className="text-orange-300 text-sm font-medium">
              {paymentSummary.pendingCount} Pending
            </div>
            <div className="text-white/60 text-xs mt-1">
              Awaiting Payment
            </div>
          </div>

          {/* Payments Overdue */}
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-xl p-6 text-center backdrop-blur-sm" style={{
            boxShadow: '0 0 20px rgba(255, 68, 68, 0.1)'
          }}>
            <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center" style={{
              boxShadow: '0 0 15px rgba(255, 68, 68, 0.3)'
            }}>
              <AlertCircle className="h-7 w-7 text-white" />
            </div>
            <div className="text-3xl font-bold text-red-400 mb-2">
              {formatCurrency(paymentSummary.totalOverdue)}
            </div>
            <div className="text-red-300 text-sm font-medium">
              Overdue
            </div>
            <div className="text-white/60 text-xs mt-1">
              Requires Attention
            </div>
          </div>
        </div>
      </div>

      {/* Subtle corner accents */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-400/50 rounded-tl-lg"></div>
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-400/50 rounded-tr-lg"></div>
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-400/50 rounded-bl-lg"></div>
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-400/50 rounded-br-lg"></div>
    </div>
  );
}