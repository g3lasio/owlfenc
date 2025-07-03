import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Calendar,
  DollarSign,
  User,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from "lucide-react";

interface PaymentHistoryProps {
  payments: any[] | undefined;
  projects: any[] | undefined;
  isLoading: boolean;
  onResendPaymentLink?: (paymentId: number) => void;
  onRefresh?: () => void;
}

export default function PaymentHistory({
  payments = [],
  projects = [],
  isLoading,
  onResendPaymentLink,
  onRefresh,
}: PaymentHistoryProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
      succeeded: {
        variant: "default" as const,
        icon: CheckCircle,
        label: "Paid",
      },
      pending: {
        variant: "secondary" as const,
        icon: Clock,
        label: "Pending",
      },
      failed: {
        variant: "destructive" as const,
        icon: XCircle,
        label: "Failed",
      },
      canceled: {
        variant: "outline" as const,
        icon: AlertCircle,
        label: "Canceled",
      },
      expired: {
        variant: "outline" as const,
        icon: AlertCircle,
        label: "Expired",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPaymentTypeBadge = (type: string) => {
    const typeConfig = {
      deposit: { label: "Initial Payment", color: "bg-blue-100 text-blue-800" },
      final: { label: "Final Payment", color: "bg-green-100 text-green-800" },
      milestone: { label: "Milestone", color: "bg-purple-100 text-purple-800" },
      additional: {
        label: "Additional",
        color: "bg-orange-100 text-orange-800",
      },
    };

    const config = typeConfig[type as keyof typeof typeConfig] || {
      label: type,
      color: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const getProjectInfo = (projectId: number) => {
    return projects.find((p) => p.id === projectId);
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const calculateTotals = () => {
    const totalAmount = filteredPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const paidAmount = filteredPayments
      .filter((p) => p.status === "succeeded")
      .reduce((sum, payment) => sum + payment.amount, 0);
    const pendingAmount = filteredPayments
      .filter((p) => p.status === "pending")
      .reduce((sum, payment) => sum + payment.amount, 0);

    return { totalAmount, paidAmount, pendingAmount };
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">
              Loading payment history...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Track all payments and their progress across your projects
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client, invoice, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="succeeded">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client & Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => {
                      const project = getProjectInfo(payment.projectId);
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <div className="font-medium">
                              {payment.invoiceNumber || `PAY-${payment.id}`}
                            </div>
                            {payment.description && (
                              <div className="text-xs text-muted-foreground">
                                {payment.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">
                                  {payment.clientName}
                                </span>
                              </div>
                              {project && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  <span>{project.address}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getPaymentTypeBadge(payment.type)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(payment.amount)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(payment.status)}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {payment.paidDate
                                ? formatDate(payment.paidDate)
                                : payment.createdAt
                                  ? formatDate(payment.createdAt)
                                  : "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {payment.status === "pending" &&
                                payment.paymentLinkUrl &&
                                onResendPaymentLink && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      onResendPaymentLink(payment.id)
                                    }
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination would go here if needed */}
          {filteredPayments.length > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <div>
                Showing {filteredPayments.length} of {payments.length} payments
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
