import { NextResponse } from "next/server";
import { google } from "googleapis";
import { isDemoMode } from "@/lib/demo-data";

export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json(
      { success: false, connected: false, error: "Test Sheets API is disabled in Demo Mode" },
      { status: 403 }
    );
  }

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { success: false, error: "Forbidden in production" },
      { status: 403 }
    );
  }

  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!spreadsheetId || !keyFile) {
      return NextResponse.json(
        {
          success: false,
          connected: false,
          error: "Google Sheets configuration missing",
        },
        { status: 500 }
      );
    }

    const auth = new google.auth.GoogleAuth({
      keyFile,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({
      version: "v4",
      auth,
    });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "Bookings!A1:G1",
    });

    const columns = response.data.values?.[0] ?? [];

    return NextResponse.json({
      success: true,
      connected: true,
      columns,
    });
  } catch (err: unknown) {
    const rawMessage = err instanceof Error ? err.message : "Internal Server Error";
    // Sanitize any sensitive key patterns
    const safeMessage = rawMessage.replace(/-----BEGIN[^-]+-----[\s\S]*?-----END[^-]+-----/g, "[REDACTED]");

    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: safeMessage,
      },
      { status: 500 }
    );
  }
}
