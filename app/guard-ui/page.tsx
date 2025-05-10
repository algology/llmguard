"use client";

import { useState, KeyboardEvent } from "react";

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

interface ScanRequestBody {
  prompt: string;
  scanners: ScannerName[];
  banned_substrings_list?: string[];
  regex_patterns_list?: string[];
}

const ALL_SCANNERS: {
  id: ScannerName;
  displayName: string;
  configurable?: boolean;
  description?: string;
}[] = [
  {
    id: "anonymize",
    displayName: "Anonymize PII",
    description: "Redacts PII like names, emails, phone numbers.",
  },
  {
    id: "secrets",
    displayName: "Detect Secrets",
    description: "Flags leaked API keys, passwords, etc.",
  },
  {
    id: "toxicity",
    displayName: "Assess Toxicity",
    description: "Scores prompt for toxic content.",
  },
  {
    id: "bansubstrings",
    displayName: "Ban Substrings",
    configurable: true,
    description: "Blocks/redacts specific keywords or phrases.",
  },
  {
    id: "regex",
    displayName: "Regex Pattern Match",
    configurable: true,
    description: "Matches custom regex patterns to block/flag content.",
  },
  {
    id: "code",
    displayName: "Detect Code",
    description: "Identifies and flags source code in prompts.",
  },
];

// Helper to interpret risk score
const getRiskLevel = (score: number): { level: string; color: string } => {
  if (score > 0.75) return { level: "High", color: "text-red-400" };
  if (score > 0.4) return { level: "Medium", color: "text-yellow-400" };
  return { level: "Low", color: "text-green-400" };
};

export default function GuardScannerPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedScanners, setSelectedScanners] = useState<ScannerName[]>([
    "anonymize",
  ]);
  const [apiResponse, setApiResponse] =
    useState<ComprehensiveScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for configurable scanners
  const [customBannedSubstrings, setCustomBannedSubstrings] = useState<
    string[]
  >([]);
  const [currentSubstring, setCurrentSubstring] = useState("");
  const [customRegexPatterns, setCustomRegexPatterns] = useState<string[]>([]);
  const [currentRegexPattern, setCurrentRegexPattern] = useState("");

  const handleScannerChange = (scannerId: ScannerName) => {
    setSelectedScanners((prev) =>
      prev.includes(scannerId)
        ? prev.filter((s) => s !== scannerId)
        : [...prev, scannerId]
    );
    setApiResponse(null);
    setError(null);
  };

  // Handlers for custom banned substrings
  const handleAddSubstring = () => {
    if (
      currentSubstring.trim() &&
      !customBannedSubstrings.includes(currentSubstring.trim())
    ) {
      setCustomBannedSubstrings([
        ...customBannedSubstrings,
        currentSubstring.trim(),
      ]);
      setCurrentSubstring("");
    }
  };
  const handleSubstringKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddSubstring();
    }
  };
  const handleRemoveSubstring = (subToRemove: string) => {
    setCustomBannedSubstrings(
      customBannedSubstrings.filter((sub) => sub !== subToRemove)
    );
  };

  // Handlers for custom regex patterns
  const handleAddRegexPattern = () => {
    if (
      currentRegexPattern.trim() &&
      !customRegexPatterns.includes(currentRegexPattern.trim())
    ) {
      setCustomRegexPatterns([
        ...customRegexPatterns,
        currentRegexPattern.trim(),
      ]);
      setCurrentRegexPattern("");
    }
  };
  const handleRegexPatternKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddRegexPattern();
    }
  };
  const handleRemoveRegexPattern = (patternToRemove: string) => {
    setCustomRegexPatterns(
      customRegexPatterns.filter((pat) => pat !== patternToRemove)
    );
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

    const requestBody: ScanRequestBody = {
      prompt,
      scanners: selectedScanners,
    };

    if (
      selectedScanners.includes("bansubstrings") &&
      customBannedSubstrings.length > 0
    ) {
      requestBody.banned_substrings_list = customBannedSubstrings;
    }
    if (selectedScanners.includes("regex") && customRegexPatterns.length > 0) {
      requestBody.regex_patterns_list = customRegexPatterns;
    }

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error occurred" }));
        throw new Error(
          `API Error (${response.status}): ${
            errorData.error || response.statusText
          }`
        );
      }

      const data = await response.json();
      setApiResponse({
        original_prompt: prompt,
        final_sanitized_prompt: data.sanitized_prompt || prompt,
        overall_is_valid: data.is_valid,
        applied_scanners_results: [
          {
            scanner_name: "anonymize",
            input_prompt: prompt,
            sanitized_prompt: data.sanitized_prompt || prompt,
            is_valid: data.is_valid,
            risk_score: data.risk_score || 0,
            details: data.details || {},
          },
        ],
      });
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
          Safe.ai Interface
        </h1>
        <p className="text-gray-400 mt-2">
          Select & configure scanners, then enter a prompt to test.
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
            placeholder="E.g., My name is Jane Doe, my email is jane@example.com, and Project Chimera is critical..."
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500 text-base resize-none h-32"
            rows={5}
          />
        </div>

        {/* Scanner Selection with Descriptions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">
            Select Scanners:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ALL_SCANNERS.map((scanner) => (
              <div
                key={scanner.id}
                className={`p-3 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors ${
                  selectedScanners.includes(scanner.id)
                    ? "ring-2 ring-purple-500"
                    : "border border-gray-600"
                }`}
              >
                <label className="flex items-center space-x-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedScanners.includes(scanner.id)}
                    onChange={() => handleScannerChange(scanner.id)}
                    className="form-checkbox h-5 w-5 text-purple-500 bg-gray-800 border-gray-600 rounded focus:ring-purple-600 focus:ring-offset-gray-800"
                  />
                  <span className="text-gray-100 font-medium">
                    {scanner.displayName}
                  </span>
                </label>
                {scanner.description && (
                  <p className="text-xs text-gray-400 mt-1 pl-8">
                    {scanner.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* --- Configuration for BanSubstrings (if selected) --- */}
        {selectedScanners.includes("bansubstrings") && (
          <div className="mb-8 p-4 border border-gray-700 rounded-lg bg-gray-750">
            <h4 className="text-md font-semibold mb-2 text-purple-300">
              Configure Ban Substrings:
            </h4>
            <div className="flex items-center mb-2">
              <input
                type="text"
                value={currentSubstring}
                onChange={(e) => setCurrentSubstring(e.target.value)}
                onKeyDown={handleSubstringKeyDown}
                placeholder="Enter substring to ban"
                className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-l-md focus:ring-1 focus:ring-purple-500 text-sm"
              />
              <button
                onClick={handleAddSubstring}
                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-r-md text-sm"
              >
                Add
              </button>
            </div>
            {customBannedSubstrings.length > 0 && (
              <ul className="list-disc list-inside pl-1 space-y-1 max-h-20 overflow-y-auto">
                {customBannedSubstrings.map((sub) => (
                  <li
                    key={sub}
                    className="text-xs text-gray-300 flex justify-between items-center bg-gray-700 p-1 rounded"
                  >
                    <span>{sub}</span>
                    <button
                      onClick={() => handleRemoveSubstring(sub)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold ml-2"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {customBannedSubstrings.length === 0 && (
              <p className="text-xs text-gray-500 italic">
                No custom substrings banned. Will use server defaults if any, or
                none if list is empty on server too.
              </p>
            )}
          </div>
        )}

        {/* --- Configuration for Regex Patterns (if selected) --- */}
        {selectedScanners.includes("regex") && (
          <div className="mb-8 p-4 border border-gray-700 rounded-lg bg-gray-750">
            <h4 className="text-md font-semibold mb-2 text-purple-300">
              Configure Regex Patterns:
            </h4>
            <div className="flex items-center mb-2">
              <input
                type="text"
                value={currentRegexPattern}
                onChange={(e) => setCurrentRegexPattern(e.target.value)}
                onKeyDown={handleRegexPatternKeyDown}
                placeholder="Enter regex pattern to block/flag"
                className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-l-md focus:ring-1 focus:ring-purple-500 text-sm"
              />
              <button
                onClick={handleAddRegexPattern}
                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-r-md text-sm"
              >
                Add
              </button>
            </div>
            {customRegexPatterns.length > 0 && (
              <ul className="list-disc list-inside pl-1 space-y-1 max-h-20 overflow-y-auto">
                {customRegexPatterns.map((pattern) => (
                  <li
                    key={pattern}
                    className="text-xs text-gray-300 flex justify-between items-center bg-gray-700 p-1 rounded"
                  >
                    <code className="text-xs">{pattern}</code>
                    <button
                      onClick={() => handleRemoveRegexPattern(pattern)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold ml-2"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {customRegexPatterns.length === 0 && (
              <p className="text-xs text-gray-500 italic">
                No custom regex patterns. Will use server defaults if any, or
                none if list is empty on server too.
              </p>
            )}
          </div>
        )}

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
                  {apiResponse.applied_scanners_results.map((result, index) => {
                    const scannerInfo = ALL_SCANNERS.find(
                      (s) => s.id === result.scanner_name
                    );
                    const riskMeta = getRiskLevel(result.risk_score);
                    return (
                      <div
                        key={index}
                        className={`p-5 border rounded-lg shadow-lg ${
                          result.is_valid
                            ? "border-gray-600"
                            : "border-red-500 bg-red-900 bg-opacity-20"
                        } bg-gray-750`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xl font-semibold text-purple-300">
                            {scannerInfo?.displayName || result.scanner_name}
                          </h4>
                          <span
                            className={`inline-block px-4 py-1.5 text-xs font-bold text-white rounded-full border-2 ${
                              result.is_valid
                                ? "bg-green-600 border-green-500"
                                : "bg-red-600 border-red-500"
                            }`}
                          >
                            {result.is_valid ? "VALID" : "INVALID"}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm mb-3">
                          <div>
                            <span className="font-semibold text-gray-400 block mb-0.5">
                              Risk Score:
                            </span>
                            <span
                              className={`font-bold text-lg ${riskMeta.color}`}
                            >
                              {result.risk_score.toFixed(2)} ({riskMeta.level})
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-400 block mb-0.5">
                              Input to this Scanner:
                            </span>
                            <p className="text-gray-300 whitespace-pre-wrap break-words bg-gray-700 p-2 rounded mt-1 text-xs">
                              {result.input_prompt}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-400 block mb-0.5">
                              Output from this Scanner:
                            </span>
                            <p className="text-gray-300 whitespace-pre-wrap break-words bg-gray-700 p-2 rounded mt-1 text-xs">
                              {result.sanitized_prompt}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-400 block mb-0.5">
                              Is Valid:
                            </span>
                            <span
                              className={`font-bold text-lg ${
                                result.is_valid
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {result.is_valid ? "Yes" : "No"}
                            </span>
                          </div>
                          {Object.keys(result.details).length > 0 && (
                            <div className="md:col-span-2 mt-1">
                              <span className="font-semibold text-gray-400 block mb-0.5">
                                Additional Details:
                              </span>
                              <pre className="text-gray-300 whitespace-pre-wrap break-words bg-gray-700 p-2 rounded mt-1 text-xs">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
