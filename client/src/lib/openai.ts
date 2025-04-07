import { apiRequest } from "./queryClient";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const GPT_MODEL = "gpt-4o";

export async function generateEstimate(projectDetails: any): Promise<string> {
  try {
    const response = await apiRequest("POST", "/api/generate-estimate", {
      projectDetails
    });
    
    const data = await response.json();
    return data.html;
  } catch (error) {
    console.error("Error generating estimate:", error);
    throw error;
  }
}

export async function generateContract(projectDetails: any): Promise<string> {
  try {
    const response = await apiRequest("POST", "/api/generate-contract", {
      projectDetails
    });
    
    const data = await response.json();
    return data.html;
  } catch (error) {
    console.error("Error generating contract:", error);
    throw error;
  }
}

export async function processChatMessage(message: string, context: any): Promise<any> {
  try {
    const response = await apiRequest("POST", "/api/chat", {
      message,
      context
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error processing chat message:", error);
    throw error;
  }
}
