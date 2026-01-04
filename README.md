# Orcho MCP Server for Cursor

> **Risk assessment for AI coding prompts** - Automatically analyze your coding requests for security and safety risks before execution.

## 🚀 Quick Install

**Click this link to automatically install in Cursor:**

```
cursor://anysphere.cursor-deeplink/mcp/install?name=orcho&config=eyJuYW1lIjoib3JjaG8iLCJ0eXBlIjoic3RkaW8iLCJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBvcmNob19yaXNrL21jcC1zZXJ2ZXIiXSwiZW52Ijp7Ik9SQ0hPX0FQSV9LRVkiOiJ0ZXN0X2tleV9vcmNob18xMjM0NSJ9fQ==
```

**How to use:**
1. Copy the link above
2. Paste it into your browser's address bar and press Enter
3. Cursor will open and automatically configure the MCP server
4. **Replace the test API key** with your real key (see [API Configuration](#api-configuration))
5. **Restart Cursor** to activate
1. **Replace the test API key** with your real key (see [API Configuration](#api-configuration))
2. **Restart Cursor** to activate the MCP server

---

## What is Orcho??

Orcho analyzes your coding prompts in real-time to identify potential security risks, dangerous operations, and safety concerns before code is generated or executed.

### Features

- 🔍 **Real-time Risk Assessment** - Analyze prompts using Orcho's risk analysis API
- 📁 **Context-Aware** - Automatically includes file context for accurate blast radius and complexity analysis
- 🛡️ **Security First** - Identifies high-risk prompts before execution
- 🔌 **Seamless Integration** - Works natively with Cursor's Model Context Protocol

---

## Installation

### Option 1: One-Click Install (Recommended)

**Copy and paste this link into your browser:**

```
cursor://anysphere.cursor-deeplink/mcp/install?name=orcho&config=eyJuYW1lIjoib3JjaG8iLCJ0eXBlIjoic3RkaW8iLCJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBvcmNob19yaXNrL21jcC1zZXJ2ZXIiXSwiZW52Ijp7Ik9SQ0hPX0FQSV9LRVkiOiJ0ZXN0X2tleV9vcmNob18xMjM0NSJ9fQ==
```

This automatically:
- ✅ Configures the MCP server in Cursor
- ✅ Sets up auto-installation via npx
- ⚠️ **Next step**: Replace the test API key with your real key (see below)
- ⚠️ **Then**: Restart Cursor

### Option 2: Manual Installation

1. **Install the package:**
   ```bash
   npm install -g @orcho_risk/mcp-server
   ```

2. **Configure Cursor:**
   
   Create or edit `~/.cursor/mcp.json` (Windows: `C:\Users\<YourUsername>\.cursor\mcp.json`):
   
   ```json
   {
     "mcpServers": {
       "orcho": {
         "command": "npx",
         "args": ["-y", "@orcho_risk/mcp-server"],
         "env": {
           "ORCHO_API_KEY": "your-api-key-here"
         }
       }
     }
   }
   ```

3. **Restart Cursor** completely (quit and reopen)

---

## API Configuration

### Get Your API Key

1. **Sign up** at [app.orcho.ai](https://app.orcho.ai)
2. **Navigate to API Settings** (Dashboard → API Keys)
3. **Create or copy your API key**
4. **Update your `mcp.json`** file:
   - Location: `~/.cursor/mcp.json` (or `C:\Users\<YourUsername>\.cursor\mcp.json` on Windows)
   - Replace `test_key_orcho_12345` with your actual API key

### Test API Key

For initial testing, you can use:
```
test_key_orcho_12345
```

**Note:** The test key has limited functionality and rate limits. Get your own API key from [app.orcho.ai](https://app.orcho.ai) for production use.

### Security Best Practices

- ✅ **Store API keys** only in `~/.cursor/mcp.json` (not in your project)
- ✅ **Never commit** API keys to version control
- ✅ **Rotate keys** immediately if accidentally exposed

---

## Usage

### Manual Assessment

In Cursor chat, type:

```
@orcho assess_risk: Your prompt here
```

### Automatic Assessment (Recommended)

Enable automatic risk assessment for all prompts by adding a Cursor rule to your project.

#### Option 1: Project Rules (Modern - Recommended)

Copy the rule file to your project:

```bash
# Create .cursor/rules directory
mkdir -p .cursor/rules

# Copy the rule file
cp node_modules/@orcho_risk/mcp-server/.cursor/rules/orcho-risk-assessment.mdc .cursor/rules/
```

Or manually copy from:
```
node_modules/@orcho_risk/mcp-server/.cursor/rules/orcho-risk-assessment.mdc
```

#### Option 2: Legacy .cursorrules File

Copy the example rules file:

```bash
cp node_modules/@orcho_risk/mcp-server/.cursorrules.example .cursorrules
```

**Note:** Project Rules (Option 1) are the modern approach and support more features.

---

## How It Works

### Context-Aware Assessment

Orcho automatically gathers context when available:

- **Current File**: Detects the file open in your editor
- **Other Files**: Analyzes which files will be modified by the prompt
- **Dependency Graph**: Optional project dependency information
- **Blast Radius**: Calculates impact scope of changes

### Example

```
User: "Delete all user data from the database"
→ Cursor calls: @orcho assess_risk with context
→ Risk: HIGH (score: 95)
→ Cursor warns: "⚠️ HIGH RISK: This could cause data loss. Proceed?"
```

### Tool Parameters

- `task` (required): The prompt to assess
- `current_file` (recommended): Path to currently open file
- `other_files` (recommended): Array of files that will be modified
- `dependency_graph` (optional): Project dependency graph
- `weights` (optional): Custom risk calculation weights
- `aiignore_file` (optional): Path to .aiignore file

---

## Troubleshooting

### MCP Server Not Loading

1. **Check `mcp.json` location:**
   - Mac/Linux: `~/.cursor/mcp.json`
   - Windows: `C:\Users\<YourUsername>\.cursor\mcp.json`

2. **Verify Node.js is installed:**
   ```bash
   node --version  # Requires v18+
   ```

3. **Check Cursor Developer Tools:**
   - Help → Toggle Developer Tools
   - Look for MCP-related errors in Console

### API Errors

- **Invalid API Key**: Verify the key is correct in `mcp.json`
- **Rate Limits**: Check your account quota at [app.orcho.ai](https://app.orcho.ai)
- **No API Key**: The server will use the test key by default (limited functionality)

### Still Having Issues?

- Check that Cursor is fully restarted (quit and reopen)
- Verify your API key is valid at [app.orcho.ai](https://app.orcho.ai)
- Ensure you have internet connectivity

---

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [Your Repo URL]
- Orcho Support: [Support URL]
