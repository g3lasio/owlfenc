import { useRoute, Link } from 'wouter';
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getArticleById, getRelatedArticles, helpCategories } from '@/data/help-articles';
import ReactMarkdown from 'react-markdown';

export default function HelpArticle() {
  const [, params] = useRoute('/support/help-center/article/:id');
  const articleId = params?.id || '';
  
  const article = getArticleById(articleId);
  const relatedArticles = getRelatedArticles(articleId);
  const category = helpCategories.find(cat => cat.id === article?.category);

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The article you're looking for doesn't exist.
          </p>
          <Link href="/support/help-center">
            <Button data-testid="button-back-help-center">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Help Center
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const Icon = article.icon;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/support/help-center" className="hover:text-foreground transition-colors">
          Help Center
        </Link>
        <ChevronRight className="h-4 w-4" />
        {category && (
          <>
            <span className="hover:text-foreground transition-colors cursor-pointer">
              {category.title}
            </span>
            <ChevronRight className="h-4 w-4" />
          </>
        )}
        <span className="text-foreground">{article.title}</span>
      </div>

      <div className="flex items-start justify-between">
        <Link href="/support/help-center">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-lg border">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
            <p className="text-lg text-muted-foreground">{article.description}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-8">
          <div 
            className="prose prose-slate dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-foreground
              prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-8 prose-h1:border-b prose-h1:pb-2
              prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-6
              prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
              prose-p:text-muted-foreground prose-p:leading-7
              prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-foreground prose-strong:font-semibold
              prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
              prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
              prose-li:text-muted-foreground prose-li:my-1
              prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
              prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg
              prose-hr:my-8 prose-hr:border-border
              prose-table:border-collapse prose-table:w-full
              prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2 prose-th:text-left
              prose-td:border prose-td:border-border prose-td:p-2"
            data-testid="article-content"
          >
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target={props.href?.startsWith('http') ? '_blank' : undefined} rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined} />
                ),
              }}
            >
              {article.content}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {relatedArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-3">
              {relatedArticles.map((related) => {
                const RelatedIcon = related.icon;
                return (
                  <Link key={related.id} href={`/support/help-center/article/${related.id}`}>
                    <div
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer border"
                      data-testid={`related-article-${related.id}`}
                    >
                      <RelatedIcon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2">{related.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {related.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg mb-1">Still need help?</h3>
            <p className="text-sm text-muted-foreground">
              Can't find what you're looking for? Our support team is here to help.
            </p>
          </div>
          <Link href="/support/get-support">
            <Button data-testid="button-contact-support">
              Contact Support
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
