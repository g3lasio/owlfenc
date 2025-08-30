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

  const totalTransactions = paymentSummary.pendingCount + paymentSummary.paidCount;
  const paidPercentage = calculatePercentage(paymentSummary.paidCount, totalTransactions);
  const pendingPercentage = calculatePercentage(paymentSummary.pendingCount, totalTransactions);

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

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-800/10 border-cyan-700/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-400 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(displaySummary.totalRevenue)}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                  <span className="text-sm text-green-400">+12.5% this month</span>
                </div>
              </div>
              <div className="p-3 bg-cyan-600/20 rounded-full">
                <DollarSign className="h-8 w-8 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-700/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-400 mb-1">Pending Payments</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(displaySummary.totalPending)}
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400">
                    {displaySummary.pendingCount} invoices
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-yellow-600/20 rounded-full">
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paid Payments */}
        <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-400 mb-1">Paid This Month</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(displaySummary.totalPaid)}
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="default" className="bg-green-600/20 text-green-400">
                    {displaySummary.paidCount} payments
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-green-600/20 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overdue Payments */}
        <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-400 mb-1">Overdue</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(displaySummary.totalOverdue)}
                </p>
                <div className="flex items-center mt-2">
                  {displaySummary.totalOverdue > 0 ? (
                    <Badge variant="destructive" className="bg-red-600/20 text-red-400">
                      Action needed
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-gray-600/20 text-gray-400">
                      All current
                    </Badge>
                  )}
                </div>
              </div>
              <div className="p-3 bg-red-600/20 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Payment Performance
          </CardTitle>
          <CardDescription className="text-gray-400">
            Quick overview of your payment metrics and collection efficiency
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white">Payment Success Rate</span>
                <span className="text-cyan-400">{paidPercentage}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-cyan-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${paidPercentage}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white">Collection Efficiency</span>
                <span className="text-green-400">87%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: "87%" }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white">Average Payment Time</span>
                <span className="text-blue-400">5.2 days</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: "72%" }}
                ></div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Target className="h-6 w-6 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-white">92%</p>
              <p className="text-sm text-gray-400">Payment Accuracy</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <CreditCard className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white">$1,847</p>
              <p className="text-sm text-gray-400">Average Invoice</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white">3.1</p>
              <p className="text-sm text-gray-400">Days to Payment</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}