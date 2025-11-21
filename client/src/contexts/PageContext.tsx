import { createContext, useContext, useState, ReactNode } from 'react';

export type PageContextType =
  | { type: 'estimate-editor'; estimateId?: string; step?: 'client' | 'materials' | 'preview' | 'complete' }
  | { type: 'estimate-list'; filter?: string }
  | { type: 'contract-editor'; contractId?: string; status?: 'draft' | 'sent' | 'signed' | 'completed' }
  | { type: 'contract-list'; filter?: string }
  | { type: 'permit-advisor'; projectId?: string; step?: 'address' | 'type' | 'description' | 'results' }
  | { type: 'property-verifier'; address?: string; step?: 'search' | 'results' }
  | { type: 'clients-list'; filter?: string }
  | { type: 'materials-list'; filter?: string }
  | { type: 'projects-list'; filter?: string }
  | { type: 'dashboard' }
  | { type: 'mervin-chat' }
  | { type: 'none' };

interface PageContextState {
  pageContext: PageContextType;
  setPageContext: (context: PageContextType) => void;
  clearPageContext: () => void;
}

const PageContext = createContext<PageContextState | undefined>(undefined);

export function PageContextProvider({ children }: { children: ReactNode }) {
  const [pageContext, setPageContextState] = useState<PageContextType>({ type: 'none' });

  const setPageContext = (context: PageContextType) => {
    console.log('👁️ [PAGE-CONTEXT] Updated:', context);
    setPageContextState(context);
  };

  const clearPageContext = () => {
    setPageContextState({ type: 'none' });
  };

  return (
    <PageContext.Provider value={{ pageContext, setPageContext, clearPageContext }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error('usePageContext must be used within a PageContextProvider');
  }
  return context;
}
