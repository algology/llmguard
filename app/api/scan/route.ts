import { NextResponse } from "next/server";

// Define the request body type
interface ScanRequest {
  prompt: string;
  scanners?: string[];
  banned_substrings_list?: string[];
  regex_patterns_list?: string[];
}

// Define the scanner result type to match the expected response
interface ScannerResult {
  scanner_name: string;
  input_prompt: string;
  sanitized_prompt: string;
  is_valid: boolean;
  risk_score: number;
  details: Record<string, unknown>;
}

// Define the response type to match what frontend expects
interface ScanResponse {
  original_prompt: string;
  final_sanitized_prompt: string;
  overall_is_valid: boolean;
  applied_scanners_results: ScannerResult[];
}

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body: ScanRequest = await request.json();

    try {
      // Try to proxy the request to the FastAPI backend server that's running
      const fastApiEndpoint = "http://localhost:8000/scan/comprehensive";

      // Forward the request to FastAPI
      const apiResponse = await fetch(fastApiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        // Add a timeout to avoid waiting too long for a connection
        signal: AbortSignal.timeout(3000),
      });

      if (apiResponse.ok) {
        // Parse the API response
        const apiData = await apiResponse.json();

        // Build a response object that matches what the frontend expects
        const response: ScanResponse = {
          original_prompt: body.prompt,
          final_sanitized_prompt: apiData.sanitized_prompt || body.prompt,
          overall_is_valid: apiData.is_valid || false,
          applied_scanners_results: [
            {
              scanner_name: "anonymize",
              input_prompt: body.prompt,
              sanitized_prompt: apiData.sanitized_prompt || body.prompt,
              is_valid: apiData.is_valid || false,
              risk_score: apiData.risk_score || 0,
              details: apiData.details || {},
            },
          ],
        };

        return NextResponse.json(response);
      }
    } catch (apiError) {
      console.error("Failed to connect to FastAPI server:", apiError);
      // Continue to fallback
    }

    // Fallback response when FastAPI server is not available
    // Simple mock scanning logic
    const prompt = body.prompt;
    let sanitizedPrompt = prompt;
    let isValid = true;
    let riskScore = 0.1;
    const details: Record<string, unknown> = {};

    // Simple check for PII (emails, phone numbers, credit cards)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex =
      /(\+\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const creditCardRegex = /\b(?:\d{4}[\s-]?){3}\d{4}\b/g;

    // Run some simple checks
    const hasEmail = emailRegex.test(prompt);
    const hasPhone = phoneRegex.test(prompt);
    const hasCreditCard = creditCardRegex.test(prompt);
    const hasPII = hasEmail || hasPhone || hasCreditCard;

    // Check for toxicity with simple detection (very basic example)
    const toxicWords = ["shit", "fuck", "damn", "ass", "idiot", "stupid"];
    const hasToxicity = toxicWords.some((word) =>
      prompt.toLowerCase().includes(word)
    );

    // Check for secrets
    const potentialSecrets = [
      "api_key",
      "password",
      "secret",
      "token",
      "apikey",
    ];
    const hasSecrets = potentialSecrets.some((word) =>
      prompt.toLowerCase().includes(word)
    );

    // Perform basic sanitization
    if (hasPII) {
      sanitizedPrompt = sanitizedPrompt.replace(emailRegex, "[REDACTED_EMAIL]");
      sanitizedPrompt = sanitizedPrompt.replace(phoneRegex, "[REDACTED_PHONE]");
      sanitizedPrompt = sanitizedPrompt.replace(
        creditCardRegex,
        "[REDACTED_CC]"
      );
      riskScore = Math.max(riskScore, 0.8);
    }

    // Set validity based on our checks
    if (hasToxicity) {
      isValid = false;
      riskScore = Math.max(riskScore, 0.9);
      details.toxicity = { score: 0.9, detected: true };
    }

    if (hasSecrets) {
      isValid = false;
      riskScore = Math.max(riskScore, 0.95);
      details.secrets = { score: 0.95, detected: true };
    }

    // Construct fallback response that matches the expected format
    const fallbackResponse: ScanResponse = {
      original_prompt: prompt,
      final_sanitized_prompt: sanitizedPrompt,
      overall_is_valid: isValid,
      applied_scanners_results: [
        {
          scanner_name: "anonymize",
          input_prompt: prompt,
          sanitized_prompt: sanitizedPrompt,
          is_valid: isValid,
          risk_score: riskScore,
          details,
        },
      ],
    };

    return NextResponse.json(fallbackResponse);
  } catch (error) {
    console.error("Error handling scan request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
