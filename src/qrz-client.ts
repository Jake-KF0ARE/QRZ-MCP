import axios from "axios";
import { parseStringPromise } from "xml2js";

const QRZ_BASE_URL = "https://xmldata.qrz.com/xml/current/";
const AGENT = "qrz-mcp/1.0";

export interface CallsignData {
  call?: string;
  xref?: string;
  aliases?: string;
  dxcc?: string;
  fname?: string;
  name?: string;
  addr1?: string;
  addr2?: string;
  state?: string;
  zip?: string;
  country?: string;
  ccode?: string;
  lat?: string;
  lon?: string;
  grid?: string;
  county?: string;
  fips?: string;
  land?: string;
  efdate?: string;
  expdate?: string;
  p_call?: string;
  class?: string;
  codes?: string;
  qslmgr?: string;
  email?: string;
  url?: string;
  u_views?: string;
  bio?: string;
  biodate?: string;
  image?: string;
  imageinfo?: string;
  serial?: string;
  moddate?: string;
  MSA?: string;
  AreaCode?: string;
  TimeZone?: string;
  GMTOffset?: string;
  DST?: string;
  eqsl?: string;
  mqsl?: string;
  cqzone?: string;
  ituzone?: string;
  born?: string;
  user?: string;
  lotw?: string;
  iota?: string;
  geoloc?: string;
  attn?: string;
  nickname?: string;
  name_fmt?: string;
}

export interface SessionInfo {
  key: string;
  count?: string;
  subExp?: string;
}

export class QrzClient {
  private sessionKey: string | null = null;
  private username: string;
  private password: string;

  constructor(username: string, password: string) {
    this.username = username;
    this.password = password;
  }

  private async login(): Promise<string> {
    const response = await axios.get(QRZ_BASE_URL, {
      params: {
        username: this.username,
        password: this.password,
        agent: AGENT,
      },
    });

    const parsed = await parseStringPromise(response.data, {
      explicitArray: false,
    });
    const session = parsed?.QRZDatabase?.Session;

    if (!session) {
      throw new Error("Invalid response from QRZ login");
    }

    if (session.Error) {
      throw new Error(`QRZ login failed: ${session.Error}`);
    }

    if (!session.Key) {
      throw new Error("No session key returned from QRZ login");
    }

    this.sessionKey = session.Key;
    return session.Key;
  }

  private async getSessionKey(): Promise<string> {
    if (!this.sessionKey) {
      await this.login();
    }
    return this.sessionKey!;
  }

  private async request(params: Record<string, string>): Promise<unknown> {
    const key = await this.getSessionKey();
    const response = await axios.get(QRZ_BASE_URL, {
      params: { s: key, ...params },
    });

    const parsed = await parseStringPromise(response.data, {
      explicitArray: false,
    });

    const session = parsed?.QRZDatabase?.Session;

    // Session expired — re-login and retry once
    if (session && !session.Key) {
      this.sessionKey = null;
      const newKey = await this.login();
      const retryResponse = await axios.get(QRZ_BASE_URL, {
        params: { s: newKey, ...params },
      });
      return parseStringPromise(retryResponse.data, { explicitArray: false });
    }

    return parsed;
  }

  async lookupCallsign(callsign: string): Promise<CallsignData> {
    const result = (await this.request({ callsign })) as Record<string, unknown>;
    const db = result?.QRZDatabase as Record<string, unknown> | undefined;
    const session = db?.Session as Record<string, unknown> | undefined;

    if (session?.Error) {
      throw new Error(`QRZ error: ${session.Error}`);
    }

    const data = db?.Callsign as Record<string, unknown> | undefined;
    if (!data) {
      throw new Error(`Callsign not found: ${callsign}`);
    }

    // Flatten single-value arrays from xml2js
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      flat[k] = Array.isArray(v) ? v[0] : String(v);
    }
    return flat as CallsignData;
  }

  async getBiography(callsign: string): Promise<string> {
    const key = await this.getSessionKey();
    const response = await axios.get(QRZ_BASE_URL, {
      params: { s: key, html: callsign },
    });

    // Biography endpoint returns raw HTML, not XML
    const html = response.data as string;

    if (!html || html.trim().length === 0) {
      throw new Error(`No biography found for ${callsign}`);
    }

    // If it looks like an XML error response, try to parse and report it
    if (html.trim().startsWith("<?xml")) {
      try {
        const parsed = await parseStringPromise(html, { explicitArray: false });
        const error = (parsed as Record<string, unknown> | null)?.QRZDatabase
          ? ((parsed as Record<string, Record<string, Record<string, string>>>).QRZDatabase?.Session?.Error)
          : null;
        if (error) throw new Error(`QRZ error: ${error}`);
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("QRZ error:")) throw e;
        // Not a clean XML error — fall through and return as HTML
      }
    }

    return html;
  }
}
