import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wrench, PlusCircle, Edit3, Trash2, DollarSign, Package, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Material {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  category?: string;
}

interface Labor {
  id: string;
  description: string;
  hours: number;
  rate: number;
  total: number;
}

interface MaterialsAndCostsStepProps {
  materials: Material[];
  setMaterials: (materials: Material[]) => void;
  labor: Labor[];
  setLabor: (labor: Labor[]) => void;
  estimateData: any;
  setEstimateData: (data: any) => void;
  showAddMaterialDialog: boolean;
  setShowAddMaterialDialog: (show: boolean) => void;
  showMaterialSearchDialog: boolean;
  setShowMaterialSearchDialog: (show: boolean) => void;
  newMaterial: Partial<Material>;
  setNewMaterial: (material: Partial<Material>) => void;
  onSaveNewMaterial: () => void;
  inventoryMaterials: any;
}

export function MaterialsAndCostsStep({
  materials,
  setMaterials,
  labor,
  setLabor,
  estimateData,
  setEstimateData,
  showAddMaterialDialog,
  setShowAddMaterialDialog,
  showMaterialSearchDialog,
  setShowMaterialSearchDialog,
  newMaterial,
  setNewMaterial,
  onSaveNewMaterial,
  inventoryMaterials
}: MaterialsAndCostsStepProps) {
  
  const materialCategories = [
    'Roofing Materials',
    'Underlayment',
    'Fasteners',
    'Flashing',
    'Gutters',
    'Ventilation',
    'Safety Equipment',
    'Tools',
    'Other'
  ];

  const units = ['sq ft', 'linear ft', 'pieces', 'boxes', 'rolls', 'gallons', 'bundles', 'sheets'];

  const addMaterial = (material: Material) => {
    setMaterials([...materials, material]);
  };

  const updateMaterial = (id: string, updatedMaterial: Partial<Material>) => {
    setMaterials(materials.map(m => 
      m.id === id 
        ? { ...m, ...updatedMaterial, total: (updatedMaterial.quantity || m.quantity) * (updatedMaterial.price || m.price) }
        : m
    ));
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const addLaborItem = () => {
    const newLabor: Labor = {
      id: Date.now().toString(),
      description: '',
      hours: 0,
      rate: 0,
      total: 0
    };
    setLabor([...labor, newLabor]);
  };

  const updateLaborItem = (id: string, updatedLabor: Partial<Labor>) => {
    setLabor(labor.map(l => 
      l.id === id 
        ? { ...l, ...updatedLabor, total: (updatedLabor.hours || l.hours) * (updatedLabor.rate || l.rate) }
        : l
    ));
  };

  const removeLaborItem = (id: string) => {
    setLabor(labor.filter(l => l.id !== id));
  };

  const materialsTotal = materials.reduce((sum, material) => sum + material.total, 0);
  const laborTotal = labor.reduce((sum, laborItem) => sum + laborItem.total, 0);
  const subtotal = materialsTotal + laborTotal;
  const taxAmount = subtotal * (estimateData.taxRate || 0) / 100;
  const total = subtotal + taxAmount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Materials & Costs
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Tabs defaultValue="materials" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="labor">Labor</TabsTrigger>
            <TabsTrigger value="summary">Cost Summary</TabsTrigger>
          </TabsList>
          
          <TabsContent value="materials" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Materials List</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMaterialSearchDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Search Inventory
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMaterialDialog(true)}
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add Material
                </Button>
              </div>
            </div>
            
            {materials.length > 0 ? (
              <div className="space-y-2">
                {materials.map((material) => (
                  <div key={material.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{material.name}</h4>
                          {material.category && (
                            <Badge variant="secondary" className="text-xs">
                              {material.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{material.description}</p>
                        
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              value={material.quantity}
                              onChange={(e) => updateMaterial(material.id, { quantity: parseFloat(e.target.value) || 0 })}
                              className="h-8"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs">Unit</Label>
                            <Input
                              value={material.unit}
                              onChange={(e) => updateMaterial(material.id, { unit: e.target.value })}
                              className="h-8"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs">Unit Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={material.price}
                              onChange={(e) => updateMaterial(material.id, { price: parseFloat(e.target.value) || 0 })}
                              className="h-8"
                            />
                          </div>
                          
                          <div>
                            <Label className="text-xs">Total</Label>
                            <div className="h-8 px-3 border rounded flex items-center bg-gray-50 font-medium">
                              ${material.total.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMaterial(material.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No materials added yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowAddMaterialDialog(true)}
                >
                  Add your first material
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="labor" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Labor Costs</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addLaborItem}
                className="flex items-center gap-2"
              >
                <PlusCircle className="h-4 w-4" />
                Add Labor Item
              </Button>
            </div>
            
            {labor.length > 0 ? (
              <div className="space-y-2">
                {labor.map((laborItem) => (
                  <div key={laborItem.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-4 gap-4">
                        <div>
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={laborItem.description}
                            onChange={(e) => updateLaborItem(laborItem.id, { description: e.target.value })}
                            placeholder="Labor description"
                            className="h-8"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Hours</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={laborItem.hours}
                            onChange={(e) => updateLaborItem(laborItem.id, { hours: parseFloat(e.target.value) || 0 })}
                            className="h-8"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Rate/Hour</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={laborItem.rate}
                            onChange={(e) => updateLaborItem(laborItem.id, { rate: parseFloat(e.target.value) || 0 })}
                            className="h-8"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Total</Label>
                          <div className="h-8 px-3 border rounded flex items-center bg-gray-50 font-medium">
                            ${laborItem.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLaborItem(laborItem.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <Wrench className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>No labor items added yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={addLaborItem}
                >
                  Add your first labor item
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="summary" className="space-y-4">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Cost Summary
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Materials Total:</span>
                  <span className="font-medium">${materialsTotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Labor Total:</span>
                  <span className="font-medium">${laborTotal.toFixed(2)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>Tax Rate:</span>
                    <Input
                      type="number"
                      step="0.1"
                      value={estimateData.taxRate || 0}
                      onChange={(e) => setEstimateData({...estimateData, taxRate: parseFloat(e.target.value) || 0})}
                      className="w-20 h-8"
                    />
                    <span>%</span>
                  </div>
                  <span className="font-medium">${taxAmount.toFixed(2)}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Material Dialog */}
        <Dialog open={showAddMaterialDialog} onOpenChange={setShowAddMaterialDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
              <DialogDescription>
                Add a new material to this estimate
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="material-name">Material Name *</Label>
                  <Input
                    id="material-name"
                    value={newMaterial.name || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                    placeholder="e.g., Asphalt Shingles"
                  />
                </div>
                
                <div>
                  <Label htmlFor="material-category">Category</Label>
                  <Select
                    value={newMaterial.category || ''}
                    onValueChange={(value) => setNewMaterial({...newMaterial, category: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {materialCategories.map((category) => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="material-description">Description</Label>
                  <Textarea
                    id="material-description"
                    value={newMaterial.description || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                    placeholder="Detailed description of the material"
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label htmlFor="material-quantity">Quantity *</Label>
                  <Input
                    id="material-quantity"
                    type="number"
                    value={newMaterial.quantity || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, quantity: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="material-unit">Unit *</Label>
                  <Select
                    value={newMaterial.unit || ''}
                    onValueChange={(value) => setNewMaterial({...newMaterial, unit: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="material-price">Unit Price *</Label>
                  <Input
                    id="material-price"
                    type="number"
                    step="0.01"
                    value={newMaterial.price || ''}
                    onChange={(e) => setNewMaterial({...newMaterial, price: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label>Total</Label>
                  <div className="px-3 py-2 border rounded bg-gray-50 font-medium">
                    ${((newMaterial.quantity || 0) * (newMaterial.price || 0)).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddMaterialDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={onSaveNewMaterial}
                disabled={!newMaterial.name || !newMaterial.unit || !newMaterial.price}
              >
                Save Material
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Material Search Dialog */}
        <Dialog open={showMaterialSearchDialog} onOpenChange={setShowMaterialSearchDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Search Materials</DialogTitle>
              <DialogDescription>
                Search your inventory for materials to add to this estimate
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <Input 
                placeholder="Search materials..."
                className="mb-4"
              />
              
              <div className="max-h-[400px] overflow-y-auto">
                {/* This would be populated with your actual material data */}
                <div className="text-center py-10 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p>No materials found in your inventory</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setShowMaterialSearchDialog(false);
                      setShowAddMaterialDialog(true);
                    }}
                  >
                    Add New Material
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMaterialSearchDialog(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}