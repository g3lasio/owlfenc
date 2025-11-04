import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Plus,
  MessageSquare,
  CreditCard,
  Wrench,
  Lightbulb,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { SupportTicket, SupportTicketStatus } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

const categoryIcons = {
  billing: CreditCard,
  technical: Wrench,
  'feature-request': Lightbulb,
  feedback: MessageSquare,
  'how-to': HelpCircle,
  urgent: Zap,
};

const statusConfig: Record<SupportTicketStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
  'open': { 
    label: 'Open', 
    variant: 'default',
    icon: AlertCircle 
  },
  'in-progress': { 
    label: 'In Progress', 
    variant: 'secondary',
    icon: Clock 
  },
  'waiting-response': { 
    label: 'Waiting for Response', 
    variant: 'outline',
    icon: MessageSquare 
  },
  'resolved': { 
    label: 'Resolved', 
    variant: 'default',
    icon: CheckCircle 
  },
  'closed': { 
    label: 'Closed', 
    variant: 'outline',
    icon: CheckCircle 
  },
};

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
};

export default function MyTickets() {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: ticketsData, isLoading } = useQuery<{ success: boolean; tickets: SupportTicket[] }>({
    queryKey: ['/api/support/my-tickets'],
  });

  const tickets = ticketsData?.tickets || [];

  const filteredTickets = statusFilter === 'all'
    ? tickets
    : tickets.filter(ticket => ticket.status === statusFilter);

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in-progress');
  const closedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isLoading && tickets.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-full">
                <Ticket className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">No Support Tickets Yet</h2>
              <p className="text-muted-foreground">
                You haven't submitted any support tickets. If you need help, create your first ticket.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Link href="/support/get-support">
                <Button data-testid="button-create-ticket">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Support Ticket
                </Button>
              </Link>
              <Link href="/support/help-center">
                <Button data-testid="button-browse-help" variant="outline">
                  Browse Help Center
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Support Tickets</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage all your support requests
          </p>
        </div>
        <Link href="/support/get-support">
          <Button data-testid="button-new-ticket">
            <Plus className="mr-2 h-4 w-4" />
            New Ticket
          </Button>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{tickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {openTickets.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {closedTickets.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Tickets</CardTitle>
              <CardDescription>Click on a ticket to view details and responses</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-filter" className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="waiting-response">Waiting Response</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tickets found with the selected filter.
              </div>
            ) : (
              filteredTickets.map((ticket) => {
                const CategoryIcon = categoryIcons[ticket.category as keyof typeof categoryIcons];
                const statusInfo = statusConfig[ticket.status];
                const StatusIcon = statusInfo.icon;
                
                return (
                  <Card 
                    key={ticket.id} 
                    data-testid={`ticket-${ticket.id}`}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
                            <CategoryIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg">{ticket.subject}</h3>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {ticket.description}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <Badge variant={statusInfo.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                              
                              <Badge 
                                variant="outline" 
                                className={priorityColors[ticket.priority]}
                              >
                                {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
                              </Badge>
                              
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                              </span>

                              {ticket.id && (
                                <span className="text-muted-foreground font-mono text-xs">
                                  #{ticket.id.substring(0, 8)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
