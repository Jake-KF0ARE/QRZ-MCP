# QRZ MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that gives AI agents access to [QRZ.com](https://www.qrz.com) ham radio callsign data.

> **Prerequisite:** A QRZ.com account with an active [XML Data / Logbook Data subscription](https://www.qrz.com/page/xml_data.html) is required for full callsign data access.

## Tools

| Tool | Description |
|---|---|
| `lookup_callsign` | Look up any callsign — returns name, address, license class, grid square, CQ/ITU zones, QSL methods, and more |
| `get_biography` | Fetch the full HTML biography page for a callsign |

## Installation

```bash
git clone https://github.com/Jake-KF0ARE/QRZ-MCP.git
cd QRZ-MCP
npm install
npm run build
```

## Configuration

Two environment variables are required:

| Variable | Description |
|---|---|
| `QRZ_USERNAME` | Your QRZ.com username (callsign) |
| `QRZ_PASSWORD` | Your QRZ.com password |

## Usage

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on your platform:

```json
{
  "mcpServers": {
    "qrz": {
      "command": "node",
      "args": ["/path/to/QRZ-MCP/dist/index.js"],
      "env": {
        "QRZ_USERNAME": "W1AW",
        "QRZ_PASSWORD": "your_password"
      }
    }
  }
}
```

### Other MCP Clients (Cursor, VS Code, etc.)

Any MCP-compatible client can use this server. Point it at `node /path/to/QRZ-MCP/dist/index.js` with the env vars above.

### Run from source (no build step)

```json
{
  "mcpServers": {
    "qrz": {
      "command": "npx",
      "args": ["tsx", "/path/to/QRZ-MCP/src/index.ts"],
      "env": {
        "QRZ_USERNAME": "W1AW",
        "QRZ_PASSWORD": "your_password"
      }
    }
  }
}
```

## Tool Details

### `lookup_callsign`

**Input:** `callsign` (string) — e.g. `W1AW`, `AA7BQ`, `W0GKP`

**Returns:**
- Name, nickname, address, country, DXCC entity
- License class, effective/expiration dates, previous callsign, aliases
- Maidenhead grid square, lat/lon, CQ zone, ITU zone, time zone
- Email, QRZ profile URL, image URL, QSL manager
- QSL methods: eQSL, paper QSL, LoTW
- IOTA designator, year of birth, profile view count
- Note if a biography is available

### `get_biography`

**Input:** `callsign` (string)

**Returns:** Raw HTML of the callsign's QRZ biography page, as it appears on QRZ.com.

## Session Management

The server authenticates once on first use, caches the session key, and automatically re-authenticates if the session expires.

## License

MIT — see [LICENSE](LICENSE).
