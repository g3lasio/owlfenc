/**
 * ContractQuestionService
 * 
 * Este servicio gestiona el flujo de preguntas específico para la generación de contratos,
 * basado en los campos requeridos por la plantilla y los datos ya extraídos del PDF.
 */

// Tipos para los datos de contrato
export interface ContractData {
  cliente: {
    nombre: string;
    direccion: string;
    telefono?: string;
    email?: string;
  };
  contratista: {
    nombre: string;
    direccion: string;
    telefono?: string;
    email?: string;
    licencia?: string;
    sitioWeb?: string;
  };
  proyecto: {
    tipoCerca: string;
    altura?: string;
    longitud?: string;
    ubicacion?: string;
    estilo?: string;
    material: string;
    fechaInicio?: string;
    duracionEstimada?: string;
    descripcion: string;
  };
  presupuesto: {
    subtotal?: string;
    impuestos?: string;
    total: string;
    deposito: string;
    formaPago?: string;
  };
  clausulasAdicionales?: string[];
}

// Estructura para el análisis de campos
interface CamposAnalisis {
  faltantes: string[];
  completos: string[];
  opcional: string[];
  porcentajeCompletado: number;
}

// Estructura para una pregunta del asistente
export interface Pregunta {
  campo: string;
  texto: string;
  validacion?: (valor: string) => boolean | string;
  opciones?: string[];
  ayuda?: string;
  saltar?: (datos: ContractData) => boolean;
}

/**
 * Clase principal del servicio de preguntas para contratos
 */
export class ContractQuestionService {
  private plantillaPreguntas: Pregunta[] = [
    {
      campo: 'cliente.nombre',
      texto: '¿Cuál es el nombre del cliente?',
      validacion: (valor) => valor.length > 2 || 'El nombre debe tener al menos 3 caracteres',
      ayuda: 'Ingresa el nombre completo del cliente para quien se realizará el trabajo'
    },
    {
      campo: 'cliente.direccion',
      texto: '¿Cuál es la dirección completa del cliente?',
      validacion: (valor) => valor.length > 5 || 'La dirección debe ser completa',
      ayuda: 'Ingresa la dirección donde reside el cliente, incluyendo ciudad y código postal'
    },
    {
      campo: 'cliente.telefono',
      texto: '¿Cuál es el número de teléfono del cliente? (Escribe "omitir" si no lo tienes)',
      saltar: (datos) => !!datos.cliente?.telefono
    },
    {
      campo: 'cliente.email',
      texto: '¿Cuál es el correo electrónico del cliente? (Escribe "omitir" si no lo tienes)',
      saltar: (datos) => !!datos.cliente?.email
    },
    {
      campo: 'proyecto.descripcion',
      texto: '¿Puedes describir brevemente el proyecto de cerca?',
      validacion: (valor) => valor.length > 10 || 'Por favor proporciona una descripción más detallada'
    },
    {
      campo: 'proyecto.material',
      texto: '¿Qué material se utilizará para la cerca?',
      opciones: ['Madera', 'Vinilo', 'Hierro forjado', 'Aluminio', 'Cadena', 'Otro'],
      validacion: (valor) => valor.length > 0 || 'Debes especificar un material'
    },
    {
      campo: 'proyecto.tipoCerca',
      texto: '¿Qué tipo de cerca será instalada?',
      opciones: ['Residencial', 'Comercial', 'Seguridad', 'Privacidad', 'Decorativa', 'Otro'],
      validacion: (valor) => valor.length > 0 || 'Debes especificar un tipo'
    },
    {
      campo: 'proyecto.altura',
      texto: '¿Qué altura tendrá la cerca en pies?',
      opciones: ['4', '5', '6', '7', '8', 'Otro'],
      saltar: (datos) => !!datos.proyecto?.altura
    },
    {
      campo: 'proyecto.longitud',
      texto: '¿Cuál es la longitud aproximada de la cerca en pies lineales?',
      saltar: (datos) => !!datos.proyecto?.longitud
    },
    {
      campo: 'presupuesto.total',
      texto: '¿Cuál es el monto total del proyecto?',
      validacion: (valor) => /^\$?\d+(,\d{3})*(\.\d{2})?$/.test(valor) || 'Ingresa un formato de monto válido (ej: $1,200.00)'
    },
    {
      campo: 'presupuesto.deposito',
      texto: '¿Qué porcentaje se requiere como anticipo?',
      opciones: ['30%', '50%', 'Otro'],
      validacion: (valor) => /^\d+%$/.test(valor) || 'Ingresa un porcentaje válido (ej: 30%)'
    }
  ];

  /**
   * Analiza los datos existentes y determina qué campos faltan
   * @param datos Los datos actuales del contrato
   * @returns Análisis de campos completos y faltantes
   */
  analizarDatos(datos: Partial<ContractData>): CamposAnalisis {
    const faltantes: string[] = [];
    const completos: string[] = [];
    const opcionales: string[] = ['cliente.telefono', 'cliente.email', 'proyecto.estilo', 'proyecto.altura', 'proyecto.longitud'];
    
    // Verificar cliente
    if (!datos.cliente?.nombre) faltantes.push('cliente.nombre');
    else completos.push('cliente.nombre');
    
    if (!datos.cliente?.direccion) faltantes.push('cliente.direccion');
    else completos.push('cliente.direccion');
    
    // Verificar contratista
    if (!datos.contratista?.nombre) faltantes.push('contratista.nombre');
    else completos.push('contratista.nombre');
    
    if (!datos.contratista?.direccion) faltantes.push('contratista.direccion');
    else completos.push('contratista.direccion');
    
    // Verificar proyecto
    if (!datos.proyecto?.descripcion) faltantes.push('proyecto.descripcion');
    else completos.push('proyecto.descripcion');
    
    if (!datos.proyecto?.tipoCerca) faltantes.push('proyecto.tipoCerca');
    else completos.push('proyecto.tipoCerca');
    
    if (!datos.proyecto?.material) faltantes.push('proyecto.material');
    else completos.push('proyecto.material');
    
    // Verificar presupuesto
    if (!datos.presupuesto?.total) faltantes.push('presupuesto.total');
    else completos.push('presupuesto.total');
    
    if (!datos.presupuesto?.deposito) faltantes.push('presupuesto.deposito');
    else completos.push('presupuesto.deposito');
    
    // Campos opcionales
    if (datos.cliente?.telefono) completos.push('cliente.telefono');
    if (datos.cliente?.email) completos.push('cliente.email');
    if (datos.proyecto?.altura) completos.push('proyecto.altura');
    if (datos.proyecto?.longitud) completos.push('proyecto.longitud');
    
    // Calcular porcentaje completado (solo campos obligatorios)
    const camposObligatorios = 9; // Número de campos obligatorios
    const completosObligatorios = completos.filter(campo => !opcionales.includes(campo)).length;
    const porcentajeCompletado = Math.round((completosObligatorios / camposObligatorios) * 100);
    
    return {
      faltantes,
      completos,
      opcional: opcionales,
      porcentajeCompletado
    };
  }

  /**
   * Obtiene la próxima pregunta a realizar basada en los datos actuales
   * @param datos Los datos actuales del contrato
   * @returns La próxima pregunta a realizar o null si no hay más preguntas
   */
  obtenerProximaPregunta(datos: Partial<ContractData>): Pregunta | null {
    const analisis = this.analizarDatos(datos);
    
    if (analisis.faltantes.length === 0) {
      return null; // No hay más preguntas necesarias
    }
    
    // Priorizar los campos faltantes en orden de importancia
    const proximoCampo = analisis.faltantes[0];
    
    // Buscar la pregunta correspondiente al campo
    const pregunta = this.plantillaPreguntas.find(p => p.campo === proximoCampo);
    
    if (!pregunta) {
      return null; // No hay pregunta definida para este campo
    }
    
    // Verificar si debemos saltar esta pregunta
    if (pregunta.saltar && pregunta.saltar(datos as ContractData)) {
      // Saltamos a la siguiente pregunta recursivamente
      return this.obtenerProximaPregunta(datos);
    }
    
    return pregunta;
  }

  /**
   * Actualiza los datos del contrato con la respuesta a una pregunta
   * @param datos Los datos actuales del contrato
   * @param campo El campo que se está actualizando
   * @param valor El valor proporcionado por el usuario
   * @returns Los datos actualizados
   */
  actualizarDatos(datos: Partial<ContractData>, campo: string, valor: string): Partial<ContractData> {
    // Clonar los datos para evitar mutaciones
    const nuevosDatos = JSON.parse(JSON.stringify(datos));
    
    // Separar el campo en secciones (ej: 'cliente.nombre' => ['cliente', 'nombre'])
    const [seccion, propiedad] = campo.split('.');
    
    // Validar si se debe omitir este campo
    if (valor.toLowerCase() === 'omitir') {
      return nuevosDatos;
    }
    
    // Asegurar que la sección existe
    if (!nuevosDatos[seccion]) {
      nuevosDatos[seccion] = {};
    }
    
    // Actualizar el valor
    nuevosDatos[seccion][propiedad] = valor;
    
    return nuevosDatos;
  }

  /**
   * Genera un mensaje de resumen con los datos recopilados hasta el momento
   * @param datos Los datos actuales del contrato
   * @returns Mensaje de resumen para mostrar al usuario
   */
  generarResumen(datos: Partial<ContractData>): string {
    const analisis = this.analizarDatos(datos);
    
    let resumen = `Información recopilada (${analisis.porcentajeCompletado}% completado):\n\n`;
    
    if (datos.cliente?.nombre) {
      resumen += `✅ Cliente: ${datos.cliente.nombre}\n`;
    }
    
    if (datos.cliente?.direccion) {
      resumen += `✅ Dirección: ${datos.cliente.direccion}\n`;
    }
    
    if (datos.proyecto?.descripcion) {
      resumen += `✅ Descripción: ${datos.proyecto.descripcion}\n`;
    }
    
    if (datos.proyecto?.tipoCerca && datos.proyecto?.material) {
      resumen += `✅ Cerca: ${datos.proyecto.tipoCerca} de ${datos.proyecto.material}`;
      
      if (datos.proyecto?.altura) {
        resumen += `, ${datos.proyecto.altura} pies de altura`;
      }
      
      if (datos.proyecto?.longitud) {
        resumen += `, ${datos.proyecto.longitud} pies lineales`;
      }
      
      resumen += '\n';
    }
    
    if (datos.presupuesto?.total) {
      resumen += `✅ Precio total: ${datos.presupuesto.total}\n`;
    }
    
    if (datos.presupuesto?.deposito) {
      resumen += `✅ Anticipo requerido: ${datos.presupuesto.deposito}\n`;
    }
    
    if (analisis.faltantes.length > 0) {
      resumen += '\nInformación pendiente:\n';
      
      analisis.faltantes.forEach(campo => {
        const [seccion, propiedad] = campo.split('.');
        let nombreCampo = '';
        
        switch (`${seccion}.${propiedad}`) {
          case 'cliente.nombre': nombreCampo = 'Nombre del cliente'; break;
          case 'cliente.direccion': nombreCampo = 'Dirección del cliente'; break;
          case 'proyecto.descripcion': nombreCampo = 'Descripción del proyecto'; break;
          case 'proyecto.tipoCerca': nombreCampo = 'Tipo de cerca'; break;
          case 'proyecto.material': nombreCampo = 'Material de la cerca'; break;
          case 'presupuesto.total': nombreCampo = 'Precio total'; break;
          case 'presupuesto.deposito': nombreCampo = 'Porcentaje de anticipo'; break;
          default: nombreCampo = propiedad;
        }
        
        resumen += `❓ ${nombreCampo}\n`;
      });
    }
    
    return resumen;
  }

  /**
   * Determina si los datos son suficientes para generar un contrato
   * @param datos Los datos actuales del contrato
   * @returns true si los datos son suficientes, false si faltan campos obligatorios
   */
  datosCompletos(datos: Partial<ContractData>): boolean {
    const analisis = this.analizarDatos(datos);
    return analisis.faltantes.length === 0 || analisis.porcentajeCompletado >= 90;
  }
}

export const contractQuestionService = new ContractQuestionService();