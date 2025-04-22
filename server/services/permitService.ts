import { searchService } from './searchService';

/**
 * Service for handling construction permit-related queries and regulations
 */
class PermitService {
  // Cache para almacenar resultados previos y mejorar el rendimiento
  private cache: Map<string, {
    data: any,
    timestamp: number
  }> = new Map();
  
  // Tiempo de expiración del caché en milisegundos (1 día)
  private readonly CACHE_EXPIRATION = 24 * 60 * 60 * 1000;
  
  /**
   * Check permits and regulations for a construction project
   * @param address The project address (including city, state or zipcode)
   * @param projectType Type of construction (fence, deck, renovation, etc.)
   * @returns Structured information about required permits and regulations
   */
  async checkPermits(address: string, projectType: string): Promise<any> {
    try {
      console.log(`Checking permits for ${projectType} project at ${address}`);
      
      // Generar clave de caché única para esta combinación de dirección y tipo de proyecto
      const cacheKey = this.generateCacheKey(address, projectType);
      
      // Comprobar si tenemos un resultado en caché válido
      const cachedResult = this.getFromCache(cacheKey);
      if (cachedResult) {
        console.log(`Using cached result for ${projectType} at ${address}`);
        return cachedResult;
      }
      
      // Step 1: Análisis inteligente de la dirección para extraer información geográfica relevante
      const locationInfo = this.analyzeLocation(address);
      console.log(`Location analysis: ${JSON.stringify(locationInfo)}`);
      
      // Step 2: Construir múltiples consultas de búsqueda para obtener información más completa
      const queries = this.buildSearchQueries(projectType, locationInfo);
      console.log(`Generated ${queries.length} search queries for comprehensive results`);
      
      // Step 3: Realizar búsquedas en paralelo para cada consulta
      const allSearchResults: string[] = [];
      
      for (const query of queries) {
        console.log(`Executing search query: "${query}"`);
        const results = await searchService.webSearch(query);
        allSearchResults.push(...results);
      }
      
      // Eliminar duplicados en los resultados de búsqueda
      const uniqueSearchResults = Array.from(new Set(allSearchResults));
      console.log(`Found ${uniqueSearchResults.length} unique relevant sources (from ${allSearchResults.length} total results)`);
      
      // Step 4: Fetch content from each source with prioritization
      // Priorizamos los resultados que parecen más relevantes basados en la URL
      const prioritizedUrls = this.prioritizeUrls(uniqueSearchResults, locationInfo, projectType);
      
      // Limitamos a máximo 12 fuentes para optimizar el tiempo de respuesta
      const urlsToFetch = prioritizedUrls.slice(0, 12);
      
      // Extracción en paralelo del contenido de las páginas
      console.log(`Fetching content from ${urlsToFetch.length} prioritized sources...`);
      const contentPromises = urlsToFetch.map(url => searchService.fetchPage(url));
      const pageContents = await Promise.all(contentPromises);
      
      // Filtrar páginas vacías o con error
      const validPageContents = pageContents.filter(content => 
        !content.startsWith('Failed to fetch content') && content.length > 200
      );
      
      console.log(`Successfully fetched content from ${validPageContents.length} sources`);
      
      // Step 5: Enriquecer los detalles del proyecto con información útil
      const enrichedProjectDetails = {
        projectType,
        address,
        locationInfo,
        sources: urlsToFetch
      };
      
      // Step 6: Generate a comprehensive summary with the collected information
      console.log(`Generating comprehensive permit analysis...`);
      const permitSummary = await searchService.generatePermitSummary(validPageContents, enrichedProjectDetails);
      
      // Step 7: Cache the result for future requests
      this.saveToCache(cacheKey, permitSummary);
      
      return permitSummary;
    } catch (error) {
      console.error('Error checking permits:', error);
      throw new Error('Failed to retrieve permit information');
    }
  }
  
  /**
   * Generate a unique cache key for a permit request
   * @param address Address of the project
   * @param projectType Type of project
   * @returns Cache key string
   */
  private generateCacheKey(address: string, projectType: string): string {
    // Normalizar los valores para mejorar la coincidencia de caché
    const normalizedAddress = address.toLowerCase().trim();
    const normalizedProjectType = projectType.toLowerCase().trim();
    
    return `permit_${normalizedProjectType}_${normalizedAddress}`;
  }
  
  /**
   * Retrieve data from cache if it exists and is not expired
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  private getFromCache(key: string): any | null {
    const cachedItem = this.cache.get(key);
    
    if (cachedItem) {
      const now = Date.now();
      
      // Verificar si el elemento en caché ha expirado
      if (now - cachedItem.timestamp < this.CACHE_EXPIRATION) {
        return cachedItem.data;
      } else {
        // Eliminar el elemento expirado
        this.cache.delete(key);
      }
    }
    
    return null;
  }
  
  /**
   * Save data to the cache
   * @param key Cache key
   * @param data Data to cache
   */
  private saveToCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limitar el tamaño del caché a 100 elementos
    if (this.cache.size > 100) {
      // Eliminar el elemento más antiguo
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }
  
  /**
   * Analyze location from address to extract useful geographic information
   * @param address Full address string
   * @returns Geographic information object
   */
  private analyzeLocation(address: string): any {
    // Extraer partes significativas de la dirección
    const parts = address.split(',').map(part => part.trim());
    const lowercaseAddress = address.toLowerCase();
    
    // Determinar país
    let country = 'unknown';
    if (
      lowercaseAddress.includes('usa') || 
      lowercaseAddress.includes('united states') || 
      lowercaseAddress.includes('us') ||
      /\b[a-z]{2}\s+\d{5}(-\d{4})?\b/i.test(address) // Código postal US formato
    ) {
      country = 'usa';
    } else if (
      lowercaseAddress.includes('mexico') || 
      lowercaseAddress.includes('méxico') || 
      lowercaseAddress.includes('méx') ||
      /\b[0-9]{5}\b/.test(address) && ( // Código postal México + términos específicos
        lowercaseAddress.includes('cdmx') || 
        lowercaseAddress.includes('jalisco') || 
        lowercaseAddress.includes('nuevo león') ||
        lowercaseAddress.includes('nuevo leon')
      )
    ) {
      country = 'mexico';
    }
    
    // Extraer estado/provincia y ciudad
    let state = '';
    let city = '';
    
    if (parts.length >= 2) {
      // Si hay al menos dos partes, asumimos que la última es país o código postal+país
      // y la penúltima es estado/provincia
      state = parts[parts.length - 2];
      
      // Si hay al menos tres partes, la antepenúltima es probable que sea la ciudad
      if (parts.length >= 3) {
        city = parts[parts.length - 3];
      }
    }
    
    // Extraer código postal si está presente
    const zipCodeMatch = address.match(/\b\d{5}(-\d{4})?\b/);
    const zipCode = zipCodeMatch ? zipCodeMatch[0] : '';
    
    return {
      country,
      state,
      city,
      zipCode,
      fullAddress: address
    };
  }
  
  /**
   * Build multiple search queries to get comprehensive information
   * @param projectType Type of construction project
   * @param locationInfo Analyzed location information
   * @returns Array of search queries
   */
  private buildSearchQueries(projectType: string, locationInfo: any): string[] {
    const queries: string[] = [];
    
    // Mapear tipos de proyectos a términos específicos
    const projectTermsMap: Record<string, string[]> = {
      'fence': ['fence', 'fencing', 'property boundary', 'cerca', 'vallado', 'barda'],
      'deck': ['deck', 'patio', 'outdoor structure', 'terraza'],
      'pool': ['swimming pool', 'pool', 'water feature', 'alberca', 'piscina'],
      'remodel': ['remodel', 'renovation', 'interior work', 'remodelación', 'renovación'],
      'addition': ['home addition', 'extension', 'add room', 'ampliación'],
      'garage': ['garage', 'carport', 'vehicle storage', 'garaje', 'cochera'],
      'roofing': ['roof', 'roofing', 'reroof', 'techo', 'tejado']
    };
    
    // Obtener términos específicos para el tipo de proyecto
    const projectTerms = projectTermsMap[projectType] || [projectType];
    
    // Construir localización para las consultas
    let locationQuery = '';
    if (locationInfo.city && locationInfo.state) {
      locationQuery = `${locationInfo.city}, ${locationInfo.state}`;
    } else if (locationInfo.state) {
      locationQuery = locationInfo.state;
    } else {
      locationQuery = locationInfo.fullAddress;
    }
    
    // Generar consultas específicas para cada término del proyecto
    for (const term of projectTerms) {
      queries.push(`${term} permit requirements in ${locationQuery}`);
      queries.push(`${term} building code ${locationQuery}`);
      
      // Consultas específicas por país
      if (locationInfo.country === 'usa') {
        queries.push(`${term} construction permit US ${locationQuery}`);
        queries.push(`${locationQuery} building department ${term} regulations`);
      } else if (locationInfo.country === 'mexico') {
        queries.push(`${term} permiso construcción ${locationQuery}`);
        queries.push(`normativa ${term} ${locationQuery} México`);
        queries.push(`trámites municipales ${term} ${locationQuery}`);
      }
    }
    
    // Consultas específicas para regulaciones y códigos
    queries.push(`zoning regulations ${projectType} ${locationQuery}`);
    queries.push(`building code requirements ${projectType} ${locationQuery}`);
    queries.push(`construction permits ${locationQuery} official website`);
    
    // Eliminar duplicados
    return Array.from(new Set(queries));
  }
  
  /**
   * Prioritize URLs based on relevance to the project and location
   * @param urls Array of URLs to prioritize
   * @param locationInfo Location information object
   * @param projectType Type of project
   * @returns Prioritized array of URLs
   */
  private prioritizeUrls(urls: string[], locationInfo: any, projectType: string): string[] {
    // Función para calcular una puntuación de relevancia para cada URL
    const getUrlScore = (url: string): number => {
      const lowerUrl = url.toLowerCase();
      let score = 0;
      
      // Puntuación por dominio de origen oficial
      if (lowerUrl.includes('.gov') || lowerUrl.includes('.gob')) score += 30;
      if (lowerUrl.includes('.edu')) score += 20;
      if (lowerUrl.includes('.org')) score += 15;
      
      // Puntuación por relevancia al tipo de proyecto
      if (lowerUrl.includes(projectType.toLowerCase())) score += 25;
      
      // Términos relacionados con permisos y códigos
      if (lowerUrl.includes('permit')) score += 20;
      if (lowerUrl.includes('code') || lowerUrl.includes('regulation')) score += 15;
      if (lowerUrl.includes('building') || lowerUrl.includes('construction')) score += 10;
      if (lowerUrl.includes('department') || lowerUrl.includes('agency')) score += 10;
      
      // Relevancia geográfica
      if (locationInfo.city && lowerUrl.includes(locationInfo.city.toLowerCase())) score += 25;
      if (locationInfo.state && lowerUrl.includes(locationInfo.state.toLowerCase())) score += 20;
      if (locationInfo.country === 'usa' && lowerUrl.includes('usa')) score += 15;
      if (locationInfo.country === 'mexico' && (lowerUrl.includes('mexico') || lowerUrl.includes('méxico'))) score += 15;
      
      return score;
    };
    
    // Calcular puntuación para cada URL y ordenar de mayor a menor puntuación
    const scoredUrls = urls.map(url => ({
      url,
      score: getUrlScore(url)
    }));
    
    scoredUrls.sort((a, b) => b.score - a.score);
    
    // Retornar sólo las URLs ordenadas
    return scoredUrls.map(item => item.url);
  }
}

export const permitService = new PermitService();