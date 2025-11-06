import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PublicHeader from '@/components/layout/PublicHeader';
import { 
  Calculator, 
  FileText, 
  Shield, 
  CreditCard, 
  Users, 
  CheckCircle, 
  Hammer,
  TrendingUp,
  Zap,
  Building2,
  HardHat,
  Wrench,
  ArrowRight
} from 'lucide-react';

export default function PublicHome() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center space-x-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 mb-6">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI-Powered Construction Management</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Built for{' '}
              <span className="bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Contractors
              </span>
              <br />
              Who Build Better
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Complete construction management platform with AI-powered estimates, legal contracts, 
              property verification, and payment processing. Everything you need to win more jobs and grow your business.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8" data-testid="button-hero-start-trial">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-hero-view-pricing">
                  View Pricing
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              14-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Who This Is For Section */}
      <section className="py-20 border-b border-border/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Perfect for Construction Professionals
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you're building your first fence or managing a full construction company, 
              Owl Fence is designed specifically for your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="border-2 hover:border-primary/50 transition-colors" data-testid="card-fencing-contractors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <HardHat className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Fencing Contractors</CardTitle>
                <CardDescription>Wood, Vinyl, Chain Link Specialists</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Instant fence estimates with AI precision</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Material calculators for all fence types</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Professional contracts & digital signatures</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors" data-testid="card-general-contractors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>General Contractors</CardTitle>
                <CardDescription>Multi-Project Management</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Manage unlimited projects simultaneously</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Track payments & invoices centrally</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Property verification & permit advisors</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors" data-testid="card-subcontractors">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wrench className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>Subcontractors</CardTitle>
                <CardDescription>Specialized Trade Professionals</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Quick estimates to respond faster to GCs</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Legal defense with contractor protection</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">Secure payment processing with Stripe</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 border-b border-border/40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Stop juggling multiple tools. Owl Fence brings all your construction management needs into one powerful system
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card data-testid="feature-ai-estimates">
              <CardHeader>
                <Calculator className="h-10 w-10 text-primary mb-2" />
                <CardTitle>AI-Powered Estimates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Talk to Mervin, our AI assistant, to generate professional estimates in minutes. 
                  Supports wood, vinyl, and chain-link fencing with precise material calculations.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="feature-legal-defense">
              <CardHeader>
                <FileText className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Legal Defense</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Generate legally-binding contracts with contractor protection clauses. 
                  Digital signatures, automatic delivery, and professional templates included.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="feature-property-verification">
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Property Verification</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Verify property ownership before starting work. Integration with ATTOM Data 
                  to protect you from fraud and legal disputes.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="feature-payment-processing">
              <CardHeader>
                <CreditCard className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Payment Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Accept payments securely with Stripe integration. Track deposits, progress 
                  payments, and final payments all in one place.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="feature-project-management">
              <CardHeader>
                <Hammer className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Project Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Manage all your projects with timeline tracking, status updates, client notes, 
                  and file attachments. Keep everything organized.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="feature-permit-advisor">
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Permit Advisor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get guidance on permits and regulations specific to your area. 
                  Stay compliant and avoid costly mistakes.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Link href="/features">
              <Button size="lg" variant="outline" data-testid="button-explore-features">
                Explore All Features
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary/5 border-b border-border/40">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div data-testid="stat-time-saved">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">10x</div>
              <div className="text-lg font-semibold mb-1">Faster Estimates</div>
              <div className="text-sm text-muted-foreground">Generate quotes in minutes, not hours</div>
            </div>
            <div data-testid="stat-accuracy">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">98%</div>
              <div className="text-lg font-semibold mb-1">Calculation Accuracy</div>
              <div className="text-sm text-muted-foreground">AI-powered precision for materials & labor</div>
            </div>
            <div data-testid="stat-win-rate">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">+40%</div>
              <div className="text-lg font-semibold mb-1">More Jobs Won</div>
              <div className="text-sm text-muted-foreground">Professional proposals close more deals</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-b border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <TrendingUp className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Construction Business?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join contractors who are winning more jobs, saving time, and growing faster with Owl Fence
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8" data-testid="button-cta-start-trial">
                  Start Your Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="text-lg px-8" data-testid="button-cta-pricing">
                  See Pricing Plans
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • 14-day trial with full access
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
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">
                      Features
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/pricing">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">
                      Pricing
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/integrations">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">
                      Integrations
                    </a>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/about-owlfenc">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">
                      About Us
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/about-mervin">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">
                      About Mervin AI
                    </a>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy-policy">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">
                      Privacy Policy
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/terms-of-service">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">
                      Terms of Service
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/legal-policy">
                    <a className="text-muted-foreground hover:text-primary transition-colors text-sm">
                      Legal Policy
                    </a>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a 
                    href="mailto:mervin@owlfenc.com" 
                    className="text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
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
