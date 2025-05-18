import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainIcon } from "lucide-react";

export default function AIProjectManager() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <BrainIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Project Manager</h1>
          <p className="text-muted-foreground">
            Coming Soon: Your intelligent assistant for managing fence projects and business tasks
          </p>
        </div>
      </div>

      <Card className="w-full overflow-hidden">
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-center text-xl">🚧 Coming Soon 🚧</CardTitle>
          <CardDescription className="text-center">
            This feature is currently in development
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="mb-6">
            <div className="w-24 h-24 rounded-full bg-primary/20 mx-auto flex items-center justify-center mb-4">
              <BrainIcon className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI Project Manager</h3>
            <p className="text-muted-foreground mb-4">
              Our team is working hard to bring you this exciting new feature. With AI Project Manager, you'll be able to:
            </p>
            <ul className="text-left space-y-2 mb-6 max-w-md mx-auto">
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Organize your projects in progress with intelligent prioritization</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Receive reminders for tasks, deadlines, and pending payments</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Track estimates sent and contracts approved</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Get smart alerts to prevent delays or errors</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Optimize your schedule and team coordination</span>
              </li>
            </ul>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <i className="ri-notification-2-line text-amber-600"></i>
                  </div>
                  <h4 className="font-medium">Smart Reminders</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Never miss a deadline or forget a follow-up call with clients
                </p>
              </CardContent>
            </Card>
            
            <Card className="border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <i className="ri-bar-chart-2-line text-blue-600"></i>
                  </div>
                  <h4 className="font-medium">Progress Tracking</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Real-time project monitoring with intelligent insights
                </p>
              </CardContent>
            </Card>
            
            <Card className="border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <i className="ri-money-dollar-circle-line text-green-600"></i>
                  </div>
                  <h4 className="font-medium">Financial Insights</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Track payments, invoices, and financial performance
                </p>
              </CardContent>
            </Card>
            
            <Card className="border bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-center space-x-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <i className="ri-calendar-check-line text-purple-600"></i>
                  </div>
                  <h4 className="font-medium">Schedule Optimization</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Smart scheduling to maximize team efficiency
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Button disabled className="mb-2">Get Notified When Available</Button>
          <p className="text-sm text-muted-foreground">
            Expected launch: Fall 2023
          </p>
        </CardContent>
      </Card>
    </div>
  );
}