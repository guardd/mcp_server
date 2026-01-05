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
const { execSync } = require('child_process');

// Configuration
const ORCHO_API_KEY = process.env.ORCHO_API_KEY;

if (!ORCHO_API_KEY) {
  console.error('❌ Error: ORCHO_API_KEY environment variable is not set');
  process.exit(1);
}

const ORCHO_API_URL = 'https://app.orcho.ai/risk/api/v1/generate-risk';
const ORCHO_API_URL_WITH_CONTEXT = 'https://app.orcho.ai/risk/api/v1/generate-risk-with-context';
const DEBUG_MODE = process.env.ORCHO_DEBUG === 'true' || process.env.ORCHO_DEBUG === '1';

/**
 * Get repository full name (owner/repo) from git remote
 * @returns {string|null} Repository name or null if not found
 */
function getRepoFullName() {
  try {
    // Try git remote get-url origin first
    let url;
    try {
      url = execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch (e) {
      // Fallback to git config
      try {
        url = execSync('git config --get remote.origin.url', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
      } catch (e2) {
        return null;
      }
    }
    
    if (!url) return null;
    
    // Parse the URL to extract owner/repo
    let path;
    if (url.includes('://')) {
      // HTTPS URL: https://github.com/owner/repo.git
      path = new URL(url).pathname;
    } else if (url.includes('@') && url.includes(':')) {
      // SSH URL: git@github.com:owner/repo.git
      path = url.split(':')[1];
    } else {
      path = url;
    }
    
    // Remove leading/trailing slashes and .git extension
    path = path.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '');
    const parts = path.split('/').filter(p => p);
    
    // Return last two parts (owner/repo) or the path itself
    if (parts.length >= 2) {
      return parts.slice(-2).join('/');
    }
    return path || null;
  } catch (error) {
    return null;
  }
}

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
      // API expects: { prompt, context: { repo_full_name, current_file, other_files? }, weights? }
      requestBody = {
        prompt: prompt,
        context: {
          repo_full_name: context.repo_full_name,  // REQUIRED
          current_file: context.current_file,
          ...(context.other_files && context.other_files.length > 0 && { other_files: context.other_files })
        },
        ...(context.weights && { weights: context.weights })  // weights at top level, not in context
      };
    } else {
      requestBody = {
        prompt: prompt,
        ...(context && context.weights && { weights: context.weights })
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
            prompt: {
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
            weights: {
              type: 'object',
              description: 'Optional custom weights for risk calculation factors.',
            },
            repo_full_name: {
              type: 'string',
              description: 'Optional repository full name (owner/repo). If not provided, will be automatically detected from git remote.',
            },
          },
          required: ['prompt'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'assess_risk') {
    const prompt = args.prompt;
    
    // Build context object if context parameters are provided
    const context = {};
    if (args.current_file) {
      context.current_file = args.current_file;
    }
    if (args.other_files && Array.isArray(args.other_files) && args.other_files.length > 0) {
      context.other_files = args.other_files;
    }
    if (args.weights) {
      context.weights = args.weights;
    }
    
    // Get repo_full_name if context is being used (REQUIRED by API)
    if (args.current_file) {
      context.repo_full_name = args.repo_full_name || getRepoFullName();
      // If repo_full_name is still null/empty, log warning but continue
      if (!context.repo_full_name) {
        console.error('Warning: repo_full_name not found and not provided. API call may fail.');
      }
    }
    
    // Assess risk level (with or without context)
    const riskAssessment = await checkRiskLevel(prompt, Object.keys(context).length > 0 ? context : null);
    
    // Format response
    let response = `🔍 **Orcho - Risk Assessment**\n\n`;
    response += `**Your Prompt:**\n${prompt}\n\n`;
    
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