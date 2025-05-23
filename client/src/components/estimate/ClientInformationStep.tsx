import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { User, Users, MapPin } from "lucide-react";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company?: string;
}

interface ClientInformationStepProps {
  clientData: Client;
  setClientData: (data: Client) => void;
  clients: Client[];
  showClientDialog: boolean;
  setShowClientDialog: (show: boolean) => void;
  newClientData: Partial<Client>;
  setNewClientData: (data: Partial<Client>) => void;
  onSaveNewClient: () => void;
}

export function ClientInformationStep({
  clientData,
  setClientData,
  clients,
  showClientDialog,
  setShowClientDialog,
  newClientData,
  setNewClientData,
  onSaveNewClient
}: ClientInformationStepProps) {
  const handleSelectExistingClient = (client: Client) => {
    setClientData(client);
    setShowClientDialog(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Client Information
          </CardTitle>
          
          <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select from Clients
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Select or Add Client</DialogTitle>
                <DialogDescription>
                  Choose an existing client or add a new one
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {clients.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">Existing Clients</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {clients.map((client) => (
                        <div 
                          key={client.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => handleSelectExistingClient(client)}
                        >
                          <div className="font-medium">{client.name}</div>
                          <div className="text-sm text-gray-600">{client.email}</div>
                          {client.company && (
                            <div className="text-sm text-gray-500">{client.company}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Add New Client</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="new-client-name">Name *</Label>
                      <Input
                        id="new-client-name"
                        value={newClientData.name || ''}
                        onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                        placeholder="Client full name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="new-client-email">Email *</Label>
                      <Input
                        id="new-client-email"
                        type="email"
                        value={newClientData.email || ''}
                        onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                        placeholder="client@example.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="new-client-phone">Phone</Label>
                      <Input
                        id="new-client-phone"
                        value={newClientData.phone || ''}
                        onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="new-client-company">Company</Label>
                      <Input
                        id="new-client-company"
                        value={newClientData.company || ''}
                        onChange={(e) => setNewClientData({...newClientData, company: e.target.value})}
                        placeholder="Company name (optional)"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="new-client-address">Address</Label>
                      <Textarea
                        id="new-client-address"
                        value={newClientData.address || ''}
                        onChange={(e) => setNewClientData({...newClientData, address: e.target.value})}
                        placeholder="Client address"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowClientDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={onSaveNewClient}
                  disabled={!newClientData.name || !newClientData.email}
                >
                  Save Client
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="client-name">Client Name *</Label>
            <Input
              id="client-name"
              value={clientData.name}
              onChange={(e) => setClientData({...clientData, name: e.target.value})}
              placeholder="Enter client name"
            />
          </div>
          
          <div>
            <Label htmlFor="client-email">Email *</Label>
            <Input
              id="client-email"
              type="email"
              value={clientData.email}
              onChange={(e) => setClientData({...clientData, email: e.target.value})}
              placeholder="client@example.com"
            />
          </div>
          
          <div>
            <Label htmlFor="client-phone">Phone</Label>
            <Input
              id="client-phone"
              value={clientData.phone}
              onChange={(e) => setClientData({...clientData, phone: e.target.value})}
              placeholder="(555) 123-4567"
            />
          </div>
          
          <div>
            <Label htmlFor="client-company">Company</Label>
            <Input
              id="client-company"
              value={clientData.company || ''}
              onChange={(e) => setClientData({...clientData, company: e.target.value})}
              placeholder="Company name (optional)"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="client-address">Address</Label>
          <div className="flex gap-2">
            <Textarea
              id="client-address"
              value={clientData.address}
              onChange={(e) => setClientData({...clientData, address: e.target.value})}
              placeholder="Enter project address"
              rows={3}
              className="flex-1"
            />
            <Button variant="outline" size="sm" className="px-3">
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}