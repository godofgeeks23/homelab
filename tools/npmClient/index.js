const axios = require("axios");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

const NPM_URL = process.env.NPM_URL;
const NPM_USERNAME = process.env.NPM_USERNAME;
const NPM_PASSWORD = process.env.NPM_PASSWORD;
const LETSENCRYPT_EMAIL = process.env.LETSENCRYPT_EMAIL;

async function getToken() {
  try {
    const response = await axios.post(`${NPM_URL}/api/tokens`, {
      identity: NPM_USERNAME,
      secret: NPM_PASSWORD,
    });
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching token:",
      error.response ? error.response.data : error.message,
    );
  }
}

async function getProxyHosts() {
  try {
    const token = await getToken();
    if (!token.token) {
      console.error("Login failed");
      return;
    }
    const response = await axios.get(
      `${NPM_URL}/api/nginx/proxy-hosts?expand=owner,access_list,certificate`,
      {
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error fetching proxy hosts:",
      error.response ? error.response.data : error.message,
    );
  }
}

async function addProxyHost(domainNames, forwardHost, forwardPort) {
  try {
    const token = await getToken();
    if (!token.token) {
      console.error("Login failed");
      return;
    }

    const payload = {
      domain_names: domainNames,
      forward_scheme: "http",
      forward_host: forwardHost,
      forward_port: forwardPort,
      caching_enabled: true,
      block_exploits: true,
      allow_websocket_upgrade: true,
      access_list_id: "0",
      certificate_id: "new",
      ssl_forced: true,
      http2_support: true,
      hsts_enabled: true,
      hsts_subdomains: true,
      meta: {
        letsencrypt_email: LETSENCRYPT_EMAIL,
        letsencrypt_agree: true,
        dns_challenge: false,
      },
      advanced_config: "",
      locations: [],
    };

    const response = await axios.post(
      `${NPM_URL}/api/nginx/proxy-hosts`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      },
    );
    console.log("Proxy host added:", response.data.id);
    return response.data;
  } catch (error) {
    console.error(
      "Error adding proxy host:",
      error.response ? error.response.data : error.message,
    );
  }
}

async function exportProxyHosts(filename = "proxy-hosts.json") {
  const proxyHosts = await getProxyHosts();
  if (proxyHosts) {
    fs.writeFileSync(filename, JSON.stringify(proxyHosts, null, 2));
    console.log("Proxy hosts exported successfully");
  }
}

async function deleteProxyHost(id) {
  try {
    const token = await getToken();
    if (!token.token) {
      console.error("Login failed");
      return;
    }
    const response = await axios.delete(
      `${NPM_URL}/api/nginx/proxy-hosts/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token.token}`,
        },
      },
    );
    console.log("Proxy host deleted:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error deleting proxy host:",
      error.response ? error.response.data : error.message,
    );
  }
}

async function restoreFromFile(filename = "proxy-hosts.json") {
  try {
    if (!fs.existsSync(filename)) {
      console.error(`File ${filename} not found`);
      return;
    }

    const fileContent = fs.readFileSync(filename, "utf8");
    const proxyHosts = JSON.parse(fileContent);

    for (const host of proxyHosts) {
      const { domain_names, forward_host, forward_port } = host;
      if (domain_names && forward_host && forward_port) {
        console.log(`Restoring ${domain_names}...`);
        await addProxyHost(domain_names, forward_host, forward_port);
      } else {
        console.warn(`Skipping invalid host entry: ${JSON.stringify(host)}`);
      }
    }
    console.log("Restore process completed");
  } catch (error) {
    console.error("Error during restore:", error.message);
  }
}

// ... keep existing imports ...

// ... keep existing functions ...

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "add":
      const [domain, forwardHost, forwardPort] = args.slice(1);
      if (!domain || !forwardHost || !forwardPort) {
        console.error(
          "Usage: node index.js add <domain> <forwardHost> <forwardPort>",
        );
        process.exit(1);
      }
      await addProxyHost([domain], forwardHost, parseInt(forwardPort));
      break;

    case "delete":
      const [id] = args.slice(1);
      if (!id) {
        console.error("Usage: node index.js delete <id>");
        process.exit(1);
      }
      await deleteProxyHost(id);
      break;

    case "export":
      const [filename] = args.slice(1);
      await exportProxyHosts(filename);
      break;

    case "restore":
      const [restoreFile] = args.slice(1);
      await restoreFromFile(restoreFile);
      break;

    default:
      console.log("Usage: node index.js <command> [args]");
      console.log("Commands: add, delete, export, restore");
      break;
  }
}

if (require.main === module) {
  main();
}
