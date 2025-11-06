import PublicHeader from '@/components/layout/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'wouter';
import {
  Calculator,
  FileText,
  Shield,
  CreditCard,
  Users,
  Hammer,
  TrendingUp,
  MessageSquare,
  Building2,
  Search,
  FileCheck,
  DollarSign,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Clock,
  Target,
  Zap
} from 'lucide-react';

export default function Features() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Complete Construction Platform</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Win More Jobs
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Professional tools designed specifically for contractors. From estimates to contracts, 
              payments to project management - we've got you covered.
            </p>

            <Link href="/signup">
              <Button size="lg" data-testid="button-hero-start">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Categories Tabs */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="estimates" className="max-w-6xl mx-auto">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-12" data-testid="tabs-feature-categories">
              <TabsTrigger value="estimates" data-testid="tab-estimates">Estimates & AI</TabsTrigger>
              <TabsTrigger value="legal" data-testid="tab-legal">Legal & Contracts</TabsTrigger>
              <TabsTrigger value="payments" data-testid="tab-payments">Payments & Finance</TabsTrigger>
              <TabsTrigger value="management" data-testid="tab-management">Project Management</TabsTrigger>
            </TabsList>

            {/* Estimates & AI Features */}
            <TabsContent value="estimates" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">AI-Powered Estimating</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Generate professional estimates 10x faster with our AI assistant Mervin
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card data-testid="feature-mervin-ai">
                  <CardHeader>
                    <MessageSquare className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Mervin AI Assistant</CardTitle>
                    <CardDescription>Conversational estimate creation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Talk to Mervin like you would a project manager. Describe the job in plain language, 
                      and watch as Mervin calculates materials, labor, and pricing automatically.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Natural language processing for job descriptions</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Real-time material price updates</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Automatic labor hour calculations</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-fence-calculator">
                  <CardHeader>
                    <Calculator className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Fence Calculators</CardTitle>
                    <CardDescription>Specialized for wood, vinyl, and chain-link</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Industry-specific calculators with precise material counts, post spacing, 
                      gate calculations, and more.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Wood fence: pickets, rails, posts, concrete</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Vinyl fence: panels, posts, caps, gates</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Chain-link: fabric rolls, posts, fittings</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-deepsearch">
                  <CardHeader>
                    <Search className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>DeepSearch Material Intelligence</CardTitle>
                    <CardDescription>Find accurate pricing instantly</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      AI-powered web research finds real-time material and labor costs from suppliers 
                      in your area.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Real supplier pricing from your region</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Labor rate benchmarks by location</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Automatic cost database updates</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-professional-templates">
                  <CardHeader>
                    <FileCheck className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Professional Templates</CardTitle>
                    <CardDescription>Beautiful estimates that win jobs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Choose from professional templates designed to impress clients and close more deals.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Basic, Premium, and Luxury templates</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Your logo and branding included</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">PDF export and email delivery</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Legal & Contracts Features */}
            <TabsContent value="legal" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Legal Defense & Contracts</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Protect your business with professional contracts and legal safeguards
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card data-testid="feature-contract-generator">
                  <CardHeader>
                    <FileText className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Smart Contract Generator</CardTitle>
                    <CardDescription>Legally-binding agreements in minutes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Generate professional contracts with AI assistance. Include all necessary legal protections 
                      specific to construction work.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Contractor protection clauses included</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Payment terms and milestone schedules</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Liability limitations and warranties</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-digital-signatures">
                  <CardHeader>
                    <FileCheck className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Digital Signatures</CardTitle>
                    <CardDescription>Sign and get signed instantly</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Send contracts for electronic signature. Track when documents are viewed, 
                      signed, and completed.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Legally-binding electronic signatures</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Email delivery and reminders</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Audit trail for legal protection</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-property-verification">
                  <CardHeader>
                    <Shield className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Property Verification</CardTitle>
                    <CardDescription>ATTOM Data integration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Verify property ownership before starting work. Protect yourself from fraud 
                      and boundary disputes with official records.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Owner name and contact verification</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Property boundary and lot size data</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">HOA and restriction information</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-permit-advisor">
                  <CardHeader>
                    <Users className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Permit Advisor</CardTitle>
                    <CardDescription>Navigate permits and regulations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Get AI-powered guidance on permits required for your projects. Stay compliant 
                      with local building codes and HOA requirements.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Location-specific permit requirements</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Building code compliance guidance</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">HOA approval process help</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Payments & Finance Features */}
            <TabsContent value="payments" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Payments & Financial Management</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Get paid faster with integrated payment processing and invoicing
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card data-testid="feature-stripe-payments">
                  <CardHeader>
                    <CreditCard className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Stripe Payment Processing</CardTitle>
                    <CardDescription>Accept payments securely</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Accept credit cards, debit cards, and ACH payments directly through the platform. 
                      Funds deposited to your bank account automatically.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Accept all major credit and debit cards</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Bank transfers (ACH) for large payments</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Automatic receipt generation</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-invoicing">
                  <CardHeader>
                    <DollarSign className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Professional Invoicing</CardTitle>
                    <CardDescription>Create and track invoices</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Generate professional invoices with payment tracking. Send reminders automatically 
                      for overdue payments.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Automated invoice generation from projects</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Payment reminders and overdue tracking</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Custom payment terms and schedules</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-payment-tracking">
                  <CardHeader>
                    <BarChart3 className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Payment Tracking</CardTitle>
                    <CardDescription>Monitor deposits and final payments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Track deposits, progress payments, and final payments for each project. 
                      See your cash flow at a glance.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Deposit, progress, and final payment tracking</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Project payment history and status</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Outstanding balance calculations</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-quickbooks">
                  <CardHeader>
                    <Building2 className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>QuickBooks Integration</CardTitle>
                    <CardDescription>Sync with your accounting software</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Connect with QuickBooks to sync invoices, payments, and expenses automatically. 
                      Keep your books accurate without double entry.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Automatic invoice and payment sync</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Client data synchronization</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Real-time financial reporting</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Project Management Features */}
            <TabsContent value="management" className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Project Management</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Manage all your projects from estimate to completion in one place
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card data-testid="feature-project-dashboard">
                  <CardHeader>
                    <Hammer className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Project Dashboard</CardTitle>
                    <CardDescription>All projects at a glance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      See all your active projects, their status, and upcoming deadlines in one unified dashboard.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Unlimited project management</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Status tracking (lead, scheduled, in-progress, completed)</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Priority and deadline management</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-client-management">
                  <CardHeader>
                    <Users className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Client Management</CardTitle>
                    <CardDescription>Organize your client database</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Store client information, project history, and communication notes all in one place.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Complete client profiles with contact info</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Project history per client</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Notes and communication tracking</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-timeline">
                  <CardHeader>
                    <Clock className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Timeline & Scheduling</CardTitle>
                    <CardDescription>Never miss a deadline</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Schedule project start dates, track progress, and set completion deadlines. 
                      Keep all stakeholders informed.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Project scheduling and milestones</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Progress tracking and updates</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Completion date forecasting</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card data-testid="feature-materials">
                  <CardHeader>
                    <Target className="h-10 w-10 text-primary mb-2" />
                    <CardTitle>Materials Management</CardTitle>
                    <CardDescription>Track inventory and costs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-muted-foreground">
                      Keep track of materials needed for each project, monitor inventory, 
                      and manage supplier relationships.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Material lists per project</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Cost tracking and budgeting</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">Supplier contact management</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border/40 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <TrendingUp className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Work Smarter?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start your free trial today and see how Owl Fenc can transform your construction business
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8" data-testid="button-cta-signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-cta-pricing">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/features" className="text-muted-foreground hover:text-primary transition-colors text-sm">Features</Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-muted-foreground hover:text-primary transition-colors text-sm">Pricing</Link>
                </li>
                <li>
                  <Link href="/integrations" className="text-muted-foreground hover:text-primary transition-colors text-sm">Integrations</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about-owlfenc" className="text-muted-foreground hover:text-primary transition-colors text-sm">About Us</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors text-sm">Privacy Policy</Link>
                </li>
                <li>
                  <Link href="/terms-of-service" className="text-muted-foreground hover:text-primary transition-colors text-sm">Terms of Service</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:mervin@owlfenc.com" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
            <p>© 2025 Owl Fenc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
