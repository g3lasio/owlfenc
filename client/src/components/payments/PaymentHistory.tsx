import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Send,
  Eye,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ProjectPayment = {
  id: number;
  projectId: number;
  userId: number;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentLinkId?: string;
  amount: number;
  type: "deposit" | "final" | "milestone" | "additional";
  status: "pending" | "succeeded" | "failed" | "canceled" | "expired";
  paymentMethod?: string;
  receiptUrl?: string;
  invoiceUrl?: string;
  checkoutUrl?: string;
  paymentLinkUrl?: string;
  clientEmail?: string;
  clientName?: string;
  invoiceNumber?: string;
  description?: string;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  paymentDate?: string;
  sentDate?: string;
  reminderSent?: boolean;
  createdAt: string;
  updatedAt: string;
};

type Project = {
  id: string | number;
  userId: string;
  projectId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  address: string;
  projectType?: string;
  projectSubtype?: string;
  projectCategory?: string;
  projectDescription?: string;
  projectScope?: string;
  estimateHtml?: string;
  contractHtml?: string;
  totalPrice?: number;
  status?: string;
  projectProgress?: string;
  paymentStatus?: string;
  paymentDetails?: any;
  createdAt: string;
  updatedAt: string;
};

interface PaymentHistoryProps {
  payments: ProjectPayment[] | undefined;
  projects: Project[] | undefined;
  isLoading: boolean;
  onResendPaymentLink: (paymentId: number) => void;
  onRefresh: () => void;
}

export default function PaymentHistory({
  payments,
  projects,
  isLoading,
  onResendPaymentLink,
  onRefresh,
}: PaymentHistoryProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, icon: Clock, color: "text-yellow-400" },
      succeeded: { variant: "default" as const, icon: CheckCircle, color: "text-green-400" },
      failed: { variant: "destructive" as const, icon: XCircle, color: "text-red-400" },
      canceled: { variant: "secondary" as const, icon: XCircle, color: "text-gray-400" },
      expired: { variant: "destructive" as const, icon: AlertCircle, color: "text-orange-400" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getTypeColor = (type: string) => {
    const colors = {
      deposit: "text-blue-400",
      final: "text-green-400",
      milestone: "text-purple-400",
      additional: "text-orange-400",
    };
    return colors[type as keyof typeof colors] || "text-gray-400";
  };

  const copyPaymentLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Payment link copied",
      description: "The payment link has been copied to your clipboard.",
    });
  };

  // Filter payments
  const filteredPayments = (payments || []).filter((payment) => {
    const matchesSearch = 
      payment.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
    const matchesType = typeFilter === "all" || payment.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // NO MOCK DATA - Only show real Firebase data

  // CRITICAL: Only use REAL data from Firebase - NO fallback to mock data
  const displayPayments = filteredPayments;

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <History className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription className="text-gray-400">
                Track and manage all your payment transactions
              </CardDescription>
            </div>
            <Button
              onClick={onRefresh}
              variant="outline"
              className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search" className="text-white">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status" className="text-white">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="succeeded">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type" className="text-white">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                  <SelectItem value="additional">Additional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                variant="outline"
                className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-cyan-400">Invoice</TableHead>
                  <TableHead className="text-cyan-400">Client</TableHead>
                  <TableHead className="text-cyan-400">Amount</TableHead>
                  <TableHead className="text-cyan-400">Type</TableHead>
                  <TableHead className="text-cyan-400">Status</TableHead>
                  <TableHead className="text-cyan-400">Date</TableHead>
                  <TableHead className="text-cyan-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayPayments.map((payment) => (
                  <TableRow key={payment.id} className="border-gray-700 hover:bg-gray-800/50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">{payment.invoiceNumber}</p>
                        <p className="text-sm text-gray-400 truncate max-w-xs">
                          {payment.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-white">{payment.clientName}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-cyan-400">
                        {formatCurrency(payment.amount)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium capitalize ${getTypeColor(payment.type)}`}>
                        {payment.type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white">{formatDate(payment.createdAt)}</p>
                        {payment.paidDate && (
                          <p className="text-sm text-green-400">
                            Paid: {formatDate(payment.paidDate)}
                          </p>
                        )}
                        {payment.dueDate && payment.status === "pending" && (
                          <p className="text-sm text-yellow-400">
                            Due: {formatDate(payment.dueDate)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {payment.paymentLinkUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyPaymentLink(payment.paymentLinkUrl!)}
                            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                        {payment.paymentLinkUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(payment.paymentLinkUrl, "_blank")}
                            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        {payment.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => onResendPaymentLink(payment.id)}
                            className="bg-cyan-400 text-black hover:bg-cyan-300"
                          >
                            <Send className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {displayPayments.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Payments Found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                  ? "No payments match your current filters."
                  : "You haven't created any payments yet. Use the Payment Workflow to get started."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Pending</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(displayPayments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Paid</p>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(displayPayments.filter(p => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Failed/Expired</p>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(displayPayments.filter(p => p.status === "failed" || p.status === "expired").reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {formatCurrency(displayPayments.reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-cyan-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}