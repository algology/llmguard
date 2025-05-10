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

    // Proxy the request to the FastAPI backend server that's already running
    // This assumes the FastAPI server is running on localhost:8000
    const fastApiEndpoint = "http://localhost:8000/scan/comprehensive";

    // Forward the request to FastAPI
    const apiResponse = await fetch(fastApiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse
        .json()
        .catch(() => ({ error: "Unknown error occurred" }));
      return NextResponse.json(
        { error: errorData.error || "Unknown error occurred" },
        { status: apiResponse.status }
      );
    }

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
  } catch (error) {
    console.error("Error handling scan request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
