import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Target,
  Activity,
} from "lucide-react";

// Futuristic Circular Chart Component
interface CircularChartProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: React.ReactNode;
  colorScheme: 'cyan' | 'yellow' | 'green' | 'red';
}

function CircularChart({ 
  percentage, 
  size = 180, 
  strokeWidth = 12,
  icon,
  label,
  value,
  badge,
  colorScheme
}: CircularChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  // Color logic based on percentage (traffic light system)
  const getColor = () => {
    if (colorScheme === 'red') {
      // Overdue: inverted logic - lower is better
      if (percentage < 20) return { primary: '#10b981', glow: '#10b981' }; // Green
      if (percentage < 50) return { primary: '#fbbf24', glow: '#fbbf24' }; // Yellow
      return { primary: '#ef4444', glow: '#ef4444' }; // Red
    }
    
    // Normal logic for other charts - higher is better
    if (percentage >= 70) return { 
      primary: colorScheme === 'cyan' ? '#06b6d4' : colorScheme === 'yellow' ? '#fbbf24' : '#10b981',
      glow: colorScheme === 'cyan' ? '#06b6d4' : colorScheme === 'yellow' ? '#fbbf24' : '#10b981'
    };
    if (percentage >= 40) return { primary: '#fbbf24', glow: '#fbbf24' }; // Yellow
    return { primary: '#ef4444', glow: '#ef4444' }; // Red
  };
  
  const colors = getColor();
  
  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* SVG Circular Chart */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Glow effect */}
          <defs>
            <filter id={`glow-${colorScheme}`}>
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id={`gradient-${colorScheme}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: colors.primary, stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: colors.glow, stopOpacity: 0.6 }} />
            </linearGradient>
          </defs>
          
          {/* Background circle (track) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
            className="opacity-30"
          />
          
          {/* Segmented progress circle with holographic effect */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#gradient-${colorScheme})`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            filter={`url(#glow-${colorScheme})`}
            style={{
              transformOrigin: 'center',
            }}
          />
          
          {/* Pulsing inner circle for holographic effect */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth - 5}
            fill={colors.primary}
            className="opacity-5 animate-pulse"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="mb-2" style={{ color: colors.primary }}>
            {icon}
          </div>
          <p className="text-3xl font-bold text-white">
            {percentage}%
          </p>
        </div>
      </div>
      
      {/* Label and value */}
      <div className="text-center mt-4 space-y-2">
        <p className="text-sm font-medium" style={{ color: colors.primary }}>
          {label}
        </p>
        <p className="text-2xl font-bold text-white">
          {value}
        </p>
        {badge && <div className="flex justify-center">{badge}</div>}
      </div>
    </div>
  );
}

type PaymentSummary = {
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  totalRevenue: number;
  pendingCount: number;
  paidCount: number;
};

interface FuturisticPaymentDashboardProps {
  paymentSummary: PaymentSummary;
  isLoading: boolean;
}

export default function FuturisticPaymentDashboard({
  paymentSummary,
  isLoading,
}: FuturisticPaymentDashboardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Use only REAL data from Firebase/database - NO MOCK DATA
  const displaySummary = paymentSummary;

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="animate-pulse text-cyan-400">
              <Activity className="h-8 w-8 animate-spin" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate dynamic percentages for circular charts
  const revenuePercentage = displaySummary.totalRevenue > 0 
    ? Math.min(100, calculatePercentage(displaySummary.totalPaid, displaySummary.totalRevenue))
    : 0;
  
  const pendingPercentage = displaySummary.totalRevenue > 0
    ? calculatePercentage(displaySummary.totalPending, displaySummary.totalRevenue)
    : 0;
  
  const paidMonthPercentage = displaySummary.totalRevenue > 0
    ? calculatePercentage(displaySummary.totalPaid, displaySummary.totalRevenue)
    : 0;
  
  const overduePercentage = displaySummary.totalRevenue > 0
    ? calculatePercentage(displaySummary.totalOverdue, displaySummary.totalRevenue)
    : 0;

  return (
    <div className="space-y-6">
      {/* Futuristic Circular Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Total Revenue Chart */}
        <Card 
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-cyan-700/30 shadow-xl shadow-cyan-500/10"
          data-testid="card-revenue-chart"
        >
          <CardContent className="p-2">
            <CircularChart
              percentage={revenuePercentage}
              icon={<DollarSign className="h-10 w-10" />}
              label="Revenue Collected"
              value={formatCurrency(displaySummary.totalRevenue)}
              badge={
                <Badge variant="default" className="bg-cyan-600/20 text-cyan-400 border-cyan-500/30">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Total Revenue
                </Badge>
              }
              colorScheme="cyan"
            />
          </CardContent>
        </Card>

        {/* Pending Payments Chart */}
        <Card 
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-yellow-700/30 shadow-xl shadow-yellow-500/10"
          data-testid="card-pending-chart"
        >
          <CardContent className="p-2">
            <CircularChart
              percentage={pendingPercentage}
              icon={<Clock className="h-10 w-10" />}
              label="Pending Payments"
              value={formatCurrency(displaySummary.totalPending)}
              badge={
                <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400 border-yellow-500/30">
                  {displaySummary.pendingCount} invoices
                </Badge>
              }
              colorScheme="yellow"
            />
          </CardContent>
        </Card>

        {/* Paid This Month Chart */}
        <Card 
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-green-700/30 shadow-xl shadow-green-500/10"
          data-testid="card-paid-chart"
        >
          <CardContent className="p-2">
            <CircularChart
              percentage={paidMonthPercentage}
              icon={<CheckCircle className="h-10 w-10" />}
              label="Paid This Month"
              value={formatCurrency(displaySummary.totalPaid)}
              badge={
                <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-500/30">
                  {displaySummary.paidCount} payments
                </Badge>
              }
              colorScheme="green"
            />
          </CardContent>
        </Card>

        {/* Overdue Payments Chart */}
        <Card 
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-red-700/30 shadow-xl shadow-red-500/10"
          data-testid="card-overdue-chart"
        >
          <CardContent className="p-2">
            <CircularChart
              percentage={overduePercentage}
              icon={<AlertTriangle className="h-10 w-10" />}
              label="Overdue"
              value={formatCurrency(displaySummary.totalOverdue)}
              badge={
                displaySummary.totalOverdue > 0 ? (
                  <Badge variant="destructive" className="bg-red-600/20 text-red-400 border-red-500/30">
                    Action needed
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-gray-600/20 text-gray-400 border-gray-500/30">
                    All current
                  </Badge>
                )
              }
              colorScheme="red"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}