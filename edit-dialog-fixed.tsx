{/* Diálogo para editar cliente */}
      <Dialog open={showEditClientDialog} onOpenChange={setShowEditClientDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>
              Actualiza los datos del cliente.
            </DialogDescription>
          </DialogHeader>

          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(handleClientFormSubmit)} className="space-y-5">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Nombre*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Nombre del cliente" 
                        className="h-11" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={clientForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Email</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Email" 
                          type="email"
                          className="h-11" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Teléfono" 
                          className="h-11" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-2 pt-2 border-t border-border">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Información de dirección</h3>
                
                <FormField
                  control={clientForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="mb-5">
                      <FormLabel className="text-base font-medium">Dirección</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          value={field.value}
                          onChange={(value, details) => {
                            field.onChange(value);
                            // Actualizar los demás campos de dirección
                            if (details?.city) clientForm.setValue('city', details.city);
                            if (details?.state) clientForm.setValue('state', details.state);
                            if (details?.zipCode) clientForm.setValue('zipCode', details.zipCode);
                          }}
                          placeholder="Buscar dirección..."
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Selecciona una dirección del autocompletado para llenar automáticamente ciudad, estado y código postal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <FormField
                    control={clientForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Ciudad</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ciudad" 
                            className="h-11" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Estado</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Estado" 
                            className="h-11" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={clientForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-medium">Código Postal</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="CP" 
                            className="h-11" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <FormField
                control={clientForm.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Fuente</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="¿Cómo conoció al cliente?" 
                        className="h-11" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Ejemplo: Referencia, Google, Facebook, etc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="tags"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Etiquetas</FormLabel>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {clientForm.getValues('tags')?.map(tag => (
                        <Badge key={tag} className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                    <FormControl>
                      <Input
                        placeholder="Añadir etiqueta (presiona Enter)"
                        className="h-11"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagInput}
                      />
                    </FormControl>
                    <FormDescription>
                      Las etiquetas te permiten filtrar y organizar clientes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Notas</FormLabel>
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

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowEditClientDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Actualizar Cliente</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>