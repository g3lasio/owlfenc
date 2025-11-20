import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/hooks/use-auth';

/**
 * ChatLayoutController
 * 
 * Maps routes to chat layout modes without rendering UI.
 * Controls when Mervin appears in full, sidebar, or closed modes.
 */
export function ChatLayoutController() {
  const [location] = useLocation();
  const { user, loading } = useAuth();
  const { setLayoutMode } = useChat();

  useEffect(() => {
    // Wait for auth to stabilize
    if (loading) return;

    // Define auth/public pages where chat should be closed
    const isAuthPage =
      location === '/login' ||
      location === '/signup' ||
      location === '/recuperar-password' ||
      location === '/reset-password' ||
      location === '/login/email-link-callback';

    const isPublicPage =
      location === '/about-owlfenc' ||
      location === '/about-mervin' ||
      location === '/legal-policy' ||
      location === '/privacy-policy' ||
      location === '/terms-of-service';

    // Determine layout mode based on route and auth status
    if (!user || isAuthPage || isPublicPage) {
      // Not authenticated or on public/auth pages → close chat
      setLayoutMode('closed');
    } else if (location === '/mervin') {
      // On /mervin route → full screen mode
      setLayoutMode('full');
    } else if (location === '/' || location === '/home' || location === '/dashboard') {
      // On home/dashboard → close chat (show home content)
      setLayoutMode('closed');
    } else {
      // All other protected pages → sidebar mode
      setLayoutMode('sidebar');
    }
  }, [location, user, loading, setLayoutMode]);

  // This is a controller component - renders nothing
  return null;
}
