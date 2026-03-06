import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { QrzClient } from "./qrz-client.js";

const username = process.env.QRZ_USERNAME;
const password = process.env.QRZ_PASSWORD;

if (!username || !password) {
  console.error("Error: QRZ_USERNAME and QRZ_PASSWORD environment variables are required.");
  process.exit(1);
}

const client = new QrzClient(username, password);
const server = new McpServer({
  name: "qrz-mcp",
  version: "1.0.0",
});

server.tool(
  "lookup_callsign",
  "Look up a ham radio callsign on QRZ.com. Returns operator name, address, license class, grid square, CQ/ITU zones, QSL preferences, and more.",
  { callsign: z.string().describe("The ham radio callsign to look up (e.g. W1AW, AA7BQ)") },
  async ({ callsign }) => {
    const data = await client.lookupCallsign(callsign.toUpperCase().trim());

    const lines: string[] = [`Callsign: ${data.call ?? callsign}`];

    if (data.name_fmt) lines.push(`Name: ${data.name_fmt}`);
    else if (data.fname || data.name) lines.push(`Name: ${[data.fname, data.name].filter(Boolean).join(" ")}`);
    if (data.nickname) lines.push(`Nickname: ${data.nickname}`);

    if (data.addr1) lines.push(`Address: ${data.addr1}`);
    if (data.addr2 || data.state || data.zip) {
      lines.push(`City/State/ZIP: ${[data.addr2, data.state, data.zip].filter(Boolean).join(" ")}`);
    }
    if (data.country) lines.push(`Country: ${data.country}`);
    if (data.land && data.land !== data.country) lines.push(`DXCC Country: ${data.land}`);

    if (data.class) lines.push(`License Class: ${data.class}`);
    if (data.efdate) lines.push(`License Effective: ${data.efdate}`);
    if (data.expdate) lines.push(`License Expires: ${data.expdate}`);
    if (data.p_call) lines.push(`Previous Callsign: ${data.p_call}`);
    if (data.aliases) lines.push(`Aliases: ${data.aliases}`);

    if (data.grid) lines.push(`Grid Square: ${data.grid}`);
    if (data.lat && data.lon) lines.push(`Lat/Lon: ${data.lat}, ${data.lon}`);
    if (data.cqzone) lines.push(`CQ Zone: ${data.cqzone}`);
    if (data.ituzone) lines.push(`ITU Zone: ${data.ituzone}`);
    if (data.TimeZone) lines.push(`Time Zone: ${data.TimeZone} (UTC${data.GMTOffset ?? ""})`);

    if (data.email) lines.push(`Email: ${data.email}`);
    if (data.url) lines.push(`QRZ URL: ${data.url}`);
    if (data.image) lines.push(`Image: ${data.image}`);
    if (data.qslmgr) lines.push(`QSL Manager: ${data.qslmgr}`);

    const qsl: string[] = [];
    if (data.eqsl === "1" || data.eqsl?.toLowerCase() === "y") qsl.push("eQSL");
    if (data.mqsl === "1" || data.mqsl?.toLowerCase() === "y") qsl.push("Paper QSL");
    if (data.lotw === "1" || data.lotw?.toLowerCase() === "y") qsl.push("LoTW");
    if (qsl.length) lines.push(`QSL Methods: ${qsl.join(", ")}`);

    if (data.iota) lines.push(`IOTA: ${data.iota}`);
    if (data.born) lines.push(`Year Born: ${data.born}`);
    if (data.bio) lines.push(`Biography: available (use get_biography tool)`);
    if (data.u_views) lines.push(`QRZ Profile Views: ${data.u_views}`);

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  }
);

server.tool(
  "get_biography",
  "Fetch the HTML biography page for a ham radio callsign from QRZ.com. Returns raw HTML content as text.",
  { callsign: z.string().describe("The ham radio callsign whose biography to retrieve (e.g. W1AW)") },
  async ({ callsign }) => {
    const html = await client.getBiography(callsign.toUpperCase().trim());
    return {
      content: [{ type: "text", text: html }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
