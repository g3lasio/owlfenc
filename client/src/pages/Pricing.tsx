import PublicHeader from '@/components/layout/PublicHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import {
  Check,
  X,
  ArrowRight,
  Sparkles,
  Star,
  Zap,
  Crown
} from 'lucide-react';

export default function Pricing() {
  const plans = [
    {
      id: 5,
      name: 'Primo Chambeador',
      code: 'PRIMO_CHAMBEADOR',
      motto: 'Ningún trabajo es pequeño cuando tu espíritu es grande',
      price: 0,
      yearlyPrice: 0,
      popular: false,
      icon: Sparkles,
      description: 'Perfect for getting started',
      features: [
        { name: '5 basic estimates per month', included: true, note: 'With watermark' },
        { name: '1 AI estimate per month', included: true, note: 'With watermark' },
        { name: '3 DeepSearch queries', included: true },
        { name: 'Legal contracts', included: false },
        { name: 'Property verification', included: false },
        { name: 'Project management', included: false },
        { name: 'Invoicing', included: false },
        { name: 'Payment tracking', included: false },
        { name: 'Permit advisor', included: false },
        { name: 'Community support', included: true },
      ],
      cta: 'Get Started Free',
      ctaVariant: 'outline' as const,
    },
    {
      id: 9,
      name: 'Mero Patrón',
      code: 'mero_patron',
      motto: 'Para contratistas profesionales',
      price: 49.99,
      yearlyPrice: 499.90,
      popular: true,
      icon: Star,
      description: 'Most popular for growing contractors',
      features: [
        { name: '50 basic estimates per month', included: true, note: 'No watermark' },
        { name: '20 AI estimates per month', included: true, note: 'No watermark' },
        { name: '50 DeepSearch queries', included: true },
        { name: '50 legal contracts per month', included: true },
        { name: '15 property verifications', included: true },
        { name: 'Unlimited projects', included: true },
        { name: 'Unlimited invoicing', included: true },
        { name: 'Basic payment tracking', included: true },
        { name: '10 permit advisor queries', included: true },
        { name: 'Email support', included: true },
      ],
      cta: 'Start Free Trial',
      ctaVariant: 'default' as const,
    },
    {
      id: 6,
      name: 'Master Contractor',
      code: 'MASTER_CONTRACTOR',
      motto: 'Sin límites para profesionales',
      price: 99.99,
      yearlyPrice: 999.90,
      popular: false,
      icon: Crown,
      description: 'Unlimited everything for professionals',
      features: [
        { name: 'Unlimited basic estimates', included: true, note: 'No watermark' },
        { name: 'Unlimited AI estimates', included: true, note: 'No watermark' },
        { name: 'Unlimited DeepSearch', included: true },
        { name: 'Unlimited legal contracts', included: true },
        { name: 'Unlimited property verifications', included: true },
        { name: 'Unlimited projects', included: true },
        { name: 'Unlimited invoicing', included: true },
        { name: 'Pro payment tracking', included: true },
        { name: 'Unlimited permit advisor', included: true },
        { name: 'Priority support', included: true },
        { name: 'QuickBooks integration', included: true },
        { name: 'Advanced analytics', included: true },
      ],
      cta: 'Start Free Trial',
      ctaVariant: 'default' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-6">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Simple, Transparent Pricing</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Choose the Perfect Plan for{' '}
              <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Your Business
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8">
              Start with a 14-day free trial. No credit card required. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <Card 
                  key={plan.id}
                  className={`relative ${
                    plan.popular 
                      ? 'border-2 border-primary shadow-lg scale-105' 
                      : 'border-2 hover:border-primary/50'
                  } transition-all`}
                  data-testid={`pricing-card-${plan.code}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-8">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                    <CardDescription className="italic text-sm">
                      "{plan.motto}"
                    </CardDescription>
                    <div className="mt-4">
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold">
                          ${plan.price}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                      {plan.yearlyPrice > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          or ${plan.yearlyPrice}/year <span className="text-primary">(save 2 months)</span>
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          {feature.included ? (
                            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <span className={`text-sm ${!feature.included && 'text-muted-foreground line-through'}`}>
                            {feature.name}
                            {feature.note && (
                              <span className="text-xs text-muted-foreground ml-1">({feature.note})</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Link href="/signup" className="w-full">
                      <Button 
                        className="w-full" 
                        variant={plan.ctaVariant}
                        size="lg"
                        data-testid={`button-select-${plan.code}`}
                      >
                        {plan.cta}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              All plans include a 14-day free trial with full access to features
            </p>
          </div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 bg-primary/5 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Detailed Feature Comparison
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse" data-testid="table-feature-comparison">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    <th className="text-center p-4 font-semibold">Primo Chambeador</th>
                    <th className="text-center p-4 font-semibold bg-primary/10">Mero Patrón</th>
                    <th className="text-center p-4 font-semibold">Master Contractor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/40">
                    <td className="p-4 font-medium">Monthly Price</td>
                    <td className="p-4 text-center">Free</td>
                    <td className="p-4 text-center bg-primary/5">$49.99</td>
                    <td className="p-4 text-center">$99.99</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">Basic Estimates</td>
                    <td className="p-4 text-center text-sm">5/month*</td>
                    <td className="p-4 text-center bg-primary/5">50/month</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">AI Estimates (Mervin)</td>
                    <td className="p-4 text-center text-sm">1/month*</td>
                    <td className="p-4 text-center bg-primary/5">20/month</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">DeepSearch Material Intelligence</td>
                    <td className="p-4 text-center">3/month</td>
                    <td className="p-4 text-center bg-primary/5">50/month</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">Legal Contracts</td>
                    <td className="p-4 text-center"><X className="h-5 w-5 text-muted-foreground inline" /></td>
                    <td className="p-4 text-center bg-primary/5">50/month</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">Property Verification</td>
                    <td className="p-4 text-center"><X className="h-5 w-5 text-muted-foreground inline" /></td>
                    <td className="p-4 text-center bg-primary/5">15/month</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">Permit Advisor</td>
                    <td className="p-4 text-center"><X className="h-5 w-5 text-muted-foreground inline" /></td>
                    <td className="p-4 text-center bg-primary/5">10/month</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">Project Management</td>
                    <td className="p-4 text-center"><X className="h-5 w-5 text-muted-foreground inline" /></td>
                    <td className="p-4 text-center bg-primary/5"><Check className="h-5 w-5 text-primary inline" /></td>
                    <td className="p-4 text-center"><Check className="h-5 w-5 text-primary inline" /></td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">Invoicing</td>
                    <td className="p-4 text-center"><X className="h-5 w-5 text-muted-foreground inline" /></td>
                    <td className="p-4 text-center bg-primary/5">Unlimited</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">Payment Processing</td>
                    <td className="p-4 text-center"><X className="h-5 w-5 text-muted-foreground inline" /></td>
                    <td className="p-4 text-center bg-primary/5">Basic</td>
                    <td className="p-4 text-center">Pro</td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">QuickBooks Integration</td>
                    <td className="p-4 text-center"><X className="h-5 w-5 text-muted-foreground inline" /></td>
                    <td className="p-4 text-center bg-primary/5"><X className="h-5 w-5 text-muted-foreground inline" /></td>
                    <td className="p-4 text-center"><Check className="h-5 w-5 text-primary inline" /></td>
                  </tr>
                  <tr className="border-b border-border/40">
                    <td className="p-4">Watermark on Estimates</td>
                    <td className="p-4 text-center">Yes</td>
                    <td className="p-4 text-center bg-primary/5">No</td>
                    <td className="p-4 text-center">No</td>
                  </tr>
                  <tr>
                    <td className="p-4">Support</td>
                    <td className="p-4 text-center text-sm">Community</td>
                    <td className="p-4 text-center bg-primary/5">Email</td>
                    <td className="p-4 text-center">Priority</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-6">
              * Estimates on free plan include watermark
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <div data-testid="faq-trial">
                <h3 className="font-semibold text-lg mb-2">How does the free trial work?</h3>
                <p className="text-muted-foreground">
                  Sign up for any paid plan and get 14 days of full access with no credit card required. 
                  You can cancel anytime during the trial period.
                </p>
              </div>

              <div data-testid="faq-change-plans">
                <h3 className="font-semibold text-lg mb-2">Can I change plans later?</h3>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                  and we'll prorate any charges or credits.
                </p>
              </div>

              <div data-testid="faq-payment">
                <h3 className="font-semibold text-lg mb-2">What payment methods do you accept?</h3>
                <p className="text-muted-foreground">
                  We accept all major credit cards (Visa, MasterCard, American Express, Discover) and 
                  ACH bank transfers through our secure Stripe integration.
                </p>
              </div>

              <div data-testid="faq-limits">
                <h3 className="font-semibold text-lg mb-2">What happens if I exceed my monthly limits?</h3>
                <p className="text-muted-foreground">
                  If you reach your monthly limit on any feature, you'll be prompted to upgrade to a higher plan. 
                  Your existing data is never deleted, but you won't be able to create new items until the next billing cycle or upgrade.
                </p>
              </div>

              <div data-testid="faq-cancel">
                <h3 className="font-semibold text-lg mb-2">Can I cancel anytime?</h3>
                <p className="text-muted-foreground">
                  Absolutely. You can cancel your subscription at any time from your account settings. 
                  You'll continue to have access until the end of your billing period.
                </p>
              </div>

              <div data-testid="faq-data">
                <h3 className="font-semibold text-lg mb-2">What happens to my data if I cancel?</h3>
                <p className="text-muted-foreground">
                  Your data remains accessible in read-only mode for 30 days after cancellation. 
                  You can export all your data at any time before final deletion.
                </p>
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
              Ready to Grow Your Business?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Start with a 14-day free trial. No credit card required.
            </p>
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8" data-testid="button-cta-start-trial">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Questions? <a href="mailto:mervin@owlfenc.com" className="text-primary hover:underline">Contact us</a>
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
