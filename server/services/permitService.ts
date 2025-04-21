import { searchService } from './searchService';

/**
 * Service for handling construction permit-related queries
 */
class PermitService {
  /**
   * Check permits and regulations for a construction project
   * @param address The project address (including city, state or zipcode)
   * @param projectType Type of construction (fence, deck, renovation, etc.)
   * @returns Structured information about required permits and regulations
   */
  async checkPermits(address: string, projectType: string): Promise<any> {
    try {
      console.log(`Checking permits for ${projectType} project at ${address}`);
      
      // Step 1: Build search query based on project details
      const location = this.extractLocation(address);
      const query = `${projectType} construction permit requirements in ${location}`;
      
      // Step 2: Search for relevant sources
      const searchResults = await searchService.webSearch(query);
      console.log(`Found ${searchResults.length} relevant sources`);
      
      // Step 3: Fetch content from each source
      const contentPromises = searchResults.map(url => searchService.fetchPage(url));
      const pageContents = await Promise.all(contentPromises);
      
      // Step 4: Generate a comprehensive summary
      const projectDetails = {
        projectType,
        address
      };
      
      const permitSummary = await searchService.generatePermitSummary(pageContents, projectDetails);
      
      // Add metadata
      return {
        ...permitSummary,
        meta: {
          sources: searchResults,
          generated: new Date().toISOString(),
          projectType,
          location
        }
      };
    } catch (error) {
      console.error('Error checking permits:', error);
      throw new Error('Failed to retrieve permit information');
    }
  }
  
  /**
   * Extract location information from an address
   * @param address Full address string
   * @returns Location part (city/state)
   */
  private extractLocation(address: string): string {
    // Simple extraction of location from address
    const parts = address.split(',').map(part => part.trim());
    
    // If we have multiple parts, use the last 1-2 parts (city, state)
    if (parts.length > 1) {
      return parts.slice(-2).join(', ');
    }
    
    return address; // Return full address if we can't parse it
  }
}

export const permitService = new PermitService();