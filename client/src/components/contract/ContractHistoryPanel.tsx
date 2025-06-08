import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { contractHistoryService, ContractHistoryEntry } from '@/services/contractHistoryService';
import { useAuth } from '@/hooks/use-auth';
import { 
  Server, 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  DollarSign,
  User,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Archive
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ContractHistoryPanelProps {
  children: React.ReactNode;
}

export function ContractHistoryPanel({ children }: ContractHistoryPanelProps) {
  const [contracts, setContracts] = useState<ContractHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContracts, setFilteredContracts] = useState<ContractHistoryEntry[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    drafts: 0,
    processing: 0,
    totalValue: 0
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

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

  const downloadContract = async (contract: ContractHistoryEntry) => {
    if (!contract.pdfUrl) {
      toast({
        title: "Download Unavailable",
        description: "PDF not available for this contract.",
        variant: "destructive",
      });
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = contract.pdfUrl;
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

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="p-2 hover:bg-cyan-500/10 hover:text-cyan-400 transition-all duration-300"
          onClick={loadContractHistory}
        >
          <Server className="h-5 w-5 text-cyan-400" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:w-[800px] bg-slate-900 border-cyan-500/20">
        <SheetHeader>
          <SheetTitle className="text-cyan-400 flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Contract History Archive
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Access and manage your generated contracts and drafts
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-cyan-500/20">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-cyan-400">{stats.total}</div>
                <div className="text-xs text-gray-400">Total Contracts</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-green-500/20">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
                <div className="text-xs text-gray-400">Completed</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-yellow-500/20">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-yellow-400">{stats.drafts}</div>
                <div className="text-xs text-gray-400">Drafts</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-blue-500/20">
              <CardContent className="p-3">
                <div className="text-2xl font-bold text-blue-400">${stats.totalValue.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Total Value</div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search contracts by client, project type, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-slate-800 border-cyan-500/20 text-white placeholder:text-gray-400"
            />
          </div>

          {/* Contract List */}
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                <span className="ml-2 text-gray-400">Loading contracts...</span>
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {contracts.length === 0 ? 'No contracts generated yet' : 'No contracts match your search'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredContracts.map((contract) => (
                  <Card key={contract.id} className="bg-slate-800 border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(contract.status)}
                            <h3 className="font-semibold text-white">{contract.clientName}</h3>
                            <Badge className={`text-xs ${getStatusColor(contract.status)}`}>
                              {contract.status}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-400 space-y-1">
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {contract.projectType}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {contract.contractData.project.location}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${contract.contractData.financials.total.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(contract.createdAt, { addSuffix: true })}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          {contract.pdfUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadContract(contract)}
                              className="border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/10"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                          )}
                          
                          {contract.pageCount && (
                            <Badge variant="outline" className="text-xs border-cyan-500/20 text-cyan-400">
                              {contract.pageCount} pages
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}