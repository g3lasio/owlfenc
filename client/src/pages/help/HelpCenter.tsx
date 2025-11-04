import { useState } from 'react';
import { Link } from 'wouter';
import { 
  Search, 
  BookOpen, 
  MessageSquare, 
  ChevronRight 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { helpCategories, helpArticles } from '@/data/help-articles';

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = helpCategories;
  const popularArticlesData = helpArticles.slice(0, 6);
  
  const filteredCategories = searchQuery.trim()
    ? helpCategories.map(cat => ({
        ...cat,
        articles: cat.articles.filter(
          article =>
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(cat => cat.articles.length > 0)
    : helpCategories;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          How can we help you?
        </h1>
        <p className="text-muted-foreground text-lg">
          Search our knowledge base or browse categories below
        </p>
        
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            data-testid="input-search-help"
            type="text"
            placeholder="Search for help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {!searchQuery && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-lg border">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Need personalized help?
              </h2>
              <p className="text-muted-foreground">
                Can't find what you're looking for? Submit a support ticket and our team will assist you.
              </p>
            </div>
            <Link href="/support/get-support">
              <Button data-testid="button-get-support" className="whitespace-nowrap">
                Get Support
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!searchQuery && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Popular Articles</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularArticlesData.map((article) => {
              const Icon = article.icon;
              return (
                <Link key={article.id} href={`/support/help-center/article/${article.id}`}>
                  <Card 
                    className="hover:shadow-lg transition-shadow cursor-pointer h-full"
                    data-testid={`card-article-${article.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{article.title}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {article.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold mb-6">
          {searchQuery ? 'Search Results' : 'Browse by Category'}
        </h2>
        <div className="space-y-6">
          {filteredCategories.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <Card key={category.id} data-testid={`category-${category.id}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                      <CategoryIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {category.articles.map((article) => {
                      const ArticleIcon = article.icon;
                      return (
                        <Link key={article.id} href={`/support/help-center/article/${article.id}`}>
                          <div
                            data-testid={`article-${article.id}`}
                            className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                          >
                            <ArticleIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{article.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {article.description}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {searchQuery && filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No articles found</h3>
          <p className="text-muted-foreground mb-6">
            We couldn't find any articles matching "{searchQuery}"
          </p>
          <Link href="/support/get-support">
            <Button data-testid="button-contact-support">
              Contact Support
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
