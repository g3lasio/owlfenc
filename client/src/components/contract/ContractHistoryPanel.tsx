import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { contractHistoryService, ContractHistoryEntry, SignatureRequirement } from '@/services/contractHistoryService';
import { auth } from '@/lib/firebase';
import { getTemplateBadgeConfig, inferRequiredSigners, getDetailedTemplateId } from '@/hooks/useContractsStore';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { 
  Server, 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  DollarSign,
  UserIcon,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Archive,
  Edit3,
  Link,
  Share2,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Users, User, FileCheck } from 'lucide-react';

// Template-aware signer status helper
function getSignerStatusInfo(contract: ContractHistoryEntry): { 
  label: string; 
  icon: React.ReactNode; 
  color: string;
  isComplete: boolean;
} {
  const requiredSigners = inferRequiredSigners(contract.templateId, contract.requiredSigners);
  const status = contract.status;
  
  if (requiredSigners === 'none') {
    const hasDoc = !!(contract.pdfUrl || contract.permanentUrl);
    return {
      label: hasDoc ? 'Generated' : 'Pending',
      icon: <FileCheck className="h-3 w-3" />,
      color: hasDoc ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20',
      isComplete: hasDoc
    };
  }
  
  if (requiredSigners === 'single') {
    const signed = status === 'contractor_signed' || status === 'client_signed' || status === 'completed' || status === 'both_signed';
    return {
      label: signed ? '1/1 Signed' : '0/1 Pending',
      icon: <User className="h-3 w-3" />,
      color: signed ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      isComplete: signed
    };
  }
  
  // Dual signature
  const contractorSigned = status === 'contractor_signed' || status === 'both_signed' || status === 'completed';
  const clientSigned = status === 'client_signed' || status === 'both_signed' || status === 'completed';
  const count = (contractorSigned ? 1 : 0) + (clientSigned ? 1 : 0);
  const isComplete = count === 2;
  
  return {
    label: `${count}/2 Signed`,
    icon: <Users className="h-3 w-3" />,
    color: isComplete 
      ? 'bg-green-500/10 text-green-400 border-green-500/20' 
      : count > 0 
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    isComplete
  };
}

interface ContractHistoryPanelProps {
  children: React.ReactNode;
  onEditContract?: (contract: ContractHistoryEntry) => void;
}

export function ContractHistoryPanel({ children, onEditContract }: ContractHistoryPanelProps) {
  const [contracts, setContracts] = useState<ContractHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContracts, setFilteredContracts] = useState<ContractHistoryEntry[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    drafts: 0,
    processing: 0,
    inProgress: 0,
    totalValue: 0
  });
  
  const { toast } = useToast();

  // Listen to authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Load contract history when panel opens
  const loadContractHistory = async () => {
    if (!user?.uid) return;
    
    setIsLoading(true);
    try {
      const [historyData, statsData] = await Promise.all([
        contractHistoryService.getContractHistory(user.uid),
        contractHistoryService.getContractStats(user.uid)
      ]);
      
      setContracts(historyData);
      setFilteredContracts(historyData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading contract history:', error);
      toast({
        title: "Error Loading History",
        description: "Failed to load contract history. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter contracts based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredContracts(contracts);
    } else {
      const filtered = contracts.filter(contract => 
        contract.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.projectType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.contractData.project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredContracts(filtered);
    }
  }, [searchTerm, contracts]);

  const getStatusIcon = (status: ContractHistoryEntry['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'draft':
        return <FileText className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ContractHistoryEntry['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'processing':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  // Get template badge info using centralized config (with lien waiver type detection)
  const getTemplateBadge = (contract: ContractHistoryEntry) => {
    const templateId = (contract as any).templateId;
    const config = getTemplateBadgeConfig(templateId, contract.contractData);
    return config;
  };

  // Get signer status indicators based on contract status and signature requirements
  const getSignerStatus = (contract: ContractHistoryEntry): { contractor: boolean; client: boolean; required: SignatureRequirement } => {
    const status = contract.status;
    const required = inferRequiredSigners(contract.templateId, contract.requiredSigners);
    
    let contractor = false;
    let client = false;
    
    if (status === 'completed' || status === 'both_signed') {
      contractor = true;
      client = required === 'dual' ? true : false;
    } else if (status === 'contractor_signed') {
      contractor = true;
    } else if (status === 'client_signed') {
      client = true;
    }
    
    return { contractor, client, required };
  };

  const downloadContract = async (contract: ContractHistoryEntry) => {
    const pdfUrl = contract.pdfUrl || contract.permanentUrl;
    if (!pdfUrl) {
      toast({
        title: "Download Unavailable",
        description: "PDF not available for this contract.",
        variant: "destructive",
      });
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Contract_${contract.clientName.replace(/\s+/g, '_')}_${contract.contractId}.pdf`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: `Contract for ${contract.clientName} is downloading.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download contract. Please try again.",
        variant: "destructive",
      });
    }
  };

  const editContract = (contract: ContractHistoryEntry) => {
    if (onEditContract) {
      // Close the history panel automatically
      setIsOpen(false);
      onEditContract(contract);
      toast({
        title: "Opening Editor",
        description: `Opening contract editor for ${contract.clientName}.`,
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="p-2 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-300"
          onClick={() => {
            setIsOpen(true);
            loadContractHistory();
          }}
        >
          <Server className="h-5 w-5 text-cyan-400" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[90vw] md:w-[600px] lg:w-[800px] max-w-[95vw] bg-slate-900 border-cyan-500/20">
        <SheetHeader>
          <SheetTitle className="text-cyan-400 flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Contract History Archive
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Access and manage your generated contracts and drafts
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {/* Ultra-Compact Stats Row */}
          <div className="grid grid-cols-4 gap-1">
            <div className="bg-slate-800/50 border border-cyan-500/20 rounded p-1.5 text-center min-w-0">
              <div className="text-sm font-bold text-cyan-400">{stats.total}</div>
              <div className="text-xs text-gray-500 truncate">Total</div>
            </div>
            <div className="bg-slate-800/50 border border-green-500/20 rounded p-1.5 text-center min-w-0">
              <div className="text-sm font-bold text-green-400">{stats.completed}</div>
              <div className="text-xs text-gray-500 truncate">Done</div>
            </div>
            <div className="bg-slate-800/50 border border-yellow-500/20 rounded p-1.5 text-center min-w-0">
              <div className="text-sm font-bold text-yellow-400">{stats.drafts}</div>
              <div className="text-xs text-gray-500 truncate">Draft</div>
            </div>
            <div className="bg-slate-800/50 border border-blue-500/20 rounded p-1.5 text-center min-w-0">
              <div className="text-xs font-bold text-blue-400 truncate">
                ${stats.totalValue > 999 ? `${(stats.totalValue/1000).toFixed(0)}k` : stats.totalValue}
              </div>
              <div className="text-xs text-gray-500 truncate">Value</div>
            </div>
          </div>

          {/* Compact Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search by client, type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm bg-slate-800 border-cyan-500/20 text-white placeholder:text-gray-400"
            />
          </div>

          {/* Contract List - Ultra Compact */}
          <ScrollArea className="h-[450px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-cyan-400"></div>
                <span className="ml-2 text-gray-400 text-sm">Loading...</span>
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {contracts.length === 0 ? 'No contracts generated yet' : 'No contracts match your search'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContracts.map((contract) => (
                  <div key={contract.id} className="bg-slate-800/50 border border-cyan-500/20 hover:border-cyan-400/40 rounded-lg p-2 transition-all duration-300">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {getStatusIcon(contract.status)}
                          <span className="font-medium text-white text-sm truncate">
                            {contract.clientName}
                          </span>
                          {/* Document Type Badge - Clear visual identification */}
                          {(() => {
                            const badge = getTemplateBadge(contract);
                            return (
                              <Badge 
                                variant="outline" 
                                className={`text-[10px] ${badge.color} px-1.5 py-0 h-4 font-medium whitespace-nowrap`}
                                data-testid={`template-badge-${contract.id}`}
                              >
                                {badge.label}
                              </Badge>
                            );
                          })()}
                          <Badge className={`text-xs ${getStatusColor(contract.status)} px-1.5 py-0.5`}>
                            {contract.status}
                          </Badge>
                          {/* Signer Status Indicators */}
                          {(() => {
                            const signerStatus = getSignerStatus(contract);
                            if (signerStatus.required === 'none') return null;
                            return (
                              <div className="flex items-center gap-0.5 text-[10px]" data-testid={`signer-status-${contract.id}`}>
                                <span 
                                  className={`px-1 rounded ${signerStatus.contractor ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500'}`}
                                  title={signerStatus.contractor ? 'Contractor signed' : 'Contractor pending'}
                                >
                                  C{signerStatus.contractor ? '✓' : '○'}
                                </span>
                                {signerStatus.required === 'dual' && (
                                  <span 
                                    className={`px-1 rounded ${signerStatus.client ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-500'}`}
                                    title={signerStatus.client ? 'Client signed' : 'Client pending'}
                                  >
                                    Cl{signerStatus.client ? '✓' : '○'}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                          <div className="flex items-center gap-1 truncate">
                            <FileText className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{contract.projectType}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <DollarSign className="h-3 w-3 flex-shrink-0" />
                            <span className="font-mono truncate">${contract.contractData.financials.total.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate col-span-2">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{contract.contractData.project.location}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span>{formatDistanceToNow(contract.createdAt, { addSuffix: true })}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 items-end">
                        <div className="flex gap-1">
                          {/* Links de Firma */}
                          {(contract.status === 'draft' || contract.status === 'in_progress') && contract.contractorSignUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(contract.contractorSignUrl!);
                                toast({
                                  title: "Link Copiado",
                                  description: "Link de firma del contratista copiado",
                                });
                              }}
                              className="h-7 px-2 border-blue-500/20 hover:border-blue-400 hover:bg-blue-500/10 text-xs"
                              title="Copiar link de contratista"
                            >
                              <Link className="h-3 w-3" />
                            </Button>
                          )}
                          {(contract.status === 'draft' || contract.status === 'in_progress' || contract.status === 'contractor_signed') && contract.clientSignUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                navigator.clipboard.writeText(contract.clientSignUrl!);
                                toast({
                                  title: "Link Copiado",
                                  description: "Link de firma del cliente copiado",
                                });
                              }}
                              className="h-7 px-2 border-purple-500/20 hover:border-purple-400 hover:bg-purple-500/10 text-xs"
                              title="Copiar link de cliente"
                            >
                              <Share2 className="h-3 w-3" />
                            </Button>
                          )}
                          
                          {/* Edit Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editContract(contract)}
                            className="h-7 px-2 border-orange-500/20 hover:border-orange-400 hover:bg-orange-500/10 text-xs"
                            title="Edit Contract"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          
                          {/* Download Button */}
                          {(contract.pdfUrl || contract.permanentUrl) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadContract(contract)}
                              className="h-7 px-2 border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/10 text-xs"
                              title="Download PDF"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        
                        {contract.pageCount && (
                          <Badge variant="outline" className="text-xs border-cyan-500/20 text-cyan-400 h-5 px-1">
                            {contract.pageCount}p
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}