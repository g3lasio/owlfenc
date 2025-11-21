import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Send, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { insertSupportTicketSchema, type InsertSupportTicket } from '@shared/schema';

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
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full">
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <CardTitle className="text-2xl">Get Support</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Send us a message and our support team will respond to you via email soon
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="userName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-name"
                        placeholder="Your name" 
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
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        data-testid="input-email"
                        type="email" 
                        placeholder="your@email.com" 
                        {...field} 
                      />
                    </FormControl>
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
                        placeholder="What do you need help with?" 
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
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        data-testid="textarea-description"
                        placeholder="Describe your issue or question..."
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-2">
                <Button 
                  data-testid="button-cancel"
                  type="button" 
                  variant="outline"
                  onClick={() => navigate('/support/help-center')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  data-testid="button-submit"
                  type="submit" 
                  disabled={createTicketMutation.isPending}
                  className="flex-1"
                >
                  {createTicketMutation.isPending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
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
