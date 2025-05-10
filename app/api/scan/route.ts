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
        console.log("FastAPI response:", JSON.stringify(apiData, null, 2));

        // For debugging: log the structure of the API response
        console.log("FastAPI response structure:", Object.keys(apiData));

        // Check if the FastAPI response already has the expected structure
        if (
          apiData.applied_scanners_results &&
          Array.isArray(apiData.applied_scanners_results)
        ) {
          return NextResponse.json(apiData);
        }

        // Otherwise, extract from the FastAPI response format
        const scannerResults: ScannerResult[] = [];
        const requestedScanners = body.scanners || ["anonymize"];

        // Map scanner names to their result fields in the API response
        const scannerFieldMap: Record<string, string> = {
          anonymize: "anonymize_result",
          toxicity: "toxicity_result",
          secrets: "secrets_result",
          bansubstrings: "banned_substrings_result",
          regex: "regex_result",
          code: "code_result",
        };

        // Process each scanner that was requested
        for (const scannerName of requestedScanners) {
          // Get the corresponding field from the API response
          const resultField = scannerFieldMap[scannerName];
          const result = resultField ? apiData[resultField] : null;

          let scannerResult: ScannerResult;

          if (result) {
            // If we have scanner-specific results, use them
            scannerResult = {
              scanner_name: scannerName,
              input_prompt: body.prompt,
              sanitized_prompt:
                result.sanitized_prompt ||
                apiData.sanitized_prompt ||
                body.prompt,
              is_valid: result.is_valid !== false, // Default to true if not explicitly false
              risk_score: result.risk_score || 0,
              details: result.details || {},
            };
          } else {
            // If no specific results, use the overall results
            scannerResult = {
              scanner_name: scannerName,
              input_prompt: body.prompt,
              sanitized_prompt: apiData.sanitized_prompt || body.prompt,
              is_valid:
                scannerName === "anonymize" ? apiData.is_valid !== false : true, // Only anonymize affects validity by default
              risk_score:
                scannerName === "anonymize" ? apiData.risk_score || 0 : 0,
              details: {},
            };
          }

          // Add scanner-specific information from logs/detection
          if (scannerName === "anonymize" && apiData.detection?.pii) {
            scannerResult.details.pii_detected = true;
            scannerResult.details.entities = apiData.detection.pii;
          } else if (
            scannerName === "toxicity" &&
            apiData.detection?.toxicity
          ) {
            scannerResult.details.toxicity_scores = apiData.detection.toxicity;
            scannerResult.is_valid = !apiData.detection.toxicity.some(
              (item: any) => item.score > 0.7
            );
          } else if (
            scannerName === "bansubstrings" &&
            apiData.detection?.banned_substrings
          ) {
            scannerResult.details.banned_matches =
              apiData.detection.banned_substrings;
            scannerResult.is_valid =
              !apiData.detection.banned_substrings.length;
          }

          scannerResults.push(scannerResult);
        }

        // The final sanitized prompt is the output after all scanners have processed it
        const finalSanitizedPrompt = apiData.sanitized_prompt || body.prompt;

        // Calculate overall validity (valid only if all scanners pass)
        const overallIsValid = scannerResults.every(
          (result) => result.is_valid
        );

        // Build the response in the format the frontend expects
        const response: ScanResponse = {
          original_prompt: body.prompt,
          final_sanitized_prompt: finalSanitizedPrompt,
          overall_is_valid: overallIsValid,
          applied_scanners_results: scannerResults,
        };

        return NextResponse.json(response);
      }
    } catch (apiError) {
      console.error("Failed to connect to FastAPI server:", apiError);
      // Continue to fallback implementation
    }

    // Fallback response when FastAPI server is not available
    // Simple mock scanning logic
    const prompt = body.prompt;
    let sanitizedPrompt = prompt;
    let isValid = true;
    let riskScore = 0;
    const details: Record<string, unknown> = {};

    // Simple check for PII (emails, phone numbers, credit cards, SSNs)
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex =
      /(\+\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
    const creditCardRegex = /\b(?:\d{4}[\s-]?){3}\d{4}\b/g;
    const ssnRegex = /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g;

    // Check for names
    const nameRegex =
      /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s?[A-Z][a-z]+ (?:[A-Z][a-z]+\s?)+/g;

    // Run some checks
    const hasEmail = emailRegex.test(prompt);
    const hasPhone = phoneRegex.test(prompt);
    const hasCreditCard = creditCardRegex.test(prompt);
    const hasSSN = ssnRegex.test(prompt);
    const hasName = nameRegex.test(prompt);
    const hasPII = hasEmail || hasPhone || hasCreditCard || hasSSN || hasName;

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
      "api key",
      "access key",
      "private key",
    ];
    const hasSecrets = potentialSecrets.some((word) =>
      prompt.toLowerCase().includes(word)
    );

    // Perform basic sanitization
    let anonymizeValid = true;
    let anonymizeRiskScore = 0;
    let anonymizeDetails: Record<string, unknown> = {};

    if (hasPII) {
      sanitizedPrompt = sanitizedPrompt.replace(emailRegex, "[REDACTED_EMAIL]");
      sanitizedPrompt = sanitizedPrompt.replace(phoneRegex, "[REDACTED_PHONE]");
      sanitizedPrompt = sanitizedPrompt.replace(
        creditCardRegex,
        "[REDACTED_CC]"
      );
      sanitizedPrompt = sanitizedPrompt.replace(ssnRegex, "[REDACTED_SSN]");
      sanitizedPrompt = sanitizedPrompt.replace(nameRegex, "[REDACTED_PERSON]");
      anonymizeRiskScore = 0.8;
      anonymizeValid = false;
      anonymizeDetails = {
        pii_detected: true,
        found: {
          email: hasEmail,
          phone: hasPhone,
          creditCard: hasCreditCard,
          ssn: hasSSN,
          name: hasName,
        },
      };
    }

    // Set toxicity validity and details
    let toxicityValid = !hasToxicity;
    let toxicityRiskScore = hasToxicity ? 0.9 : 0;
    let toxicityDetails: Record<string, unknown> = hasToxicity
      ? {
          toxicity_detected: true,
          words_found: toxicWords.filter((word) =>
            prompt.toLowerCase().includes(word)
          ),
        }
      : {};

    // Set secrets validity and details
    let secretsValid = !hasSecrets;
    let secretsRiskScore = hasSecrets ? 0.95 : 0;
    let secretsDetails: Record<string, unknown> = hasSecrets
      ? {
          secrets_detected: true,
          potential_matches: potentialSecrets.filter((word) =>
            prompt.toLowerCase().includes(word)
          ),
        }
      : {};

    // Create scanner results for each requested scanner
    const scannerResults: ScannerResult[] = [];

    // Only process the scanners that were requested
    (body.scanners || ["anonymize"]).forEach((scannerName) => {
      if (scannerName === "anonymize") {
        scannerResults.push({
          scanner_name: scannerName,
          input_prompt: prompt,
          sanitized_prompt: sanitizedPrompt,
          is_valid: anonymizeValid,
          risk_score: anonymizeRiskScore,
          details: anonymizeDetails,
        });
      } else if (scannerName === "toxicity") {
        scannerResults.push({
          scanner_name: scannerName,
          input_prompt: prompt,
          sanitized_prompt: prompt, // Toxicity doesn't sanitize
          is_valid: toxicityValid,
          risk_score: toxicityRiskScore,
          details: toxicityDetails,
        });
      } else if (scannerName === "secrets") {
        scannerResults.push({
          scanner_name: scannerName,
          input_prompt: prompt,
          sanitized_prompt: prompt, // Secrets doesn't sanitize
          is_valid: secretsValid,
          risk_score: secretsRiskScore,
          details: secretsDetails,
        });
      } else if (scannerName === "bansubstrings") {
        // Mock implementation for bansubstrings
        scannerResults.push({
          scanner_name: scannerName,
          input_prompt: prompt,
          sanitized_prompt: prompt,
          is_valid: true,
          risk_score: 0,
          details: { substrings_detected: false },
        });
      } else if (scannerName === "regex") {
        // Mock implementation for regex
        scannerResults.push({
          scanner_name: scannerName,
          input_prompt: prompt,
          sanitized_prompt: prompt,
          is_valid: true,
          risk_score: 0,
          details: { regex_matches_detected: false },
        });
      } else if (scannerName === "code") {
        // Mock implementation for code detection
        scannerResults.push({
          scanner_name: scannerName,
          input_prompt: prompt,
          sanitized_prompt: prompt,
          is_valid: true,
          risk_score: 0,
          details: { code_detected: false },
        });
      }
    });

    // Determine overall validity - invalid if any scanner is invalid
    const overallIsValid = scannerResults.every((result) => result.is_valid);

    // Construct fallback response that matches the expected format
    const fallbackResponse: ScanResponse = {
      original_prompt: prompt,
      final_sanitized_prompt: sanitizedPrompt,
      overall_is_valid: overallIsValid,
      applied_scanners_results: scannerResults,
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
