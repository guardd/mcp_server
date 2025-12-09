const config = {
  name: "orcho",
  type: "stdio",
  command: "npx",
  args: ["-y", "@orcho_risk/mcp-server"],
  env: {
    ORCHO_API_KEY: "test_key_orcho_12345"
  }
};

const base64 = Buffer.from(JSON.stringify(config)).toString('base64');
const deeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=orcho&config=${base64}`;

const fs = require('fs');
const output = `Base64 Config: ${base64}\n\nFull Deeplink: ${deeplink}\n\nMarkdown Link:\n[Click here to automatically configure Cursor](${deeplink})`;
fs.writeFileSync('deeplink-output.txt', output);
console.log(output);
