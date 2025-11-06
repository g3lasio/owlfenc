import PublicHeader from '@/components/layout/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import {
  ArrowRight,
  Sparkles,
  CreditCard,
  Shield,
  Building2,
  Brain,
  Database,
  Plug,
  CheckCircle
} from 'lucide-react';
import { SiStripe, SiOpenai, SiGoogle, SiQuickbooks } from 'react-icons/si';

export default function Integrations() {
  const integrations = [
    {
      name: 'Stripe',
      category: 'Payments',
      icon: SiStripe,
      description: 'Accept credit cards, debit cards, and ACH payments securely',
      features: [
        'Process credit and debit card payments',
        'ACH bank transfers for large payments',
        'Automatic receipt generation',
        'PCI-compliant payment processing',
        'Real-time payment status tracking'
      ],
      status: 'active',
      color: 'text-[#635bff]'
    },
    {
      name: 'ATTOM Data',
      category: 'Property Intelligence',
      icon: Shield,
      description: 'Comprehensive property data and ownership verification',
      features: [
        'Property ownership verification',
        'Boundary and lot size information',
        'HOA and deed restriction data',
        'Property value estimates',
        'Title and lien information'
      ],
      status: 'active',
      color: 'text-primary'
    },
    {
      name: 'OpenAI',
      category: 'AI Models',
      icon: SiOpenai,
      description: 'Advanced AI for estimates, contracts, and customer communication',
      features: [
        'GPT-4 for intelligent conversations',
        'Natural language estimate creation',
        'Contract generation and review',
        'Customer inquiry responses',
        'Document analysis and extraction'
      ],
      status: 'active',
      color: 'text-[#10a37f]'
    },
    {
      name: 'Claude (Anthropic)',
      category: 'AI Models',
      icon: Brain,
      description: 'Advanced AI reasoning for complex construction scenarios',
      features: [
        'Deep analysis of project requirements',
        'Legal contract intelligence',
        'Technical specification review',
        'Cost estimation validation',
        'Safety and compliance checking'
      ],
      status: 'active',
      color: 'text-orange-500'
    },
    {
      name: 'Google AI',
      category: 'AI Models',
      icon: SiGoogle,
      description: 'Google Gemini for multimodal AI capabilities',
      features: [
        'Image analysis for project planning',
        'Document processing and extraction',
        'Multilingual support',
        'Real-time data processing',
        'Advanced search capabilities'
      ],
      status: 'active',
      color: 'text-[#4285f4]'
    },
    {
      name: 'QuickBooks',
      category: 'Accounting',
      icon: SiQuickbooks,
      description: 'Seamless accounting integration for financial management',
      features: [
        'Automatic invoice sync',
        'Payment reconciliation',
        'Expense tracking',
        'Financial reporting',
        'Tax preparation support'
      ],
      status: 'premium',
      color: 'text-[#2ca01c]'
    },
    {
      name: 'PostgreSQL (Neon)',
      category: 'Database',
      icon: Database,
      description: 'Scalable, secure database with automatic backups',
      features: [
        'Multi-tenant data isolation',
        'Automatic daily backups',
        'Point-in-time recovery',
        'Serverless scaling',
        'Industry-standard security'
      ],
      status: 'active',
      color: 'text-blue-500'
    },
    {
      name: 'SendGrid',
      category: 'Email',
      icon: Plug,
      description: 'Reliable email delivery for estimates, contracts, and notifications',
      features: [
        'Estimate and contract delivery',
        'Payment reminders',
        'Project status updates',
        'Email tracking and analytics',
        'Custom email templates'
      ],
      status: 'active',
      color: 'text-[#1a82e2]'
    },
  ];

  const categories = Array.from(new Set(integrations.map(i => i.category)));

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-6">
              <Plug className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Powerful Integrations</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Connect with the{' '}
              <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Best Tools
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Owl Fence integrates with industry-leading platforms to give you the most powerful 
              construction management experience possible.
            </p>
          </div>
        </div>
      </section>

      {/* Integration Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {categories.map((category) => {
            const categoryIntegrations = integrations.filter(i => i.category === category);
            
            return (
              <div key={category} className="mb-16 last:mb-0">
                <div className="flex items-center gap-3 mb-8">
                  <div className="h-px bg-border flex-1" />
                  <h2 className="text-2xl font-bold">{category}</h2>
                  <div className="h-px bg-border flex-1" />
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryIntegrations.map((integration) => {
                    const Icon = integration.icon;
                    
                    return (
                      <Card 
                        key={integration.name}
                        className="border-2 hover:border-primary/50 transition-all"
                        data-testid={`integration-${integration.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between mb-4">
                            <div className={`h-12 w-12 rounded-lg bg-background border-2 border-border flex items-center justify-center ${integration.color}`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            {integration.status === 'premium' && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary">
                                Premium
                              </Badge>
                            )}
                            {integration.status === 'active' && (
                              <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                                Active
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl">{integration.name}</CardTitle>
                          <CardDescription>{integration.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {integration.features.slice(0, 4).map((feature, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                <span className="text-sm text-muted-foreground">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Integration Benefits */}
      <section className="py-16 bg-primary/5 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Why Our Integrations Matter
            </h2>

            <div className="grid md:grid-cols-2 gap-8">
              <Card data-testid="benefit-automatic-setup">
                <CardHeader>
                  <Sparkles className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Automatic Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Most integrations are pre-configured and ready to use. No complex API keys 
                    or technical setup required - just focus on your work.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="benefit-secure">
                <CardHeader>
                  <Shield className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Secure & Reliable</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    All integrations use industry-standard encryption and security protocols. 
                    Your data and your clients' data are always protected.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="benefit-updates">
                <CardHeader>
                  <Database className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Always Updated</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We maintain and update all integrations automatically. You always have 
                    access to the latest features and improvements.
                  </p>
                </CardContent>
              </Card>

              <Card data-testid="benefit-support">
                <CardHeader>
                  <Building2 className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Expert Support</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Our team helps with integration issues and optimization. We ensure everything 
                    works seamlessly together for your business.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              How Integrations Work
            </h2>

            <div className="space-y-8">
              <div className="flex gap-6" data-testid="step-1">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Sign Up</h3>
                  <p className="text-muted-foreground">
                    Create your Owl Fence account and choose your plan. All integrations are included 
                    based on your subscription tier.
                  </p>
                </div>
              </div>

              <div className="flex gap-6" data-testid="step-2">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Connect Services</h3>
                  <p className="text-muted-foreground">
                    For services like Stripe and QuickBooks, you'll connect your existing accounts 
                    with a simple OAuth flow. No technical knowledge required.
                  </p>
                </div>
              </div>

              <div className="flex gap-6" data-testid="step-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Start Working</h3>
                  <p className="text-muted-foreground">
                    That's it! All the powerful AI, payment processing, property verification, 
                    and accounting features work automatically in the background.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border/40 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Experience the Power of Integration
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start your free trial and get instant access to all integrations
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8" data-testid="button-cta-start-trial">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/features">
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-cta-features">
                  Explore Features
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              14-day trial • No credit card required
            </p>
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
                  <Link href="/features">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">Features</a>
                  </Link>
                </li>
                <li>
                  <Link href="/pricing">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">Pricing</a>
                  </Link>
                </li>
                <li>
                  <Link href="/integrations">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">Integrations</a>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about-owlfenc">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">About Us</a>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy-policy">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">Privacy Policy</a>
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">Terms of Service</a>
                  </Link>
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
            <p>© 2025 Owl Fence. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
