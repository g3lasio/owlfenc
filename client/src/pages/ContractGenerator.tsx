import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, ArrowRight, Info } from "lucide-react";
import ContractPreview from "@/components/templates/ContractPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import ChatAssistant from "@/components/contract/ChatAssistant";
import ContractOptions from "@/components/contract/ContractOptions";

// Zod schema para validar los datos del formulario
const contractFormSchema = z.object({
  estimateInfo: z.string().optional(),
  clientName: z.string().min(2, "El nombre del cliente es requerido"),
  clientEmail: z.string().email("Correo electrónico inválido").optional().or(z.literal("")),
  clientPhone: z.string().optional().or(z.literal("")),
  clientAddress: z.string().min(5, "La dirección del cliente es requerida"),
  fenceType: z.string().min(2, "El tipo de cerca es requerido"),
  fenceHeight: z.string().min(1, "La altura de la cerca es requerida"),
  fenceLength: z.string().min(1, "La longitud de la cerca es requerida"),
  projectTotal: z.string().min(1, "El total del proyecto es requerido"),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

const ContractGenerator = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("options");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [contractHtml, setContractHtml] = useState<string>("");
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Formulario para datos del contrato
  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      estimateInfo: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",
      fenceType: "",
      fenceHeight: "",
      fenceLength: "",
      projectTotal: "",
    },
  });

  // Manejar la subida de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      toast({
        title: "Archivo seleccionado",
        description: `Archivo: ${e.target.files[0].name}`,
      });
    }
  };

  // Procesar el PDF del estimado
  const handleProcessEstimate = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo primero",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      // Enviar solicitud para procesar el PDF
      const response = await fetch("/api/generar-contrato", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error al procesar el estimado");
      }

      const data = await response.json();
      
      // Actualizar estados con los datos extraídos
      setExtractedData(data.datos_extraidos);
      setContractHtml(data.contrato_html || "");

      // Actualizar el formulario con los datos extraídos
      form.reset({
        estimateInfo: JSON.stringify(data.datos_extraidos, null, 2),
        clientName: data.datos_extraidos.cliente?.nombre || "",
        clientEmail: data.datos_extraidos.cliente?.email || "",
        clientPhone: data.datos_extraidos.cliente?.telefono || "",
        clientAddress: data.datos_extraidos.cliente?.direccion || "",
        fenceType: data.datos_extraidos.proyecto?.tipoObra || "",
        fenceHeight: data.datos_extraidos.proyecto?.altura || "",
        fenceLength: data.datos_extraidos.proyecto?.longitud || "",
        projectTotal: data.datos_extraidos.proyecto?.total?.toString() || "",
      });

      // Cambiar al tab de revisión
      setActiveTab("review-data");

      toast({
        title: "¡Procesamiento exitoso!",
        description: "Se ha procesado el PDF correctamente",
      });
    } catch (error) {
      console.error("Error procesando PDF:", error);
      toast({
        title: "Error de procesamiento",
        description: "No se pudo procesar el PDF. Inténtalo de nuevo o ingresa los datos manualmente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Generar contrato a partir de los datos validados
  const onSubmit = async (data: ContractFormValues) => {
    setIsGeneratingContract(true);
    try {
      // Preparar datos para la generación del contrato
      const contractData = {
        projectDetails: {
          clientName: data.clientName,
          address: data.clientAddress,
          email: data.clientEmail || "",
          phone: data.clientPhone || "",
          fenceType: data.fenceType,
          fenceHeight: data.fenceHeight,
          fenceLength: data.fenceLength,
          total: parseFloat(data.projectTotal.replace(/,/g, "")),
          depositAmount: parseFloat(data.projectTotal.replace(/,/g, "")) * 0.5, // 50% de anticipo por defecto
        },
      };

      // Generar contrato con la API
      const response = await fetch("/api/generate-contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        throw new Error("Error al generar el contrato");
      }

      const result = await response.json();
      setContractHtml(result.html);
      
      // Cambiar al tab de vista previa
      setActiveTab("preview-contract");

      toast({
        title: "¡Contrato generado!",
        description: "El contrato ha sido generado correctamente",
      });
    } catch (error) {
      console.error("Error generando contrato:", error);
      toast({
        title: "Error de generación",
        description: "No se pudo generar el contrato. Por favor intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingContract(false);
    }
  };

  // Manejar selección de opciones de contrato
  const handleOptionSelect = (option: 'new' | 'template' | 'modify' | 'upload') => {
    setSelectedOption(option);
    
    // Redireccionar basado en la opción seleccionada
    if (option === 'upload') {
      setActiveTab("upload-estimate");
    } else if (option === 'new') {
      // Para crear nuevo, ir directo al formulario vacío
      form.reset({
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        clientAddress: "",
        fenceType: "",
        fenceHeight: "",
        fenceLength: "",
        projectTotal: "",
      });
      setActiveTab("review-data");
    } else {
      // Para otras opciones, también mostramos el formulario pero podríamos
      // cargarlo con datos diferentes según la opción
      setActiveTab("review-data");
    }
  };

  // Manejar datos completos del chat asistente
  const handleChatDataComplete = (data: any) => {
    // Actualizar el formulario con los datos recopilados por el chat
    form.reset({
      clientName: data.clientName || "",
      clientEmail: data.clientEmail || "",
      clientPhone: data.clientPhone || "",
      clientAddress: data.clientAddress || "",
      fenceType: data.fenceType || "",
      fenceHeight: data.fenceHeight || "",
      fenceLength: data.fenceLength || "",
      projectTotal: data.projectTotal || "",
    });
    
    // Cambiar a la tab de revisión
    setActiveTab("review-data");
    
    toast({
      title: "Información recopilada",
      description: "Se ha completado la recopilación de información. Revisa los datos antes de generar el contrato.",
    });
  };

  // Descargar contrato como PDF
  const handleDownloadPDF = async () => {
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          html: contractHtml,
          filename: `contrato-${Date.now()}.pdf`,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al generar el PDF");
      }

      // Crear blob y descargar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `contrato-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF descargado",
        description: "El contrato ha sido descargado como PDF",
      });
    } catch (error) {
      console.error("Error descargando PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo descargar el PDF. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Generación de Contratos</h1>
        <p className="text-muted-foreground mb-6">
          Genera contratos profesionales a partir de estimados aprobados o información manual
        </p>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="options">Inicio</TabsTrigger>
            <TabsTrigger value="upload-estimate">1. Cargar Estimado</TabsTrigger>
            <TabsTrigger value="review-data">2. Revisar Información</TabsTrigger>
            <TabsTrigger value="preview-contract">3. Vista Previa</TabsTrigger>
            <TabsTrigger value="chat-assistant">Asistente</TabsTrigger>
          </TabsList>

          {/* Tab para opciones iniciales */}
          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle>¿Cómo deseas generar el contrato?</CardTitle>
                <CardDescription>
                  Selecciona una de las siguientes opciones para comenzar a generar tu contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContractOptions onSelectOption={handleOptionSelect} />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab para el asistente virtual */}
          <TabsContent value="chat-assistant">
            <Card>
              <CardHeader>
                <CardTitle>Asistente Virtual</CardTitle>
                <CardDescription>
                  Nuestro asistente te guiará a través del proceso de generación de contratos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChatAssistant 
                  initialData={{
                    clientName: form.getValues("clientName"),
                    clientEmail: form.getValues("clientEmail"),
                    clientPhone: form.getValues("clientPhone"),
                    clientAddress: form.getValues("clientAddress"),
                    fenceType: form.getValues("fenceType"),
                    fenceHeight: form.getValues("fenceHeight"),
                    fenceLength: form.getValues("fenceLength"),
                    projectTotal: form.getValues("projectTotal")
                  }}
                  onDataComplete={handleChatDataComplete}
                  onFileUpload={setSelectedFile}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Tab para cargar estimado */}
          <TabsContent value="upload-estimate">
            <Card>
              <CardHeader>
                <CardTitle>Cargar Estimado Aprobado</CardTitle>
                <CardDescription>
                  Sube un PDF de un estimado aprobado para generar automáticamente el contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Consejo</AlertTitle>
                    <AlertDescription>
                      Para mejores resultados, usa un PDF legible y con texto seleccionable.
                      El sistema extraerá automáticamente la información del cliente y del proyecto.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-10 mb-6">
                  <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Arrastra o selecciona un archivo</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Arrastra un PDF aquí o haz clic para seleccionar un archivo
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload">
                    <Button asChild>
                      <span>
                        <FileText className="h-4 w-4 mr-2" />
                        Seleccionar archivo
                      </span>
                    </Button>
                  </label>
                  {selectedFile && (
                    <p className="mt-4 text-sm">
                      Archivo seleccionado: <span className="font-medium">{selectedFile.name}</span>
                    </p>
                  )}
                </div>

                <div className="flex justify-between">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        No tengo un estimado
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Información Manual</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground mb-4">
                        Si no tienes un estimado en PDF, puedes continuar ingresando la información manualmente
                        en el siguiente paso. Haz clic en continuar para ir a la pantalla de entrada de datos.
                      </p>
                      <Button onClick={() => setActiveTab("review-data")}>
                        Continuar <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </DialogContent>
                  </Dialog>

                  <Button 
                    onClick={handleProcessEstimate} 
                    disabled={!selectedFile || isProcessing}
                  >
                    {isProcessing ? "Procesando..." : "Procesar Estimado"}
                    {!isProcessing && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab para revisar y editar datos */}
          <TabsContent value="review-data">
            <Card>
              <CardHeader>
                <CardTitle>Revisar y Completar Información</CardTitle>
                <CardDescription>
                  Revisa y completa la información necesaria para el contrato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Sección de datos del cliente */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Datos del Cliente</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="clientName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre del Cliente*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nombre completo" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="clientEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Correo Electrónico</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="email@ejemplo.com" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="clientPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="(123) 456-7890" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="clientAddress"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dirección*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Dirección completa" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Sección de datos del proyecto */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Detalles del Proyecto</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="fenceType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Cerca*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: Privacidad, Vinilo, etc." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fenceHeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Altura (pies)*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: 6" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fenceLength"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Longitud (pies)*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: 100" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="projectTotal"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total del Proyecto ($)*</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Ej: 5000.00" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Datos extraídos (en modo oculto para desarrolladores) */}
                    <div className="hidden">
                      <FormField
                        control={form.control}
                        name="estimateInfo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Datos Extraídos (JSON)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                rows={10}
                                className="font-mono text-xs"
                                readOnly
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-between">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setActiveTab("upload-estimate")}
                      >
                        Volver
                      </Button>
                      <Button type="submit" disabled={isGeneratingContract}>
                        {isGeneratingContract ? "Generando..." : "Generar Contrato"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab para vista previa del contrato */}
          <TabsContent value="preview-contract">
            <Card>
              <CardHeader>
                <CardTitle>Vista Previa del Contrato</CardTitle>
                <CardDescription>
                  Revisa el contrato generado antes de descargarlo o enviarlo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contractHtml ? (
                  <>
                    <div className="mb-6">
                      <ContractPreview html={contractHtml} />
                    </div>
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab("review-data")}
                      >
                        Volver a Editar
                      </Button>
                      <Button onClick={handleDownloadPDF}>
                        <FileText className="h-4 w-4 mr-2" />
                        Descargar PDF
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-10">
                    <p className="text-muted-foreground">
                      No hay contrato generado aún. Completa los pasos anteriores para generar un contrato.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4" 
                      onClick={() => setActiveTab("upload-estimate")}
                    >
                      Volver al Inicio
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ContractGenerator;