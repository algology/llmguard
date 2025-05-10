"use client";

import { useState } from "react";

// Updated ScannerName to match backend Pydantic model
type ScannerName =
  | "anonymize"
  | "secrets"
  | "toxicity"
  | "bansubstrings"
  | "regex"
  | "code";

interface SingleScannerResult {
  scanner_name: ScannerName;
  input_prompt: string;
  sanitized_prompt: string;
  is_valid: boolean;
  risk_score: number;
  details: Record<string, unknown>;
}

interface ComprehensiveScanResponse {
  original_prompt: string;
  final_sanitized_prompt: string;
  overall_is_valid: boolean;
  applied_scanners_results: SingleScannerResult[];
}

const ALL_SCANNERS: { id: ScannerName; displayName: string }[] = [
  { id: "anonymize", displayName: "Anonymize PII" },
  { id: "secrets", displayName: "Detect Secrets" },
  { id: "toxicity", displayName: "Assess Toxicity" },
  { id: "bansubstrings", displayName: "Ban Substrings" },
  { id: "regex", displayName: "Regex Pattern Match" },
  { id: "code", displayName: "Detect Code" },
];

export default function GuardScannerPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedScanners, setSelectedScanners] = useState<ScannerName[]>([
    "anonymize",
  ]);
  const [apiResponse, setApiResponse] =
    useState<ComprehensiveScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScannerChange = (scannerId: ScannerName) => {
    setSelectedScanners((prev) =>
      prev.includes(scannerId)
        ? prev.filter((s) => s !== scannerId)
        : [...prev, scannerId]
    );
    setApiResponse(null);
    setError(null);
  };

  const handleScanPrompt = async () => {
    if (!prompt.trim()) {
      setError("Prompt cannot be empty.");
      setApiResponse(null);
      return;
    }
    if (selectedScanners.length === 0) {
      setError("Please select at least one scanner.");
      setApiResponse(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setApiResponse(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, scanners: selectedScanners }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error occurred" }));
        throw new Error(
          `API Error (${response.status}): ${
            errorData.detail || response.statusText
          }`
        );
      }

      const data: ComprehensiveScanResponse = await response.json();
      setApiResponse(data);
    } catch (e: unknown) {
      console.error("Error scanning prompt:", e);
      setError(e instanceof Error ? e.message : "Failed to fetch from API");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 md:p-8">
      <header className="w-full max-w-4xl mb-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-purple-400">
          LLM Guard Interface
        </h1>
        <p className="text-gray-400 mt-2">
          Select scanners and enter a prompt to analyze.
        </p>
      </header>

      <main className="w-full max-w-4xl bg-gray-800 shadow-2xl rounded-lg p-6 md:p-8">
        <div className="mb-6">
          <label
            htmlFor="prompt"
            className="block text-lg font-semibold mb-2 text-gray-300"
          >
            Enter your prompt:
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., My name is John Doe and my secret project is codenamed Project Chimera..."
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500 text-base resize-none h-32"
            rows={5}
          />
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">
            Select Scanners:
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {ALL_SCANNERS.map((scanner) => (
              <label
                key={scanner.id}
                className="flex items-center space-x-2 p-3 bg-gray-700 rounded-md hover:bg-gray-600 cursor-pointer transition-colors select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedScanners.includes(scanner.id)}
                  onChange={() => handleScannerChange(scanner.id)}
                  className="form-checkbox h-5 w-5 text-purple-500 bg-gray-800 border-gray-600 rounded focus:ring-purple-600 focus:ring-offset-gray-800"
                />
                <span className="text-gray-200">{scanner.displayName}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleScanPrompt}
          disabled={isLoading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Scanning...
            </>
          ) : (
            "Scan Prompt with Selected Guards"
          )}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-700 border border-red-900 rounded-md text-white">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {apiResponse && (
          <div className="mt-8 space-y-6">
            <h2 className="text-2xl font-semibold text-purple-400 border-b border-gray-700 pb-2">
              Scan Results
            </h2>

            <div className="p-4 bg-gray-700 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-200 mb-1">
                Original Prompt:
              </h3>
              <p className="text-gray-300 whitespace-pre-wrap break-words">
                {apiResponse.original_prompt}
              </p>
            </div>

            <div className="p-4 bg-gray-700 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-200 mb-1">
                Final Sanitized Prompt:
              </h3>
              <p className="text-gray-300 whitespace-pre-wrap break-words">
                {apiResponse.final_sanitized_prompt}
              </p>
            </div>

            <div className="p-4 bg-gray-700 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-200 mb-1">
                Overall Validity:
              </h3>
              <p
                className={`font-bold ${
                  apiResponse.overall_is_valid
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {apiResponse.overall_is_valid
                  ? "Valid"
                  : "Invalid (Potential Risks Found)"}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-200 mb-3 pt-3 border-t border-gray-700">
                Individual Scanner Details:
              </h3>
              {apiResponse.applied_scanners_results.length > 0 ? (
                <div className="space-y-4">
                  {apiResponse.applied_scanners_results.map((result, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-600 rounded-lg bg-gray-750 shadow"
                    >
                      <h4 className="text-lg font-semibold text-purple-300 mb-2">
                        {ALL_SCANNERS.find((s) => s.id === result.scanner_name)
                          ?.displayName || result.scanner_name}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="font-semibold text-gray-400">
                            Input to this Scanner:
                          </span>
                          <p className="text-gray-300 whitespace-pre-wrap break-words bg-gray-700 p-2 rounded mt-1 text-xs">
                            {result.input_prompt}
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-400">
                            Output from this Scanner:
                          </span>
                          <p className="text-gray-300 whitespace-pre-wrap break-words bg-gray-700 p-2 rounded mt-1 text-xs">
                            {result.sanitized_prompt}
                          </p>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-400">
                            Is Valid:
                          </span>
                          <span
                            className={`ml-2 font-semibold ${
                              result.is_valid
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {result.is_valid ? "Yes" : "No"}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-400">
                            Risk Score:
                          </span>
                          <span
                            className={`ml-2 font-semibold ${
                              result.risk_score > 0.5
                                ? "text-yellow-400"
                                : "text-green-400"
                            }`}
                          >
                            {result.risk_score.toFixed(2)}
                          </span>
                        </div>
                        {Object.keys(result.details).length > 0 && (
                          <div className="md:col-span-2 mt-1">
                            <span className="font-semibold text-gray-400">
                              Additional Details:
                            </span>
                            <pre className="text-gray-300 whitespace-pre-wrap break-words bg-gray-700 p-2 rounded mt-1 text-xs">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">
                  No scanners were applied or selected.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-4xl mt-12 text-center text-gray-500 text-sm">
        <p>Powered by LLM Guard</p>
      </footer>
    </div>
  );
}
