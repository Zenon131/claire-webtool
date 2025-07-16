const ollama = {
  generateCompletion: async (prompt, model = "llama3") => {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt })
    });
    return response.json();
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