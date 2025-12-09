#!/usr/bin/env node

/**
 * Orcho MCP Server
 * Risk assessment API for Cursor prompts
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// Configuration
const ORCHO_API_KEY = process.env.ORCHO_API_KEY || 'test_key_orcho_12345';
const ORCHO_API_URL = 'https://app.orcho.ai/risk/api/v1/generate-risk';
const ORCHO_API_URL_WITH_CONTEXT = 'https://app.orcho.ai/risk/api/v1/generate-risk-with-context';
const DEBUG_MODE = process.env.ORCHO_DEBUG === 'true' || process.env.ORCHO_DEBUG === '1';

/**
 * Check risk level by calling Orcho API
 * @param {string} prompt - The user's prompt text to analyze
 * @param {object} context - Optional context object with file information
 * @returns {Promise<{level: 'high'|'low', score: number, details: object|null}>}
 */
async function checkRiskLevel(prompt, context = null) {
  // Empty prompt handling
  if (!prompt || prompt.trim().length === 0) {
    return {
      level: 'low',
      score: 0,
      details: null
    };
}

  try {
    // Determine which endpoint to use
    const useContextEndpoint = context && context.current_file;
    const apiUrl = useContextEndpoint ? ORCHO_API_URL_WITH_CONTEXT : ORCHO_API_URL;

    // Build request body
    let requestBody;
    if (useContextEndpoint) {
      requestBody = {
        prompt: prompt,
        context: {
          current_file: context.current_file,
          ...(context.dependency_graph && { dependency_graph: context.dependency_graph }),
          ...(context.other_files && { other_files: context.other_files }),
          ...(context.weights && { weights: context.weights }),
          ...(context.aiignore_file && { aiignore_file: context.aiignore_file }),
        }
      };
    } else {
      requestBody = {
        prompt: prompt
      };
  }
  
    // Debug logging - Full API call details (only if DEBUG_MODE enabled)
    const requestHeaders = {
      'X-API-Key': ORCHO_API_KEY,
      'Content-Type': 'application/json'
    };
    
    if (DEBUG_MODE) {
      console.error('=== Orcho API Call Debug ===');
      console.error('URL:', apiUrl);
      console.error('Method: POST');
      console.error('Headers:', JSON.stringify(requestHeaders, null, 2));
      console.error('Body:', JSON.stringify(requestBody, null, 2));
      console.error('===========================');
}

    // Make API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(requestBody)
    });

    // Error handling - non-200 status
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${response.status} ${response.statusText}`);
      console.error('Error response:', errorText);
      return {
        level: 'low',
        score: 0,
        details: null
      };
    }

    const data = await response.json();
    
    // Debug logging - API response (only if DEBUG_MODE enabled)
    if (DEBUG_MODE) {
      console.error('=== Orcho API Response ===');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
      console.error('=========================');
    }

    // Process overall_risk_level
    let level = 'low';
    const riskLevel = data.overall_risk_level?.toLowerCase();
    if (riskLevel === 'high' || riskLevel === 'critical') {
      level = 'high';
    }

    // Process overall_score
    let score = data.overall_score || 0;
    if (score < 1) {
      score = score * 100;
    }
    score = Math.round(score);

    return {
      level: level,
      score: score,
      details: data
    };

  } catch (error) {
    // Error handling - API fails
    console.error('API request failed:', error.message);
    return {
      level: 'low',
      score: 0,
      details: null
    };
  }
}

// Create MCP server
const server = new Server(
  {
    name: 'orcho-prompt-logger',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'assess_risk',
        description: 'Assess the risk level of your coding prompt using Orcho risk analysis API. CRITICAL: You (Cursor AI) have access to the editor state - ALWAYS include context when available: 1) Pass the currently open/active file path as current_file (you can see this in the editor tabs), 2) Analyze the user prompt to determine which files will be modified and pass them as other_files array. Without context, only basic risk assessment is available. With context, you get blast radius and complexity analysis.',
        inputSchema: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'The coding task or prompt you want to assess for risk.',
            },
            current_file: {
              type: 'string',
              description: 'STRONGLY RECOMMENDED: Path to the currently open/active file in the Cursor editor (e.g., "src/main.js" or "mcp-server.js"). You (Cursor AI) can see which file is open in the editor tabs - always pass this if available. This enables context-aware assessment with blast radius and complexity analysis. If no file is open or unknown, omit this parameter.',
            },
            other_files: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'STRONGLY RECOMMENDED: Array of file paths that will be touched/modified by this prompt. Analyze the user prompt to determine which files will be affected (e.g., if prompt says "update login.js and auth.js", include ["login.js", "auth.js"]). If no other files will be touched, pass an empty array []. This enables accurate blast radius calculation. Always try to include this based on prompt analysis.',
            },
            dependency_graph: {
              type: 'object',
              description: 'Optional JSON dependency graph of the project. Can be generated from package.json, requirements.txt, etc.',
            },
            weights: {
              type: 'object',
              description: 'Optional custom weights for risk calculation factors.',
            },
            aiignore_file: {
              type: 'string',
              description: 'Optional path to .aiignore file for excluding files from analysis.',
            },
          },
          required: ['task'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'assess_risk') {
    const task = args.task;
    
    // Build context object if context parameters are provided
    const context = {};
    if (args.current_file) {
      context.current_file = args.current_file;
    }
    if (args.other_files && Array.isArray(args.other_files) && args.other_files.length > 0) {
      context.other_files = args.other_files;
    }
    if (args.dependency_graph) {
      context.dependency_graph = args.dependency_graph;
    }
    if (args.weights) {
      context.weights = args.weights;
    }
    if (args.aiignore_file) {
      context.aiignore_file = args.aiignore_file;
    }
    
    // Assess risk level (with or without context)
    const riskAssessment = await checkRiskLevel(task, Object.keys(context).length > 0 ? context : null);
    
    // Format response
    let response = `🔍 **Orcho - Risk Assessment**\n\n`;
    response += `**Your Prompt:**\n${task}\n\n`;
    
    // Show context if used
    if (context.current_file) {
      response += `**Context Used:**\n`;
      response += `- Current File: ${context.current_file}\n`;
      if (context.other_files && context.other_files.length > 0) {
        response += `- Other Files: ${context.other_files.join(', ')}\n`;
      }
      response += `\n`;
    }
    
    response += `---\n`;
    response += `**Risk Level:** ${riskAssessment.level.toUpperCase()}\n`;
    response += `**Risk Score:** ${riskAssessment.score}/100\n`;
    
    if (riskAssessment.details) {
      response += `\n**Details:**\n`;
      response += `\`\`\`json\n${JSON.stringify(riskAssessment.details, null, 2)}\n\`\`\`\n`;
    } else {
      response += `\n⚠️ Assessment unavailable (API error or empty prompt)\n`;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('✅ Orcho MCP Server started (Risk Assessment Mode)');
  console.error(`   API URL: ${ORCHO_API_URL}`);
  console.error(`   API Key: ${ORCHO_API_KEY.substring(0, 10)}...`);
}

main().catch((error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});