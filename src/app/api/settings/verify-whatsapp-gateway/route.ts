import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const verifySchema = z.object({
  provider: z.enum(["greenapi", "ultramsg", "wati", "twilio"]),
  instanceId: z.string().min(1, "Instance ID / Channel ID is required"),
  apiKey: z.string().min(1, "API Key / Token is required"),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || "Invalid input parameters" },
      { status: 400 }
    );
  }

  const { provider, instanceId, apiKey } = parsed.data;
  const cleanInstanceId = instanceId.trim();
  const cleanApiKey = apiKey.trim();

  try {
    if (provider === "greenapi") {
      // Green-API getStateInstance endpoint
      // https://api.green-api.com/waInstance{idInstance}/getStateInstance/{apiTokenInstance}
      const res = await fetch(
        `https://api.green-api.com/waInstance${cleanInstanceId}/getStateInstance/${cleanApiKey}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(12000),
        }
      );

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = "Green-API authentication failed. Please check ID Instance and API Token.";
        try {
          const errJson = JSON.parse(errText);
          if (errJson.message) errMsg = `Green-API: ${errJson.message}`;
        } catch {}
        return NextResponse.json({
          success: false,
          status: "invalid",
          error: errMsg,
        });
      }

      const data = await res.json();
      const state = data.stateInstance; // e.g. "authorized", "notAuthorized", "blocked", "sleepMode"

      if (state === "authorized") {
        return NextResponse.json({
          success: true,
          status: "connected",
          message: "Green-API Connected & Authorized! WhatsApp instance is active and ready to send messages.",
          details: data,
        });
      } else if (state === "notAuthorized") {
        return NextResponse.json({
          success: true,
          status: "qr_pending",
          message: "Credentials are valid! However, WhatsApp QR code is not scanned yet in your Green-API console.",
          details: data,
        });
      } else {
        return NextResponse.json({
          success: true,
          status: "standby",
          message: `Credentials are valid. Current Instance state: "${state}".`,
          details: data,
        });
      }
    } else if (provider === "ultramsg") {
      // UltraMsg instance status
      const res = await fetch(
        `https://api.ultramsg.com/${cleanInstanceId}/instance/status?token=${cleanApiKey}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(12000),
        }
      );

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          status: "invalid",
          error: "UltraMsg authentication failed. Please check Instance ID and Token.",
        });
      }

      const data = await res.json();
      if (data.error) {
        return NextResponse.json({
          success: false,
          status: "invalid",
          error: `UltraMsg: ${data.error}`,
        });
      }

      const st = data.status || data.state;
      const isConnected = st === "authenticated" || st === "connected";
      return NextResponse.json({
        success: true,
        status: isConnected ? "connected" : "standby",
        message: isConnected
          ? "UltraMsg Connected & Authenticated! Ready to send messages."
          : `Credentials are valid. UltraMsg instance status: "${st || "Active"}".`,
        details: data,
      });
    } else if (provider === "wati") {
      let endpoint = cleanInstanceId;
      if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
        endpoint = `https://${endpoint}`;
      }
      endpoint = endpoint.replace(/\/$/, "");

      const res = await fetch(`${endpoint}/api/v1/getTemplates`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${cleanApiKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          status: "invalid",
          error: "WATI connection failed. Please check API Endpoint URL and Bearer Access Token.",
        });
      }

      return NextResponse.json({
        success: true,
        status: "connected",
        message: "WATI WhatsApp API Connected & Authorized successfully!",
      });
    } else if (provider === "twilio") {
      const authHeader = `Basic ${Buffer.from(`${cleanInstanceId}:${cleanApiKey}`).toString("base64")}`;
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cleanInstanceId}.json`, {
        method: "GET",
        headers: { Authorization: authHeader },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          status: "invalid",
          error: "Twilio authentication failed. Please verify Account SID and Auth Token.",
        });
      }

      const data = await res.json();
      return NextResponse.json({
        success: true,
        status: "connected",
        message: `Twilio Account (${data.friendly_name || cleanInstanceId}) Connected & Active!`,
        details: data,
      });
    }

    return NextResponse.json({ success: false, error: "Unsupported provider" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      status: "error",
      error: err?.message || "Failed to reach provider API. Please verify network connectivity and credentials.",
    });
  }
}
