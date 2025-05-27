import axios from 'axios';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Service for handling web search and content extraction
 */
class SearchService {
  /**
   * Search for relevant web pages about permits and regulations
   * @param query Search query
   * @returns Array of most relevant URLs
   */
  async webSearch(query: string): Promise<string[]> {
    // For production, you would integrate a real search API like SerpAPI or Google Custom Search API
    console.log(`Executing web search for: ${query}`);
    
    try {
      // This is where you would make an API call to your search provider
      // For example: const response = await axios.get('https://serpapi.com/search', {...})
      
      // Parse the search query to extract more detailed information
      const searchTerms = query.toLowerCase();
      const results: string[] = [];
      
      // Advanced extraction of location information
      const locationMap: Record<string, string[]> = {
        // Estados Unidos - principales estados
        'california': ['ca', 'los angeles', 'san francisco', 'san diego', 'sacramento'],
        'texas': ['tx', 'dallas', 'houston', 'austin', 'san antonio', 'fort worth'],
        'florida': ['fl', 'miami', 'orlando', 'tampa', 'jacksonville'],
        'new york': ['ny', 'nyc', 'buffalo', 'albany'],
        'illinois': ['il', 'chicago', 'springfield'],
        'arizona': ['az', 'phoenix', 'tucson', 'scottsdale'],
        'nevada': ['nv', 'las vegas', 'reno'],
        'oregon': ['or', 'portland', 'eugene', 'salem'],
        'washington': ['wa', 'seattle', 'tacoma', 'spokane'],
        'colorado': ['co', 'denver', 'boulder', 'colorado springs'],
        'michigan': ['mi', 'detroit', 'ann arbor', 'grand rapids'],
        
        // México - principales estados
        'ciudad de méxico': ['cdmx', 'df', 'distrito federal'],
        'nuevo león': ['nuevo leon', 'monterrey'],
        'jalisco': ['guadalajara'],
        'baja california': ['tijuana', 'mexicali', 'ensenada'],
        'quintana roo': ['cancun', 'playa del carmen', 'tulum'],
        'estado de méxico': ['estado de mexico', 'toluca', 'ecatepec'],
        'chihuahua': ['ciudad juarez'],
        'yucatán': ['yucatan', 'merida'],
        'puebla': [],
        'querétaro': ['queretaro'],
        'guanajuato': ['leon', 'irapuato', 'celaya'],
      };
      
      let detectedLocations: string[] = [];
      
      // Detect locations in search query
      Object.entries(locationMap).forEach(([mainLocation, alternatives]) => {
        if (searchTerms.includes(mainLocation.toLowerCase())) {
          detectedLocations.push(mainLocation);
        }
        
        alternatives.forEach(alt => {
          if (searchTerms.includes(alt.toLowerCase())) {
            detectedLocations.push(mainLocation);
          }
        });
      });
      
      // Project types with more specific categories
      const projectTypeMap: Record<string, string[]> = {
        'fence': ['vallado', 'cerca', 'cercado', 'muro', 'barda', 'cerramiento'],
        'deck': ['terraza', 'patio', 'balcón', 'balcon', 'plataforma', 'veranda'],
        'remodel': ['remodelación', 'remodelacion', 'renovación', 'renovacion', 'rehabilitación', 'rehabilitacion'],
        'addition': ['ampliación', 'ampliacion', 'extensión', 'extension', 'adición', 'adicion'],
        'newConstruction': ['nueva construcción', 'nueva construccion', 'edificación', 'edificacion'],
        'pool': ['piscina', 'alberca', 'natatorio', 'spa'],
        'garage': ['garaje', 'cochera', 'carport'],
        'solarPanel': ['paneles solares', 'energía solar', 'energia solar', 'fotovoltaico'],
        'roofing': ['tejado', 'techo', 'cubierta', 'roof', 'techar'],
        'plumbing': ['plomería', 'plomeria', 'fontanería', 'fontaneria', 'agua'],
        'electrical': ['eléctrico', 'electrico', 'instalación eléctrica', 'instalacion electrica'],
        'hvac': ['climatización', 'climatizacion', 'aire acondicionado', 'calefacción', 'calefaccion'],
        'driveway': ['entrada', 'acceso vehicular', 'camino de entrada'],
        'landscaping': ['paisajismo', 'jardinería', 'jardineria', 'landscaping']
      };
      
      let detectedProjectTypes: string[] = [];
      
      // Detect project types in search query
      Object.entries(projectTypeMap).forEach(([mainType, alternatives]) => {
        if (searchTerms.includes(mainType.toLowerCase())) {
          detectedProjectTypes.push(mainType);
        }
        
        alternatives.forEach(alt => {
          if (searchTerms.includes(alt.toLowerCase())) {
            detectedProjectTypes.push(mainType);
          }
        });
      });
      
      // Location-specific resources (expanded for more locations)
      if (detectedLocations.includes('california') || searchTerms.includes('ca')) {
        results.push('https://www.cslb.ca.gov/Consumers/Hire_A_Contractor/Building_Permit_Requirements.aspx');
        results.push('https://www.dca.ca.gov/consumers/permits_licenses.shtml');
        results.push('https://www.ladbs.org/permits'); // Los Angeles specifically
        results.push('https://www.sandiego.gov/development-services/permits'); // San Diego
      }
      
      if (detectedLocations.includes('texas') || searchTerms.includes('tx')) {
        results.push('https://www.tdlr.texas.gov/');
        results.push('https://www.texas.gov/topics/business/construction-contracting/');
        results.push('https://www.sanantonio.gov/DSD/Constructing'); // San Antonio
        results.push('https://www.houstonpermittingcenter.org/'); // Houston
        results.push('https://www.austintexas.gov/department/building-permits'); // Austin
      }
      
      if (detectedLocations.includes('florida') || searchTerms.includes('fl')) {
        results.push('https://www.floridabuilding.org/c/default.aspx');
        results.push('https://www.myfloridalicense.com/intentions2.asp?chBoard=true');
        results.push('https://www.miamidade.gov/permits/'); // Miami
        results.push('https://www.orlando.gov/Building-Development/Permits'); // Orlando
      }
      
      if (detectedLocations.includes('new york') || searchTerms.includes('ny') || searchTerms.includes('nyc')) {
        results.push('https://www.nyc.gov/site/buildings/homeowner/permits.page');
        results.push('https://www.dos.ny.gov/licensing/');
      }
      
      // México - recursos específicos por localidad
      if (searchTerms.includes('mexico') || searchTerms.includes('méxico') || searchTerms.includes('mexican')) {
        results.push('https://www.gob.mx/tramites/construccion');
        results.push('https://www.gob.mx/conamer');
      }
      
      if (detectedLocations.includes('ciudad de méxico') || searchTerms.includes('cdmx') || searchTerms.includes('df')) {
        results.push('https://www.seduvi.cdmx.gob.mx/servicios/servicio/tramites-y-servicios');
        results.push('https://tramites.cdmx.gob.mx/inicio/index.jsp?opcion=32');
      }
      
      if (detectedLocations.includes('nuevo león') || searchTerms.includes('monterrey')) {
        results.push('https://www.nl.gob.mx/tramitesyservicios');
        results.push('https://www.monterrey.gob.mx/oficial/tramites.asp');
      }
      
      // Project-specific resources (expanded with more detailed information)
      if (detectedProjectTypes.includes('fence') || searchTerms.includes('fence') || searchTerms.includes('fencing') || 
          searchTerms.includes('cerca') || searchTerms.includes('vallado')) {
        results.push('https://codes.iccsafe.org/content/IBC2021P1/chapter-3-occupancy-classification-and-use');
        results.push('https://www.fence-material.com/building-codes-permits-fence');
        results.push('https://americanfenceassociation.com/resources/');
        results.push('https://www.homedepot.com/c/ab/fence-building-codes/9ba683603be9fa5395fab90124ddebaf');
      }
      
      if (detectedProjectTypes.includes('deck') || searchTerms.includes('deck') || searchTerms.includes('patio') || 
          searchTerms.includes('terraza')) {
        results.push('https://www.decks.com/how-to/articles/deck-building-code-guidelines');
        results.push('https://deckresource.com/deck-requirements-guide.html');
        results.push('https://www.thisoldhouse.com/decks/21016194/deck-permits');
        results.push('https://www.nadra.org/resources/code-requirements/');
      }
      
      if (detectedProjectTypes.includes('remodel') || searchTerms.includes('renovation') || searchTerms.includes('remodel') || 
          searchTerms.includes('remodelación') || searchTerms.includes('renovación')) {
        results.push('https://www.nachi.org/pbr.htm');
        results.push('https://www.epa.gov/lead/renovation-repair-and-painting-program');
        results.push('https://www.nari.org/homeowners/resources/');
      }
      
      if (detectedProjectTypes.includes('addition') || searchTerms.includes('addition') || searchTerms.includes('ampliación')) {
        results.push('https://codes.iccsafe.org/content/IBC2021P1/chapter-10-means-of-egress');
        results.push('https://www.jlconline.com/how-to/additions/code-requirements-for-home-additions_o');
      }
      
      if (detectedProjectTypes.includes('pool') || searchTerms.includes('pool') || searchTerms.includes('piscina') || 
          searchTerms.includes('alberca')) {
        results.push('https://www.iapmo.org/swim-pool-code/');
        results.push('https://www.swimmingpool.com/resources/pool-laws-and-regulations/');
        results.push('https://www.apsp.org/resources/standards-and-codes');
      }
      
      if (detectedProjectTypes.includes('solarPanel') || searchTerms.includes('solar') || searchTerms.includes('paneles solares')) {
        results.push('https://www.energy.gov/eere/solar/homeowners-guide-going-solar');
        results.push('https://www.seia.org/initiatives/codes-standards');
        results.push('https://www.nrel.gov/docs/fy18osti/70298.pdf');
      }
      
      // If we didn't get specific matches, add general resources
      if (results.length === 0) {
        results.push('https://www.permits.performance.gov/');
        results.push('https://www.nahb.org/advocacy/top-priorities/building-codes');
        results.push('https://www.iccsafe.org/codes-and-standards/');
        results.push('https://www.nfpa.org/codes-and-standards');
        results.push('https://www.osha.gov/construction');
      }
      
      // Add resources for both US and Mexico about cross-border permits if relevant
      if ((searchTerms.includes('mexico') || searchTerms.includes('méxico')) && 
          (searchTerms.includes('us') || searchTerms.includes('usa') || searchTerms.includes('united states'))) {
        results.push('https://mx.usembassy.gov/business/');
        results.push('https://www.trade.gov/knowledge-product/mexico-construction');
      }
      
      // Remove any duplicate URLs
      const uniqueResults = Array.from(new Set(results));
      
      // Limit results to top 8 for comprehensive but manageable results
      return uniqueResults.slice(0, 8);
    } catch (error) {
      console.error('Error performing web search:', error);
      throw new Error('Failed to search for permit information');
    }
  }

  /**
   * Fetch and extract content from a webpage
   * @param url URL to fetch
   * @returns Extracted text content
   */
  async fetchPage(url: string): Promise<string> {
    console.log(`Fetching content from: ${url}`);
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml'
        },
        timeout: 10000
      });
      
      return this.summarizeHtml(response.data, url);
    } catch (error) {
      console.error(`Error fetching page ${url}:`, error);
      return `Failed to fetch content from ${url}`;
    }
  }

  /**
   * Extract and clean text from HTML content
   * @param html HTML content
   * @param url Source URL
   * @returns Cleaned and formatted text
   */
  async summarizeHtml(html: string, url: string): Promise<string> {
    try {
      // Load HTML into cheerio
      const $ = cheerio.load(html);
      
      // Remove unwanted elements
      $('script, style, nav, footer, header, iframe, noscript, svg, .cookie-banner, .advertisement, .ads, .menu').remove();
      
      // Extract relevant content
      const title = $('title').text().trim();
      let mainContent = '';
      
      // Try to find main content areas
      const contentSelectors = [
        'main', 'article', '[role="main"]', '#content', '.content', 
        '.main-content', '.article', '.post-content', '.entry-content'
      ];
      
      let found = false;
      for (const selector of contentSelectors) {
        if ($(selector).length > 0) {
          mainContent = $(selector).text().trim();
          found = true;
          break;
        }
      }
      
      // If no main content area found, use body
      if (!found) {
        mainContent = $('body').text();
      }
      
      // Clean the text
      let cleanText = mainContent
        .replace(/\s+/g, ' ')         // Replace multiple whitespace with single space
        .replace(/\n+/g, '\n')        // Replace multiple newlines with single newline
        .trim();
      
      // Extract important headers for context
      const headers: string[] = [];
      $('h1, h2, h3').each((_, el) => {
        const headerText = $(el).text().trim();
        if (headerText && headerText.length > 5 && headerText.length < 100) {
          headers.push(headerText);
        }
      });
      
      // Combine headers with clean text for better context
      let result = `Source: ${url}\nTitle: ${title}\n\n`;
      
      if (headers.length > 0) {
        result += `Important sections:\n${headers.join('\n')}\n\n`;
      }
      
      result += `Content:\n${cleanText.substring(0, 15000)}`; // Limit content length
      
      return result;
    } catch (error) {
      console.error(`Error extracting content from ${url}:`, error);
      return `Failed to extract content from ${url}`;
    }
  }

  /**
   * Generate a comprehensive summary of permit requirements using OpenAI's advanced knowledge
   * @param htmlContents Array of text content from different sources (currently not used, OpenAI has comprehensive knowledge)
   * @param projectDetails Details about the project and location
   * @returns Structured summary of permits and requirements
   */
  async generatePermitSummary(htmlContents: string[], projectDetails: any): Promise<any> {
    try {
      console.log('Generating comprehensive permit summary using OpenAI advanced knowledge');
      
      // Extract detailed project information
      const projectType = projectDetails.projectType;
      const address = projectDetails.address;
      
      // Create a highly detailed context for OpenAI to provide real, specific information
      const context = `
      PROYECTO DE CONSTRUCCIÓN ESPECÍFICO:
      Tipo de Proyecto: ${projectType}
      Ubicación completa: ${address}
      
      OBJETIVO CRÍTICO:
      Necesito información REAL, ESPECÍFICA y ACTUALIZADA sobre permisos, regulaciones y requisitos para este proyecto exacto en esta ubicación exacta. Esta información será utilizada por contratistas profesionales que necesitan datos precisos para cumplir con la ley y evitar multas.
      
      REQUIERO INFORMACIÓN ESPECÍFICA Y REAL INCLUYENDO:
      - Nombres exactos de departamentos gubernamentales locales
      - Números telefónicos y direcciones reales de oficinas de permisos
      - URLs reales de portales gubernamentales y formularios
      - Contactos específicos de inspectores cuando sea posible
      - Costos exactos de permisos basados en tarifas oficiales actuales
      - Procesos específicos de la jurisdicción local (ciudad/condado)
      - Códigos de construcción específicos con números de sección reales
      
      POR FAVOR PROPORCIONA INFORMACIÓN REAL Y ESPECÍFICA, NO GENÉRICA.`;
      
      // Call OpenAI API to generate a comprehensive structured analysis
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Eres un experto altamente especializado en permisos de construcción, códigos de edificación y regulaciones gubernamentales en Estados Unidos y México. Tu conocimiento incluye información actualizada sobre departamentos gubernamentales específicos, procesos oficiales, contactos directos y requisitos legales exactos.

MISIÓN CRÍTICA:
Proporcionar información REAL, ESPECÍFICA y ACTUALIZADA que justifique un servicio premium de $100/mes. Los contratistas necesitan datos precisos para evitar multas legales y completar proyectos exitosamente.

ESTÁNDARES DE EXCELENCIA REQUERIDOS:
1. INFORMACIÓN REAL Y ESPECÍFICA: Proporciona nombres exactos de departamentos, direcciones físicas reales, números telefónicos actuales, y URLs oficiales de portales gubernamentales.

2. CONTACTOS DIRECTOS: Incluye información de contacto específica de inspectores, supervisores de permisos, y oficiales de código cuando sea posible.

3. COSTOS EXACTOS: Proporciona tarifas reales de permisos basadas en las estructuras de costos oficiales actuales de la jurisdicción específica.

4. PROCESOS DETALLADOS: Describe paso a paso los procesos oficiales específicos para esa ciudad/condado, incluyendo formularios exactos y sus números de referencia.

5. CÓDIGOS ESPECÍFICOS: Cita secciones exactas de códigos de construcción con números de referencia reales.

6. JURISDICCIÓN EXACTA: Identifica la ciudad exacta, condado, y autoridades que tienen jurisdicción sobre esa dirección específica.

7. INFORMACIÓN PREMIUM: Incluye detalles que van más allá de lo que encontrarían en búsquedas básicas de Google - información privilegiada que solo un experto conocería.

Tu respuesta debe incluir todos los siguientes componentes en formato JSON:

1. requiredPermits: Array de permisos necesarios, cada uno con:
   - name: Nombre exacto del permiso
   - issuingAuthority: Autoridad específica que lo emite
   - estimatedTimeline: Tiempo de procesamiento típico
   - averageCost: Costo promedio (si está disponible)
   - description: Descripción detallada del propósito y alcance
   - requirements: Requisitos específicos para obtenerlo
   - url: Enlaces a formularios o portales oficiales (si están disponibles)

2. licenseRequirements: Array de requisitos de licencia para contratistas:
   - type: Tipo específico de licencia requerida
   - obtainingProcess: Proceso detallado para obtenerla
   - fees: Tarifas exactas
   - renewalInfo: Información sobre renovación
   - bondingInsurance: Requisitos de fianza y seguro
   - url: Enlaces a recursos oficiales (si están disponibles)
   - verificationProcess: Cómo los clientes pueden verificar una licencia

3. buildingCodeRegulations: Array de regulaciones de código aplicables:
   - type: Tipo de regulación (estructural, zonificación, etc.)
   - details: Detalles específicos de la regulación
   - codeReference: Referencia exacta al código (número, sección)
   - restrictions: Restricciones específicas aplicables
   - measurements: Medidas precisas cuando sea relevante (altura, distancias, etc.)
   - applicableAreas: Áreas específicas donde aplica la regulación

4. inspectionRequirements: Array de inspecciones requeridas:
   - type: Tipo específico de inspección
   - timing: Cuándo debe realizarse en el cronograma del proyecto
   - contactInfo: Información de contacto del departamento de inspección
   - schedulingProcess: Proceso exacto para programar la inspección
   - preparationNeeded: Qué debe prepararse antes de la inspección
   - commonIssues: Problemas comunes a evitar

5. specialConsiderations: Array de consideraciones especiales para este proyecto:
   - Incluir aspectos únicos como requisitos ambientales, históricos, de accesibilidad, etc.
   - Ser muy específico para el tipo de proyecto y ubicación

6. process: Array ordenado de pasos que el contratista debe seguir:
   - Lista cronológica y detallada de cada paso necesario
   - Incluir tanto los pasos previos a la construcción como durante la construcción
   - Señalar dependencias (qué debe completarse antes de qué)

7. timeline: Objeto con información sobre plazos:
   - totalEstimatedTime: Tiempo total estimado para completar todos los trámites
   - criticalPathItems: Elementos que podrían causar los mayores retrasos
   - bestTimeToApply: Mejores momentos para solicitar (si es aplicable)
   - expirationPeriods: Período de validez de permisos y aprobaciones

8. costAnalysis: Objeto con análisis de costos:
   - totalEstimatedCost: Costo total estimado de todos los permisos y licencias
   - variableFactors: Factores que podrían modificar el costo
   - feeScheduleUrl: Enlaces a programas de tarifas oficiales (si están disponibles)
   - paymentMethods: Métodos de pago aceptados

9. links: Array de recursos útiles:
   - name: Nombre descriptivo del recurso
   - url: URL completa
   - description: Para qué sirve el recurso
   - relevance: Por qué es relevante para este proyecto específico

10. contactInformation: Array de contactos oficiales:
    - department: Nombre exacto del departamento
    - purpose: Propósito específico de contactar
    - phone: Número telefónico directo real
    - email: Correo electrónico oficial
    - address: Dirección física exacta de la oficina
    - hours: Horarios específicos de atención
    - website: URL oficial del departamento
    - onlinePortal: URL del portal de permisos en línea si existe
    - inspectorContact: Información específica de inspectores cuando sea posible

11. jurisdictionDetails: Información específica de la jurisdicción:
    - city: Ciudad exacta con jurisdicción
    - county: Condado específico  
    - buildingDepartment: Nombre exacto del departamento de construcción
    - planningDepartment: Departamento de planificación si aplica
    - fireMarshall: Información del departamento de bomberos si es requerido
    - healthDepartment: Si se requieren permisos de salud
    - environmentalAgency: Agencias ambientales relevantes

12. realWorldExamples: Ejemplos específicos y reales:
    - similarProjects: Proyectos similares en la misma área
    - typicalTimelines: Tiempos reales basados en experiencias locales
    - commonChallenges: Desafíos específicos comunes en esa jurisdicción
    - localContractorTips: Consejos específicos para esa área

MANDATO CRÍTICO: Esta información debe ser REAL y ESPECÍFICA para la ubicación exacta proporcionada. Utiliza tu conocimiento actualizado sobre departamentos gubernamentales, códigos locales, y procesos específicos. NO uses información genérica. Los contratistas pagarán $100/mes por esta precisión y especificidad.`
          },
          {
            role: "user",
            content: context
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse and return the structured data
      try {
        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No content received from OpenAI');
        }
        
        const result = JSON.parse(content);
        
        // Add metadata for frontend use
        result.meta = {
          sources: projectDetails.sources || [],
          generated: new Date().toISOString(),
          projectType,
          location: this.extractLocationFromAddress(address),
          fullAddress: address
        };
        
        return result;
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        // Return the raw text if JSON parsing fails
        return { 
          raw: response.choices[0].message.content || 'No content received',
          error: "Failed to structure the response properly",
          meta: {
            generated: new Date().toISOString(),
            projectType,
            location: this.extractLocationFromAddress(address),
            fullAddress: address
          }
        };
      }
    } catch (error) {
      console.error('Error generating permit summary:', error);
      throw new Error('Failed to analyze permit requirements');
    }
  }
  
  /**
   * Extract location information from an address string
   * @param address Full address string
   * @returns Extracted location
   */
  private extractLocationFromAddress(address: string): string {
    // Simple extraction of location from address
    const parts = address.split(',').map(part => part.trim());
    
    // If we have multiple parts, use the last 1-2 parts (city, state)
    if (parts.length > 1) {
      return parts.slice(-2).join(', ');
    }
    
    return address; // Return full address if we can't parse it
  }
}

// Export a singleton instance
export const searchService = new SearchService();