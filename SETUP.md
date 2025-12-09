# Quick Setup Guide

## For Package Maintainers

When packaging this for distribution, include:

1. **`mcp-server.js`** - The main server file
2. **`package.json`** - Dependencies and metadata
3. **`.cursorrules.example`** - Example rules file (users copy this)
4. **`README.md`** - Full documentation
5. **`SETUP.md`** - This quick setup guide

## Package Structure

```
@orcho_risk/mcp-server/
├── mcp-server.js          # Main server
├── package.json           # Package config
├── README.md              # Full docs
├── SETUP.md               # Quick setup
└── .cursorrules.example   # Example rules
```

## Installation Instructions for Users

### Option 1: Global Install (Recommended)

```bash
npm install -g @orcho_risk/mcp-server
```

Then configure `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "orcho": {
      "command": "npx",
      "args": ["-y", "@orcho_risk/mcp-server"],
      "env": {
        "ORCHO_API_KEY": "your-key-here"
      }
    }
  }
}
```

### Option 2: Local Install

```bash
npm install @orcho_risk/mcp-server
```

Then configure with full path to `node_modules/@orcho_risk/mcp-server/mcp-server.js`

## Enabling Automatic Risk Assessment

Users can optionally enable automatic risk assessment by copying the example rules:

```bash
cp node_modules/@orcho_risk/mcp-server/.cursorrules.example .cursorrules
```

Or manually create `.cursorrules` in their project root.

## Testing

After installation, test in Cursor:

```
@orcho assess_risk: This is a test prompt
```

You should see a risk assessment response.
