import { DrawResult, GoogleSheetsConfig } from '../types';

/**
 * Sends a single lucky draw result to the user's linked Google Sheet.
 * Supports both Google Apps Script Web App (Webhook) and Direct REST API.
 */
export async function syncSingleDrawToSheets(
  draw: DrawResult, 
  config: GoogleSheetsConfig
): Promise<{ success: boolean; error?: string }> {
  
  if (config.syncMethod === 'webapp') {
    if (!config.webappUrl) {
      return { success: false, error: 'Google Apps Script Web App URL is empty.' };
    }

    try {
      // Under standard fetch inside web containers, POSTing to an outside macro script
      // works perfectly when wrapping the payload. 
      const response = await fetch(config.webappUrl, {
        method: 'POST',
        mode: 'cors', // Let's request CORS standard
        headers: {
          'Content-Type': 'text/plain', // Apps Script accepts text/plain to avoid CORS preflight problems
        },
        body: JSON.stringify(draw),
      });

      // Google Apps Script usually returns 302 redirect. Modern fetch handles redirects automatically.
      // If we got a response or let it complete:
      return { success: true };
    } catch (error: any) {
      // Fallback in case of CORS block - we also do a silent attempt as no-cors as a last resort
      try {
        await fetch(config.webappUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify(draw),
        });
        return { success: true }; // no-cors succeeds silently
      } catch (innerErr: any) {
        return { success: false, error: innerErr.message || String(innerErr) };
      }
    }
  } else {
    // Direct Google Sheets API
    if (!config.spreadsheetId) {
      return { success: false, error: 'Google Sheets Spreadsheet ID is empty.' };
    }
    if (!config.accessToken) {
      return { success: false, error: 'Google OAuth Access Token is missing.' };
    }

    try {
      const range = 'Sheet1!A:J';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
      
      const payload = {
        range: range,
        majorDimension: 'ROWS',
        values: [
          [
            draw.timestamp,
            draw.participantName,
            draw.participantWhatsapp,
            "'" + draw.participantKtp, // Prefixed with apostrophe so Google Sheets keeps 16 digits as String
            draw.deviceId,
            draw.prizeId,
            draw.prizeLabel,
            draw.status,
            draw.isDowngraded ? "YES" : "NO",
            draw.originalPrizeLabel || "-"
          ]
        ]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const message = errorJson?.error?.message || `Status Code ${response.status}`;
        throw new Error(message);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || String(error) };
    }
  }
}

/**
 * Creates a brand new Google Spreadsheet using the user's Authorized Access Token (Direct API).
 */
export async function createGoogleSpreadsheet(
  accessToken: string,
  title: string
): Promise<{ success: boolean; spreadsheetId?: string; url?: string; error?: string }> {
  if (!accessToken) {
    return { success: false, error: 'Google OAuth token is missing.' };
  }

  try {
    const url = 'https://sheets.googleapis.com/v4/spreadsheets';
    const payload = {
      properties: {
        title: title
      },
      sheets: [
        {
          properties: {
            title: 'Sheet1',
            gridProperties: {
              rowCount: 1000,
              columnCount: 10
            }
          }
        }
      ]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const message = errorJson?.error?.message || `Error status ${response.status}`;
      throw new Error(message);
    }

    const data = await response.json();
    return {
      success: true,
      spreadsheetId: data.spreadsheetId,
      url: data.spreadsheetUrl
    };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}
