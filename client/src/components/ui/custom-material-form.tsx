import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CustomMaterialFormProps {
  onSubmit: (material: any) => void;
  onCancel: () => void;
}

export function CustomMaterialForm({ onSubmit, onCancel }: CustomMaterialFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    unit: '',
    price: '',
    supplier: '',
    sku: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.unit || !formData.price) {
      return;
    }
    
    onSubmit(formData);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Material Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., Custom Wood Post"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Posts">Posts</SelectItem>
              <SelectItem value="Rails">Rails</SelectItem>
              <SelectItem value="Panels">Panels</SelectItem>
              <SelectItem value="Hardware">Hardware</SelectItem>
              <SelectItem value="Labor">Labor</SelectItem>
              <SelectItem value="Equipment">Equipment</SelectItem>
              <SelectItem value="Permits">Permits</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Brief description of the material or service..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="unit">Unit *</Label>
          <Select value={formData.unit} onValueChange={(value) => updateField('unit', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="piece">Piece</SelectItem>
              <SelectItem value="linear_ft">Linear Ft</SelectItem>
              <SelectItem value="sq_ft">Square Ft</SelectItem>
              <SelectItem value="hour">Hour</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="gallon">Gallon</SelectItem>
              <SelectItem value="bag">Bag</SelectItem>
              <SelectItem value="roll">Roll</SelectItem>
              <SelectItem value="lot">Lot</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="price">Unit Price * ($)</Label>
          <Input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) => updateField('price', e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="supplier">Supplier</Label>
          <Input
            id="supplier"
            value={formData.supplier}
            onChange={(e) => updateField('supplier', e.target.value)}
            placeholder="e.g., Home Depot, Lowes"
          />
        </div>
        
        <div>
          <Label htmlFor="sku">SKU/Product Code</Label>
          <Input
            id="sku"
            value={formData.sku}
            onChange={(e) => updateField('sku', e.target.value)}
            placeholder="Product code or reference"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!formData.name || !formData.unit || !formData.price}>
          Add Material
        </Button>
      </div>
    </form>
  );
}