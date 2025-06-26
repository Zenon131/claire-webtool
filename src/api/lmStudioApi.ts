import axios from "axios";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
}

interface Protocols {
  directive: string;
  context: string;
  rationale: string;
  examples: string[];
  constraints: string[];
  tools?: {
    name: string;
    description: string;
    parameters: {
      name: string;
      type: string;
      description: string;
      required: boolean;
    }[];
  }[];
}

interface ToolCall {
  name: string;
  parameters: Record<string, any>;
}

interface Tool {
  name: string;
  description: string;
  parameters: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
  handler: (params: Record<string, any>) => Promise<any>;
  category?: string;
}

interface AgenticState {
  currentTask?: string;
  taskSteps: string[];
  completedSteps: string[];
  context: Record<string, any>;
  maxTurns: number;
  currentTurn: number;
}

interface CloudProvider {
  name: string;
  apiKey?: string;
  baseUrl: string;
  models: string[];
}

interface APIConfiguration {
  useLocal: boolean;
  localUrl: string;
  cloudProvider?: CloudProvider;
}

class LMStudioAPI {
  private baseUrl: string;
  private defaultModel: string;
  private tools: Map<string, Tool> = new Map();
  private agenticState: AgenticState | null = null;

  constructor(
    baseUrl: string = "http://localhost:6223",
    defaultModel: string = "google/gemma-3-4b"
  ) {
    this.baseUrl = baseUrl;
    this.defaultModel = defaultModel;
    this.initializeDefaultTools();
  }

  setBaseUrl(url: string): void {
    // Remove trailing slash if present
    this.baseUrl = url.replace(/\/$/, "");
    // Remove /v1 if it's at the end since we add it in chatCompletion
    this.baseUrl = this.baseUrl.replace(/\/v1$/, "");
  }

  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }

  /**
   * Get the current default model
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  // Initialize default tools
  private initializeDefaultTools(): void {
    this.registerTool({
      name: "search_wikipedia",
      description: "Search Wikipedia for information about a topic",
      parameters: [
        {
          name: "query",
          type: "string",
          description: "The topic to search for on Wikipedia",
          required: true,
        },
      ],
      handler: async (params) => {
        const { searchWikipedia } = await import("../tools/wikiSearch");
        const result = await searchWikipedia(params.query);
        if (result.success && result.data) {
          return {
            title: result.data.title,
            summary: result.data.summary,
            url: result.data.url,
          };
        }
        throw new Error(result.error);
      },
      category: "research",
    });

    this.registerTool({
      name: "analyze_text",
      description:
        "Analyze text for sentiment, keywords, readability, or structure",
      parameters: [
        {
          name: "text",
          type: "string",
          description: "Text to analyze",
          required: true,
        },
        {
          name: "type",
          type: "string",
          description:
            "Analysis type: sentiment, keywords, readability, structure",
          required: true,
        },
      ],
      handler: async (params) => {
        return this.performTextAnalysis(params.text, params.type);
      },
      category: "analysis",
    });

    this.registerTool({
      name: "summarize_content",
      description:
        "Create summaries of long content with different focus areas",
      parameters: [
        {
          name: "content",
          type: "string",
          description: "Content to summarize",
          required: true,
        },
        {
          name: "focus",
          type: "string",
          description:
            "Summary focus: key_points, technical, executive, detailed",
          required: false,
        },
        {
          name: "length",
          type: "string",
          description: "Summary length: brief, medium, detailed",
          required: false,
        },
      ],
      handler: async (params) => {
        return this.createSummary(
          params.content,
          params.focus || "key_points",
          params.length || "medium"
        );
      },
      category: "content",
    });

    this.registerTool({
      name: "plan_task",
      description: "Break down complex tasks into manageable steps",
      parameters: [
        {
          name: "task",
          type: "string",
          description: "The complex task to plan",
          required: true,
        },
        {
          name: "context",
          type: "string",
          description: "Additional context or constraints",
          required: false,
        },
      ],
      handler: async (params) => {
        return this.createTaskPlan(params.task, params.context);
      },
      category: "planning",
    });
  }

  // Tool registration and management
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  getAvailableTools(category?: string): Tool[] {
    const tools = Array.from(this.tools.values());
    return category
      ? tools.filter((tool) => tool.category === category)
      : tools;
  }

  private async processToolCall(toolCall: ToolCall): Promise<string> {
    const tool = this.tools.get(toolCall.name);
    if (!tool) {
      return `[TOOL_ERROR]Unknown tool: ${
        toolCall.name
      }. Available tools: ${Array.from(this.tools.keys()).join(
        ", "
      )}[/TOOL_ERROR]`;
    }

    try {
      const result = await tool.handler(toolCall.parameters);
      return `[TOOL_RESULT:${toolCall.name}]${JSON.stringify(
        result
      )}[/TOOL_RESULT]`;
    } catch (error) {
      return `[TOOL_ERROR:${toolCall.name}]${error}[/TOOL_ERROR]`;
    }
  }

  async chatCompletion(
    messages: ChatMessage[],
    model: string = this.defaultModel,
    temperature: number = 0.7,
    maxTokens: number = 100000
  ): Promise<string> {
    console.log(
      `LMStudioAPI: calling chatCompletion with baseUrl=${this.baseUrl}, model=${model}`
    );

    try {
      // Extract tool calls from the last message using enhanced detection
      const lastMessage = messages[messages.length - 1];
      const toolCalls = this.detectToolRequests(lastMessage.content);

      // Process tool calls if any
      if (toolCalls.length > 0) {
        const results = await this.processToolChain(toolCalls);
        // Add tool results to messages
        messages = [
          ...messages,
          {
            role: "system",
            content: `Tool results: ${results.join("\n")}`,
          },
        ];
      }

      // make API call
      const response = await axios.post<ChatCompletionResponse>(
        `${this.baseUrl}/v1/chat/completions`,
        {
          messages,
          model,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        } as ChatCompletionRequest,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Clean up response content by removing XML-like tags
      let content = response.data.choices[0].message.content;
      content = content.replace(/<think>.*?<\/think>/gs, "");
      content = content.replace(/<\/?think>/g, "");
      content = content.trim();

      return content;
    } catch (error) {
      console.error("Error calling LM Studio API:", error);
      throw error;
    }
  }

  // Add fallback for when local server is unavailable
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/models`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.warn("Local AI server not available:", error);
      return false;
    }
  }

  // Graceful fallback when server unavailable
  async chatCompletionWithFallback(
    messages: ChatMessage[],
    model: string = this.defaultModel,
    temperature: number = 0.7,
    maxTokens: number = 100000
  ): Promise<string> {
    const isConnected = await this.testConnection();

    if (!isConnected) {
      return "⚠️ Claire is currently offline. Please check that your local AI server (LM Studio) is running, or configure a cloud AI provider in settings.";
    }

    return this.chatCompletion(messages, model, temperature, maxTokens);
  }

  // get protocols for different assistant modes
  getProtocols(mode: string): Protocols {
    const protocols: Record<string, Protocols> = {
      general: {
        directive:
          "You are Claire, an AI assistant that helps with a variety of tasks.",
        context: "You are helpful, friendly, witty, and engaging.",
        rationale: "Your responses should be short, to the point, and concise.",
        examples: [
          "What is the weather like today?",
          "Can you help me with my homework?",
          "Tell me a joke.",
        ],
        constraints: [
          "Be polite and respectful.",
          "Avoid sensitive topics.",
          "Do not provide medical or legal advice.",
        ],
      },
      writing: {
        directive: "You are Claire, a writing assistant.",
        context:
          "You help users improve their writing by offering suggestions, edits, and feedback.",
        rationale: "Focus on clarity, conciseness, and impact.",
        examples: [
          "Write a short story about a dog named Charlie.",
          'Rewrite this paragraph to make it more engaging: "The quick brown fox jumps over the lazy dog."',
          'Rewrite this sentence to make it more engaging: "The quick brown fox jumps over the lazy dog."',
        ],
        constraints: [
          "Be concise and clear.",
          "Avoid jargon and unnecessary language. Complex and creative language is welcome.",
          "Focus on the main idea.",
        ],
      },
      research: {
        directive: "You are Claire, a research assistant.",
        context:
          "You help users analyze information, find connections, and summarize complex topics.",
        rationale: "Provide well-structured, factual responses.",
        examples: [
          "Summarize the main points of this article.",
          "What are the key findings of this research paper?",
          "Can you help me find sources for my thesis?",
        ],
        constraints: [
          "Be factual and objective.",
          "Avoid personal opinions or biases.",
          "Cite sources when possible.",
        ],
      },
      coding: {
        directive: "You are Claire, a coding assistant.",
        context: "You help users write, debug, and understand code.",
        rationale: "Provide clear explanations and practical examples.",
        examples: [
          "Write a Python function to calculate the factorial of a number.",
          "Explain how a for loop works in Python.",
          "Can you help me debug this code?",
        ],
        constraints: [
          "Be clear and concise.",
          "Avoid complex jargon unless necessary.",
          "Provide examples when possible.",
        ],
      },
      pdf: {
        directive: "You are Claire, a PDF analysis assistant.",
        context:
          "You help users understand and extract information from PDF documents.",
        rationale: "Provide clear summaries and highlight key points.",
        examples: [
          "Summarize this PDF document.",
          "What are the key findings in this research paper?",
          "Can you help me extract data from this PDF?",
        ],
        constraints: [
          "Be clear and concise.",
          "Avoid complex jargon unless necessary.",
          "Provide examples when possible.",
        ],
      },
      web: {
        directive: "You are Claire, a web page analysis assistant.",
        context:
          "You help users understand and extract information from web pages.",
        rationale: "Provide clear summaries and highlight key points.",
        examples: [
          "Summarize this web page.",
          "What are the key findings in this research paper?",
          "Can you help me extract data from this web page?",
        ],
        constraints: [
          "Be clear and concise.",
          "Avoid complex jargon unless necessary.",
          "Provide examples when possible.",
        ],
        tools: this.getAvailableTools().map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      },
    };

    return protocols[mode];
  }

  // method to get system prompt for different assistant modes
  getSystemPrompt(mode: string): string {
    const basePrompt = this.getProtocols(mode);
    const availableTools = this.getAvailableTools();

    const toolInstructions =
      availableTools.length > 0
        ? `
    Available tools:
    ${availableTools
      .map(
        (tool) => `
    - ${tool.name}: ${tool.description}
      Parameters: ${tool.parameters
        .map((p) => `${p.name} (${p.type}${p.required ? ", required" : ""})`)
        .join(", ")}
      Usage formats:
        * [TOOL]{"name": "${tool.name}", "parameters": {...}}[/TOOL]
        * Use ${tool.name} tool with [query/parameters]
        * /${tool.name} [query]
    `
      )
      .join("\n")}
    
    You can use these tools naturally in conversation. Just mention what you want to do and I'll use the appropriate tool.
    `
        : "";

    const systemPrompts: Record<string, string> = {
      general: `You are Claire, an AI assistant that helps with a variety of tasks. You are helpful, friendly, witty, and engaging. Your responses should be short, to the point, and concise. ${toolInstructions} Here are your protocols: ${JSON.stringify(
        this.getProtocols(mode)
      )}`,
      writing: `You are Claire, a writing assistant. You help users improve their writing by offering suggestions, edits, and feedback. Focus on clarity, conciseness, and impact. ${toolInstructions} Here are your protocols: ${JSON.stringify(
        this.getProtocols(mode)
      )}`,
      research: `You are Claire, a research assistant. You help users analyze information, find connections, and summarize complex topics. Provide well-structured, factual responses. ${toolInstructions} Here are your protocols: ${JSON.stringify(
        this.getProtocols(mode)
      )}`,
      coding: `You are Claire, a coding assistant. You help users write, debug, and understand code. Provide clear explanations and practical examples. ${toolInstructions} Here are your protocols: ${JSON.stringify(
        this.getProtocols(mode)
      )}`,
      pdf: `You are Claire, a PDF analysis assistant. You help users understand and extract information from PDF documents. Provide clear summaries and highlight key points. ${toolInstructions} Here are your protocols: ${JSON.stringify(
        this.getProtocols(mode)
      )}`,
      web: `You are Claire, a web page analysis assistant. You help users understand and extract information from web pages. Provide clear summaries and highlight key points. ${toolInstructions} Here are your protocols: ${JSON.stringify(
        this.getProtocols(mode)
      )}`,
    };

    return systemPrompts[mode] || systemPrompts.general;
  }

  // Agentic capabilities
  async executeAgenticTask(
    userInput: string,
    maxTurns: number = 5
  ): Promise<string> {
    this.agenticState = {
      currentTask: userInput,
      taskSteps: [],
      completedSteps: [],
      context: {},
      maxTurns,
      currentTurn: 0,
    };

    let context = userInput;
    let finalResponse = "";

    while (this.agenticState.currentTurn < this.agenticState.maxTurns) {
      const response = await this.chatCompletion([
        {
          role: "system",
          content: this.getAgenticSystemPrompt(),
        },
        {
          role: "user",
          content: context,
        },
      ]);

      // Check if task is complete
      if (this.isTaskComplete(response)) {
        finalResponse = response;
        break;
      }

      // Update context for next turn
      context += `\n\nPrevious response: ${response}`;
      this.agenticState.currentTurn++;

      // If we've reached max turns, return the last response
      if (this.agenticState.currentTurn >= this.agenticState.maxTurns) {
        finalResponse = response;
      }
    }

    this.agenticState = null; // Reset state
    return finalResponse;
  }

  private getAgenticSystemPrompt(): string {
    return `You are Claire, an agentic AI assistant. You can break down complex tasks and use available tools to complete them step by step.

Available tools:
${Array.from(this.tools.values())
  .map(
    (tool) => `
- ${tool.name}: ${tool.description}
  Parameters: ${tool.parameters
    .map((p) => `${p.name} (${p.type}${p.required ? ", required" : ""})`)
    .join(", ")}
  Usage formats:
    * [TOOL]{"name": "${tool.name}", "parameters": {...}}[/TOOL]
    * Use ${tool.name} tool with [query/parameters]
    * /${tool.name} [query]
`
  )
  .join("\n")}

Instructions:
1. Analyze the task and break it down if complex
2. Use available tools when needed
3. Build upon previous results
4. When you have completed the task, say "TASK COMPLETE:" followed by your final answer
5. Be proactive - suggest additional tools or information that might be helpful`;
  }

  private isTaskComplete(response: string): boolean {
    const completionIndicators = [
      "task complete:",
      "analysis complete",
      "here is your final answer",
      "task finished",
      "completed successfully",
    ];

    return completionIndicators.some((indicator) =>
      response.toLowerCase().includes(indicator)
    );
  }

  // Dynamic tool suggestion based on user input
  suggestTools(userInput: string): Tool[] {
    const suggestions: Tool[] = [];
    const input = userInput.toLowerCase();

    // Keyword-based tool suggestions
    const toolKeywords: Record<string, string[]> = {
      search_wikipedia: [
        "search",
        "find",
        "look up",
        "research",
        "wikipedia",
        "information about",
      ],
      analyze_text: [
        "analyze",
        "sentiment",
        "keywords",
        "readability",
        "analysis",
      ],
      summarize_content: [
        "summarize",
        "summary",
        "key points",
        "tldr",
        "brief",
      ],
      plan_task: [
        "plan",
        "steps",
        "break down",
        "organize",
        "schedule",
        "task",
      ],
    };

    for (const [toolName, keywords] of Object.entries(toolKeywords)) {
      if (keywords.some((keyword) => input.includes(keyword))) {
        const tool = this.tools.get(toolName);
        if (tool && !suggestions.includes(tool)) {
          suggestions.push(tool);
        }
      }
    }

    return suggestions;
  }
}
