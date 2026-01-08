const fs = require("fs");

function makeDeeplink({ name, pkgSpec, env }) {
  const config = {
    type: "stdio",
    command: "npx",
    args: ["-y", "--package", pkgSpec, "orcho-mcp"],
    env
  };

  const base64 = Buffer.from(JSON.stringify(config)).toString("base64");
  const deeplink = `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(
    name
  )}&config=${encodeURIComponent(base64)}`;

  return { name, base64, deeplink };
}

// PROD
const prod = makeDeeplink({
  name: "orcho",
  pkgSpec: "@orcho_risk/mcp-server@latest",
  env: {
    ORCHO_API_KEY: "PROD_KEY_HERE",
    ORCHO_ENV: "prod"
  }
});

// DEV
const dev = makeDeeplink({
  name: "orcho-dev",
  pkgSpec: "@orcho_risk/mcp-server@dev",
  env: {
    ORCHO_API_KEY: "DEV_KEY_HERE",
    ORCHO_ENV: "dev",
    ORCHO_DEBUG: "1" // optional
  }
});

const output = [
  `== PROD ==`,
  `Base64 Config: ${prod.base64}`,
  `Deeplink: ${prod.deeplink}`,
  ``,
  `== DEV ==`,
  `Base64 Config: ${dev.base64}`,
  `Deeplink: ${dev.deeplink}`,
  ``,
  `[Install PROD (orcho)](${prod.deeplink})`,
  `[Install DEV (orcho-dev)](${dev.deeplink})`,
  ``
].join("\n");

fs.writeFileSync("deeplink-output.txt", output);
console.log(output);
