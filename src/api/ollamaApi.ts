const ollama = {
  generateCompletion: async (prompt: string, model = "gemma3:4b") => {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama generateCompletion error: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get reader from response body.");
    }
    const decoder = new TextDecoder();
    let result = '';
    let lastResponse: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      result += chunk;
      
      // Process each line as a separate JSON object
      const lines = result.split('\n');
      result = lines.pop() || ''; // Keep the last (possibly incomplete) line

      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          const json = JSON.parse(line);
          lastResponse = json; // Keep track of the last successful parse
        } catch (e) {
          console.warn("Failed to parse JSON line:", line, e);
        }
      }
    }
    return lastResponse; // Return the last successfully parsed JSON object
  },
  
  // Add test connection function
  testConnection: async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:11434/api/version', {
        method: 'GET'
      });
      return response.status === 200;
    } catch (error) {
      console.warn("Ollama server not available:", error);
      return false;
    }
  }
};

export default ollama;