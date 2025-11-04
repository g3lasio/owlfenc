import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { 
  MessageSquare, 
  CreditCard, 
  Wrench, 
  Lightbulb, 
  HelpCircle, 
  Zap,
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { insertSupportTicketSchema, type InsertSupportTicket } from '@shared/schema';

const categoryIcons = {
  billing: CreditCard,
  technical: Wrench,
  'feature-request': Lightbulb,
  feedback: MessageSquare,
  'how-to': HelpCircle,
  urgent: Zap,
};

const categoryLabels = {
  billing: 'Billing & Payments',
  technical: 'Technical Issue',
  'feature-request': 'Feature Request',
  feedback: 'General Feedback',
  'how-to': 'How-To Question',
  urgent: 'Urgent Issue',
};

const priorityLabels = {
  low: 'Low - General inquiry',
  medium: 'Medium - Affects work but not blocking',
  high: 'High - Blocking my work',
  critical: 'Critical - Business stopped',
};

export default function GetSupport() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<InsertSupportTicket>({
    resolver: zodResolver(insertSupportTicketSchema),
    defaultValues: {
      userName: '',
      userEmail: '',
      category: 'technical',
      priority: 'medium',
      subject: '',
      description: '',
      attachmentUrl: '',
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: InsertSupportTicket) => {
      const response = await apiRequest('POST', '/api/support/create', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/support/my-tickets'] });
      setIsSubmitted(true);
      toast({
        title: 'Support ticket created!',
        description: 'We\'ve received your request and will respond soon.',
      });
      setTimeout(() => {
        navigate('/support/my-tickets');
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create ticket',
        description: error.message || 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: InsertSupportTicket) => {
    createTicketMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Ticket Submitted Successfully!</h2>
              <p className="text-muted-foreground">
                We've received your support request. Our team will review it and respond to you via email soon.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button 
                data-testid="button-view-tickets"
                onClick={() => navigate('/support/my-tickets')}
              >
                View My Tickets
              </Button>
              <Button 
                data-testid="button-back-help"
                variant="outline" 
                onClick={() => navigate('/support/help-center')}
              >
                Back to Help Center
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Get Support</h1>
        <p className="text-muted-foreground mt-2">
          Submit a support ticket and our team will assist you as soon as possible.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(categoryLabels).map(([key, label]) => {
          const Icon = categoryIcons[key as keyof typeof categoryIcons];
          const isSelected = form.watch('category') === key;
          return (
            <Card 
              key={key}
              data-testid={`category-card-${key}`}
              className={`cursor-pointer transition-all ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                  : 'hover:border-blue-300'
              }`}
              onClick={() => form.setValue('category', key as any)}
            >
              <CardContent className="pt-6 text-center">
                <Icon className={`h-8 w-8 mx-auto mb-2 ${
                  isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                }`} />
                <p className="font-medium text-sm">{label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Support Request Details</CardTitle>
          <CardDescription>
            Please provide as much detail as possible to help us assist you better.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="userName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-name"
                          placeholder="John Doe" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="userEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input 
                          data-testid="input-email"
                          type="email" 
                          placeholder="john@example.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      How urgent is this issue for your business?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-subject"
                        placeholder="Brief description of the issue" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        data-testid="textarea-description"
                        placeholder="Please provide as much detail as possible about your issue..."
                        className="min-h-[150px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Include steps to reproduce, error messages, or any relevant information.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attachmentUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Screenshot URL (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-attachment"
                        type="url"
                        placeholder="https://example.com/screenshot.png" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      If you have a screenshot, upload it to a service like Imgur and paste the URL here.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Response Time
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 mt-1">
                      We aim to respond to all tickets within 24-48 hours. Critical issues are prioritized.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button 
                  data-testid="button-cancel"
                  type="button" 
                  variant="outline"
                  onClick={() => navigate('/support/help-center')}
                >
                  Cancel
                </Button>
                <Button 
                  data-testid="button-submit"
                  type="submit" 
                  disabled={createTicketMutation.isPending}
                >
                  {createTicketMutation.isPending ? (
                    'Submitting...'
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Ticket
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
