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
      
      // For development/testing, we'll return some mock results relevant to the query
      // In production, replace this with actual API call and processing of results
      
      const searchTerms = query.toLowerCase();
      
      // Generate search results based on location and project type mentions
      const results: string[] = [];
      
      // Check for mentions of US locations
      if (searchTerms.includes('california') || searchTerms.includes('ca')) {
        results.push('https://www.cslb.ca.gov/Consumers/Hire_A_Contractor/Building_Permit_Requirements.aspx');
        results.push('https://www.dca.ca.gov/consumers/permits_licenses.shtml');
      }
      
      if (searchTerms.includes('texas') || searchTerms.includes('tx')) {
        results.push('https://www.tdlr.texas.gov/');
        results.push('https://www.texas.gov/topics/business/construction-contracting/');
      }
      
      if (searchTerms.includes('florida') || searchTerms.includes('fl')) {
        results.push('https://www.floridabuilding.org/c/default.aspx');
        results.push('https://www.myfloridalicense.com/intentions2.asp?chBoard=true');
      }
      
      // Add project-specific resources
      if (searchTerms.includes('fence') || searchTerms.includes('fencing')) {
        results.push('https://codes.iccsafe.org/content/IBC2021P1/chapter-3-occupancy-classification-and-use');
        results.push('https://www.fence-material.com/building-codes-permits-fence');
      }
      
      if (searchTerms.includes('deck') || searchTerms.includes('patio')) {
        results.push('https://www.decks.com/how-to/articles/deck-building-code-guidelines');
        results.push('https://deckresource.com/deck-requirements-guide.html');
      }
      
      if (searchTerms.includes('renovation') || searchTerms.includes('remodel')) {
        results.push('https://www.nachi.org/pbr.htm');
        results.push('https://www.epa.gov/lead/renovation-repair-and-painting-program');
      }
      
      // If we didn't get specific matches, add general resources
      if (results.length === 0) {
        results.push('https://www.permits.performance.gov/');
        results.push('https://www.nahb.org/advocacy/top-priorities/building-codes');
        results.push('https://www.iccsafe.org/codes-and-standards/');
      }
      
      // Limit results to top 5 for efficiency
      return results.slice(0, 5);
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
   * Generate a comprehensive summary of permit requirements based on extracted web content
   * @param htmlContents Array of text content from different sources
   * @param projectDetails Details about the project and location
   * @returns Structured summary of permits and requirements
   */
  async generatePermitSummary(htmlContents: string[], projectDetails: any): Promise<any> {
    try {
      console.log('Generating permit summary from collected web content');
      
      // Create a context with all the extracted contents and project details
      const context = `
      Project Type: ${projectDetails.projectType}
      Location: ${projectDetails.address}
      
      I need to determine what permits, licenses and regulations apply to this construction project.
      
      Here is information I've gathered from official sources:
      
      ${htmlContents.join('\n\n---\n\n')}
      `;
      
      // Call OpenAI API to summarize and structure the information
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a construction permit and regulation expert. Analyze the provided information and create a clear, structured summary of what permits, licenses, and regulations apply to the specified project in this location. 
            
            Include the following in JSON format:
            1. Required permits (name, issuing authority, estimated timeline, average cost if available)
            2. Contractor license requirements (type, how to obtain, fees)
            3. Building code regulations that apply (height restrictions, setbacks, etc.)
            4. Inspection requirements
            5. Special considerations for this specific project type
            6. A clear step-by-step process for the contractor to follow
            7. Links to official forms or application portals if mentioned
            
            If specific information is not found in the provided content, indicate this clearly rather than making assumptions.
            Be concise but comprehensive. Format your output as a valid JSON object.`
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
        const result = JSON.parse(response.choices[0].message.content);
        return result;
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        // Return the raw text if JSON parsing fails
        return { 
          raw: response.choices[0].message.content,
          error: "Failed to structure the response properly"
        };
      }
    } catch (error) {
      console.error('Error generating permit summary:', error);
      throw new Error('Failed to analyze permit requirements');
    }
  }
}

// Export a singleton instance
export const searchService = new SearchService();