import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { MapboxAddressAutocomplete } from "./MapboxAddressAutocomplete";
import { useState } from "react";

// Schema unificado para cliente
const clientFormSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  email: z.string().email({ message: "Correo electrónico inválido" }).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  mobilePhone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zipCode: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  source: z.string().optional().or(z.literal("")),
  classification: z.string().optional().or(z.literal("")),
  tags: z.array(z.string()).optional(),
});

export type ClientFormData = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
  initialData?: Partial<ClientFormData>;
  onSubmit: (data: ClientFormData) => Promise<void>;
  isLoading?: boolean;
  submitButtonText: string;
}

export function ClientForm({ 
  initialData, 
  onSubmit, 
  isLoading = false, 
  submitButtonText 
}: ClientFormProps) {
  const [newTag, setNewTag] = useState("");

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      mobilePhone: initialData?.mobilePhone || "",
      address: initialData?.address || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      zipCode: initialData?.zipCode || "",
      notes: initialData?.notes || "",
      source: initialData?.source || "",
      classification: initialData?.classification || "cliente",
      tags: initialData?.tags || [],
    },
  });

  const handleAddTag = () => {
    if (newTag.trim() && !form.getValues("tags")?.includes(newTag.trim())) {
      const currentTags = form.getValues("tags") || [];
      form.setValue("tags", [...currentTags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue("tags", currentTags.filter(tag => tag !== tagToRemove));
  };

  const handleAddressSelect = (address: string, details?: any) => {
    form.setValue("address", address);
    if (details) {
      form.setValue("city", details.city || "");
      form.setValue("state", details.state || "");
      form.setValue("zipCode", details.zipCode || "");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="Nombre del cliente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="correo@ejemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input placeholder="(503) 555-1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobilePhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono Móvil</FormLabel>
                <FormControl>
                  <Input placeholder="(503) 555-5678" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <MapboxAddressAutocomplete
                    value={field.value}
                    onChange={handleAddressSelect}
                    placeholder="123 Calle Principal, Portland, OR"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad</FormLabel>
                <FormControl>
                  <Input placeholder="Portland" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input placeholder="OR" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código Postal</FormLabel>
                <FormControl>
                  <Input placeholder="97204" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="source"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Origen</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar origen" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Sin origen</SelectItem>
                    <SelectItem value="Referido">Referido</SelectItem>
                    <SelectItem value="Página web">Página web</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Nextdoor">Nextdoor</SelectItem>
                    <SelectItem value="Yelp">Yelp</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="classification"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Clasificación</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "cliente"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar clasificación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="proveedor">Proveedor</SelectItem>
                    <SelectItem value="empleado">Empleado</SelectItem>
                    <SelectItem value="subcontratista">Subcontratista</SelectItem>
                    <SelectItem value="prospecto">Prospecto</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Sistema de etiquetas */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etiquetas</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  {/* Tags existentes */}
                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {field.value.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-destructive" 
                            onClick={() => handleRemoveTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                  {/* Input para nueva etiqueta */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Agregar etiqueta"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Notas adicionales sobre el cliente" 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Guardando..." : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}