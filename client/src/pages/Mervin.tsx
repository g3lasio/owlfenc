</button>

                  <button
                    onClick={() => handleDeepSearchOptionSelect("labor-only")}
                    className="bg-gradient-to-r from-orange-900/30 to-red-900/30 hover:from-orange-800/50 hover:to-red-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <Brain className="w-5 h-5 text-orange-400" />
                    <DollarSign className="w-5 h-5 text-red-400" />
                    <span>Solo Mano de Obra</span>
                  </button>

                  <button
                    onClick={async () => {
                      setChatFlowStep("select-inventory");

                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `assistant-${Date.now()}`,
                          content:
                            "✅ Recomendaciones aplicadas al inventario. Puedes continuar con el descuento.",
                          sender: "assistant",
                        },
                      ]);

                      setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }, 100);
                      await loadMaterials().then((updatedMaterials) => {
                        setMessages((prev) => [
                          ...prev,
                          {
                            id: `assistant-${Date.now()}`,
                            content: "Ahora selecciona materiales manualmente:",
                            sender: "assistant",
                            materialList: updatedMaterials,
                          },
                        ]);
                      });
                      setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({
                          behavior: "smooth",
                        });
                      }, 100);
                    }}
                    className="bg-gradient-to-r from-orange-900/30 to-red-900/30 hover:from-orange-800/50 hover:to-red-800/50 text-white rounded-lg p-4 text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-3"
                  >
                    <span>Saltar</span>
                  </button>
                </div>
              )}

              {/* DeepSearch Results with Edit Options */}
              {message.action === "deepsearch-results" &&
                deepSearchRecommendation && (
                  <div className="mt-4 space-y-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="bg-blue-900/30 hover:bg-blue-800/50 text-blue-400 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Editar Selección</span>
                      </button>

                      <button
                        onClick={() => {
                          // Continue with current selection
                          if (deepSearchOption === "labor-only") {
                            // Go to manual material selection
                            setChatFlowStep("select-inventory");
                            loadMaterials().then((updatedMaterials) => {
                              setMessages((prev) => [
                                ...prev,
                                {
                                  id: `assistant-${Date.now()}`,
                                  content:
                                    "Ahora selecciona materiales manualmente:",
                                  sender: "assistant",
                                  materialList: updatedMaterials,
                                },
                              ]);
                            });
                            setTimeout(() => {
                              messagesEndRef.current?.scrollIntoView({
                                behavior: "smooth",
                              });
                            }, 100);
                          } else {
                            // Convert AI recommendations to inventory items
                            const convertedItems =
                              deepSearchRecommendation.materials.map(
                                (material) => ({
                                  material: {
                                    id: `ai-${material.name.toLowerCase().replace(/\s+/g, "-")}`,
                                    name: material.name,
                                    description: material.description,
                                    price: material.estimatedPrice,
                                    unit: material.unit,
                                    category: material.category,
                                  },
                                  quantity: material.quantity,
                                }),
                              );

                            setInventoryItems(convertedItems);
                            setChatFlowStep("select-inventory");

                            setMessages((prev) => [
                              ...prev,
                              {
                                id: `assistant-${Date.now()}`,
                                content:
                                  "✅ Recomendaciones aplicadas al inventario. Puedes continuar con el descuento.",
                                sender: "assistant",
                              },
                            ]);

                            setTimeout(() => {
                              messagesEndRef.current?.scrollIntoView({
                                behavior: "smooth",
                              });
                            }, 100);
                          }
                        }}
                        className="bg-green-900/30 hover:bg-green-800/50 text-green-400 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
                      >
                        <Check className="w-4 h-4" />
                        <span>Continuar con Selección</span>
                      </button>
                    </div>
                  </div>
                )}
            </div>
          ))}

          {/* Mensaje de carga */}
          {isLoading && (
            <div className="max-w-[85%] rounded-lg p-3 bg-gray-900 mr-auto">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-cyan-900/30 flex items-center justify-center mr-2">
                  <img
                    src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png"
                    alt="Mervin AI"
                    className="w-6 h-6"
                  />
                </div>
                <span className="text-cyan-400">Procesando</span>
                <div className="ml-1 flex">
                  <span className="animate-pulse text-cyan-400">.</span>
                  <span className="animate-pulse text-cyan-400 delay-200">
                    .
                  </span>
                  <span className="animate-pulse text-cyan-400 delay-500">
                    .
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Elemento para scroll automático */}
          <div ref={messagesEndRef} />
        </div>
        {chatFlowStep === "select-inventory" && shoppingCart.length > 0 && (
          <div className="text-center mt-4">
            <button
              className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium"
              onClick={() => {
                setChatFlowStep("awaiting-discount");
                setMessages((prev) => [
                  ...prev,
                  {
                    id: "assistant-" + Date.now(),
                    content:
                      "¿Quieres aplicar algún **descuento**? Ingresa un valor numérico o porcentaje (ej: 100 o 10%). Escribe skip para omitir.",
                    sender: "assistant",
                  },
                ]);
                setTimeout(
                  () =>
                    messagesEndRef.current?.scrollIntoView({
                      behavior: "smooth",
                    }),
                  100,
                );
              }}
            >
              📄 Generar Estimado
            </button>
          </div>
        )}
      </div>

      {/* Área de input FIJA en la parte inferior, fuera del scroll */}
      <div className="fixed bottom-8 left-0 right-0 p-3 bg-black border-t border-cyan-900/30">
        <div className="flex gap-2 max-w-screen-lg mx-auto">
          <Button
            variant="outline"
            size="icon"
            className="bg-gray-800 text-cyan-500 border-cyan-900/50"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-gray-800 border border-cyan-900/50 rounded-full px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            disabled={isLoading}
          />

          <Button
            variant="default"
            className="rounded-full bg-cyan-600 hover:bg-cyan-700"
            onClick={handleSendMessage}
            disabled={inputValue.trim() === "" || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
