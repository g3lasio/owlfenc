import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/">
            <a className="flex items-center space-x-2">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
                Owl Fence
              </div>
            </a>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/features">
              <a className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Features
              </a>
            </Link>
            <Link href="/pricing">
              <a className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Pricing
              </a>
            </Link>
            <Link href="/integrations">
              <a className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Integrations
              </a>
            </Link>
            <Link href="/about-owlfenc">
              <a className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                About
              </a>
            </Link>
            <div className="flex items-center space-x-3 ml-4">
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="button-login">
                  Log In
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" data-testid="button-signup">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border/40">
            <div className="flex flex-col space-y-3">
              <Link href="/features">
                <a className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">
                  Features
                </a>
              </Link>
              <Link href="/pricing">
                <a className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">
                  Pricing
                </a>
              </Link>
              <Link href="/integrations">
                <a className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">
                  Integrations
                </a>
              </Link>
              <Link href="/about-owlfenc">
                <a className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors py-2">
                  About
                </a>
              </Link>
              <div className="pt-3 border-t border-border/40 flex flex-col space-y-2">
                <Link href="/login">
                  <Button variant="outline" className="w-full" data-testid="button-login-mobile">
                    Log In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button className="w-full" data-testid="button-signup-mobile">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
