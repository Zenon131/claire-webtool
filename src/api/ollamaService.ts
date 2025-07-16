import ollama from "./ollamaApi";

class OllamaService {
  async generateResponse(prompt: string, options: {
    model?: string;
    temperature?: number;
  } = {}) {
    const { model = "llama3", temperature = 0.7 } = options;
    try {
      return await ollama.generateCompletion(prompt, model);
    } catch (error) {
      console.error("Ollama generation error:", error);
      throw error;
    }
  }
  
  async testConnection(): Promise<boolean> {
    return await ollama.testConnection();
  }
}

const ollamaService = new OllamaService();
export default ollamaService;