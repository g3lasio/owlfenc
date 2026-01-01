import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  ExternalLink,
  Sparkles,
  FileText,
  MessageSquare,
  ArrowRight
} from 'lucide-react';

export default function HelpCenter() {
  // Redirect to docs page after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      window.open('https://owllanding.replit.app/docs', '_blank');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl">
            <BookOpen className="h-16 w-16 text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Documentation & Help Center
        </h1>
        
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          We've moved our documentation to a dedicated site for a better experience. 
          Access comprehensive guides, tutorials, and resources.
        </p>
      </div>

      {/* Main Redirect Card */}
      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-pulse" />
          </div>
          <CardTitle className="text-2xl">Visit Our Documentation Site</CardTitle>
          <CardDescription className="text-base">
            You'll be automatically redirected in a few seconds, or click the button below
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg text-lg px-8 py-6"
            onClick={() => window.open('https://owllanding.replit.app/docs', '_blank')}
          >
            <ExternalLink className="mr-2 h-5 w-5" />
            Go to Documentation
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <div className="pt-4">
            <p className="text-sm text-muted-foreground">
              <strong>URL:</strong>{' '}
              <a 
                href="https://owllanding.replit.app/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                https://owllanding.replit.app/docs
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">Comprehensive Guides</CardTitle>
            </div>
            <CardDescription>
              Step-by-step tutorials for all features including estimates, contracts, property verification, and more
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl">What's New</CardTitle>
            </div>
            <CardDescription>
              Stay updated with the latest features, improvements, and platform updates
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl">Searchable Documentation</CardTitle>
            </div>
            <CardDescription>
              Quickly find answers with our powerful search feature and organized categories
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <MessageSquare className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-xl">Direct Support Access</CardTitle>
            </div>
            <CardDescription>
              Can't find what you need? Get personalized help from our support team
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Support CTA */}
      <Card className="border-2 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="py-8 text-center">
          <h3 className="text-xl font-semibold mb-2">Need Immediate Help?</h3>
          <p className="text-muted-foreground mb-4">
            Our support team is here to assist you with any questions
          </p>
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => window.location.href = '/support/get-support'}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Contact Support
          </Button>
        </CardContent>
      </Card>

      {/* Info Note */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          💡 <strong>Tip:</strong> Bookmark the documentation site for quick access to guides and updates
        </p>
      </div>
    </div>
  );
}
