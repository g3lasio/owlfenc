import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ManualEstimateFormProps {
  onEstimateGenerated: (html: string) => void;
}

export default function ManualEstimateForm({ onEstimateGenerated }: ManualEstimateFormProps) {
  // Datos básicos del formulario de estimación
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [projectType, setProjectType] = useState("residential");
  const [fenceType, setFenceType] = useState("");
  const [fenceLength, setFenceLength] = useState("");
  const [fenceHeight, setFenceHeight] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  
  // Función para manejar la navegación de pasos
  const goToNextStep = () => {
    setCurrentStep(currentStep + 1);
  };
  
  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };
  
  // Función para generar el estimado básico
  const generateEstimate = () => {
    // En una implementación real, esto generaría un HTML más complejo
    // basado en todos los datos recopilados
    const estimateHtml = `
      <div class="estimate-container">
        <h1>Estimado para: ${customerName}</h1>
        <p><strong>Dirección:</strong> ${customerAddress}</p>
        <p><strong>Tipo de proyecto:</strong> ${projectType === 'residential' ? 'Residencial' : 'Comercial'}</p>
        <p><strong>Tipo de cerca:</strong> ${fenceType}</p>
        <p><strong>Longitud:</strong> ${fenceLength} pies</p>
        <p><strong>Altura:</strong> ${fenceHeight} pies</p>
        <p><strong>Notas adicionales:</strong> ${additionalNotes}</p>
        
        <h2>Desglose de costos</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Ítem</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Costo</th>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Materiales</td>
            <td style="border: 1px solid #ddd; padding: 8px;">$${calculateMaterialCost()}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">Mano de obra</td>
            <td style="border: 1px solid #ddd; padding: 8px;">$${calculateLaborCost()}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>Total</strong></td>
            <td style="border: 1px solid #ddd; padding: 8px;"><strong>$${calculateTotalCost()}</strong></td>
          </tr>
        </table>
        
        <p style="margin-top: 20px; font-style: italic;">Este estimado es válido por 30 días desde la fecha de emisión.</p>
      </div>
    `;
    
    onEstimateGenerated(estimateHtml);
  };
  
  // Funciones de cálculo simples (en una implementación real serían más complejas)
  const calculateMaterialCost = () => {
    // Cálculo simple basado en longitud y tipo
    const baseRate = fenceType === 'wood' ? 15 : fenceType === 'chain' ? 12 : fenceType === 'vinyl' ? 25 : 20;
    return Math.round(parseFloat(fenceLength || "0") * baseRate);
  };
  
  const calculateLaborCost = () => {
    // Cálculo simple basado en longitud y altura
    const baseRate = 10;
    return Math.round(parseFloat(fenceLength || "0") * parseFloat(fenceHeight || "0") * baseRate / 10);
  };
  
  const calculateTotalCost = () => {
    return calculateMaterialCost() + calculateLaborCost();
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto">
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
            <CardDescription>Ingresa los datos del cliente y la ubicación del proyecto</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nombre del Cliente</Label>
              <Input 
                id="customerName" 
                value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)} 
                placeholder="Ej: Juan Pérez"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customerAddress">Dirección del Proyecto</Label>
              <Textarea 
                id="customerAddress" 
                value={customerAddress} 
                onChange={(e) => setCustomerAddress(e.target.value)} 
                placeholder="Ingresa la dirección completa donde se instalará la cerca"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="projectType">Tipo de Proyecto</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residencial</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={goToNextStep} className="ml-auto">Siguiente</Button>
          </CardFooter>
        </Card>
      )}
      
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Cerca</CardTitle>
            <CardDescription>Especifica las características de la cerca a instalar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fenceType">Tipo de Cerca</Label>
              <Select value={fenceType} onValueChange={setFenceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el tipo de cerca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wood">Madera</SelectItem>
                  <SelectItem value="chain">Cadena (Chain Link)</SelectItem>
                  <SelectItem value="vinyl">Vinilo</SelectItem>
                  <SelectItem value="aluminum">Aluminio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fenceLength">Longitud (pies)</Label>
                <Input 
                  id="fenceLength" 
                  type="number" 
                  min="0"
                  value={fenceLength} 
                  onChange={(e) => setFenceLength(e.target.value)} 
                  placeholder="Ej: 100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fenceHeight">Altura (pies)</Label>
                <Input 
                  id="fenceHeight" 
                  type="number" 
                  min="0"
                  value={fenceHeight} 
                  onChange={(e) => setFenceHeight(e.target.value)} 
                  placeholder="Ej: 6"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Notas Adicionales</Label>
              <Textarea 
                id="additionalNotes" 
                value={additionalNotes} 
                onChange={(e) => setAdditionalNotes(e.target.value)} 
                placeholder="Cualquier detalle adicional o requerimiento especial"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPreviousStep}>Anterior</Button>
            <Button onClick={goToNextStep}>Siguiente</Button>
          </CardFooter>
        </Card>
      )}
      
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Revisar y Generar Estimado</CardTitle>
            <CardDescription>Verifica la información y genera el estimado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Cliente</h3>
              <p className="text-sm text-muted-foreground">{customerName}</p>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Dirección</h3>
              <p className="text-sm text-muted-foreground">{customerAddress}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Tipo de Cerca</h3>
              <p className="text-sm text-muted-foreground">
                {fenceType === 'wood' ? 'Madera' : 
                 fenceType === 'chain' ? 'Cadena (Chain Link)' : 
                 fenceType === 'vinyl' ? 'Vinilo' : 
                 fenceType === 'aluminum' ? 'Aluminio' : 'No especificado'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Longitud</h3>
                <p className="text-sm text-muted-foreground">{fenceLength} pies</p>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-medium">Altura</h3>
                <p className="text-sm text-muted-foreground">{fenceHeight} pies</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Estimación de Costos</h3>
              <div className="bg-muted rounded-md p-3">
                <div className="flex justify-between">
                  <span>Materiales:</span>
                  <span>${calculateMaterialCost()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mano de obra:</span>
                  <span>${calculateLaborCost()}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Total:</span>
                  <span>${calculateTotalCost()}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPreviousStep}>Anterior</Button>
            <Button onClick={generateEstimate}>Generar Estimado</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}