from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal, Dict, Any, Optional
from llm_guard.input_scanners import (
    Anonymize, 
    Secrets, 
    Toxicity,
    BanSubstrings,
    Code
)
from llm_guard.input_scanners.regex import Regex
from llm_guard.vault import Vault

# In a real application, you would configure the vault more securely.
# For this example, we'll use an in-memory vault.
vault = Vault()

# Attempt to configure Anonymizer for CPU
# Define entity types for the custom recognizer
ANONYMIZE_ENTITY_TYPES = ["PERSON", "PHONE_NUMBER", "EMAIL_ADDRESS", "ORGANIZATION"]

# This configuration attempts to force the underlying Hugging Face transformer model 
# used by Presidio within the Anonymize scanner to run on CPU.
CPU_RECOGNIZER_CONF = {
    "nlp_engine_name": "spacy", # Presidio's default NLP engine
    "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}], # Use a lighter spaCy model for base NER
    "recognizers": [
        {
            "name": "custom_hf_recognizer_cpu",
            "supported_entities": ANONYMIZE_ENTITY_TYPES,
            "type": "transformers",
            "model_path": "Isotonic/deberta-v3-base_finetuned_ai4privacy_v2",
            "pipeline_kwargs": {"device": "cpu"} # Key change: set device to CPU
        }
        # We might need to add other default recognizers Presidio uses if they get overridden,
        # or ensure this custom one is additive or correctly prioritized.
    ]
}

anonymizer_global = Anonymize(
    vault=vault, 
    entity_types=ANONYMIZE_ENTITY_TYPES, # Ensure these match what the recognizer supports
    recognizer_conf=CPU_RECOGNIZER_CONF 
)
secrets_scanner_global = Secrets()
toxicity_scanner_global = Toxicity()

# Example sensitive substrings - in a real app, this would be configurable
BANNED_SUBSTRINGS = ["Project Chimera", "Q4_Roadmap_Internal_Draft", "CONFIDENTIAL_DO_NOT_SHARE"]
ban_substrings_scanner_global = BanSubstrings(
    substrings=BANNED_SUBSTRINGS, 
    match_type="word",
    case_sensitive=False,
    redact=True
)

# Example regex pattern for internal document IDs
# In a real app, this would be configurable and more extensive
INTERNAL_DOC_ID_PATTERN = r"INTDOC-\d{6}-[A-Z]{3}"
regex_scanner_global = Regex(patterns=[INTERNAL_DOC_ID_PATTERN], is_blocked=True, match_type="search")

# Specify languages for the Code scanner, ensuring they are in the scanner's supported list
# From llm_guard.input_scanners.code.SUPPORTED_LANGUAGES
# ['ARM Assembly', 'AppleScript', 'C', 'C#', 'C++', 'COBOL', 'Erlang', 'Fortran', 'Go', 'Java', 'JavaScript', 'Kotlin', 'Lua', 'Mathematica/Wolfram Language', 'PHP', 'Pascal', 'Perl', 'PowerShell', 'Python', 'R', 'Ruby', 'Rust', 'Scala', 'Swift', 'Visual Basic .NET', 'jq']
CORRECTED_CODE_LANGUAGES = [
    "C", "C++", "Go", "Java", "JavaScript", "Kotlin", "PHP", 
    "Perl", "Python", "R", "Ruby", "Rust", "Scala", "Swift"
    # We can add more from the supported list if desired, e.g., 'C#', 'PowerShell'
]
code_scanner_global = Code(languages=CORRECTED_CODE_LANGUAGES)

app = FastAPI()

# CORS configuration
origins = [
    "http://localhost:3000",  # Next.js default dev port
    "http://127.0.0.1:3000",
    # Add other origins if your frontend is served from a different port/domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"], # Allow OPTIONS, GET and POST
    allow_headers=["Content-Type", "Authorization"], # Allow Content-Type, add others if needed
)

class ScanRequest(BaseModel):
    prompt: str

class ScanResponse(BaseModel):
    sanitized_prompt: str
    is_valid: bool
    # Contains a dictionary of risk scores, if applicable.
    # For Anonymize, it might not be directly relevant in terms of a single score,
    # but other scanners might populate this.
    risk_score: float # Keeping it simple for now, can be more complex dict

ScannerName = Literal["anonymize", "secrets", "toxicity", "bansubstrings", "regex", "code"]

class ComprehensiveScanRequest(BaseModel):
    prompt: str
    scanners: List[ScannerName]
    banned_substrings_list: Optional[List[str]] = None
    regex_patterns_list: Optional[List[str]] = None

class SingleScannerResult(BaseModel):
    scanner_name: ScannerName
    input_prompt: str # The prompt as it was fed into THIS scanner
    sanitized_prompt: str
    is_valid: bool
    risk_score: float
    details: Dict[str, Any] = {} # For any extra details from specific scanners if needed

class ComprehensiveScanResponse(BaseModel):
    original_prompt: str
    final_sanitized_prompt: str
    overall_is_valid: bool
    applied_scanners_results: List[SingleScannerResult]

# Allows calling scanners by name and defines a default processing order
# Order can matter: e.g., anonymize before toxicity check on the anonymized text.
AVAILABLE_SCANNERS_GLOBAL: Dict[ScannerName, Any] = {
    "anonymize": anonymizer_global,
    "bansubstrings": ban_substrings_scanner_global,
    "regex": regex_scanner_global, 
    "secrets": secrets_scanner_global,
    "toxicity": toxicity_scanner_global,
    "code": code_scanner_global,
}

# Define a preferred order of execution for scanners that modify content vs. those that assess
# Scanners that redact/modify should generally go first.
SCANNER_EXECUTION_ORDER: List[ScannerName] = [
    "anonymize", 
    "bansubstrings", 
    "regex",       # Can block, so run before non-blocking assessment scanners
    "secrets",     # Detects, doesn't modify by default in our setup
    "toxicity",    # Assesses
    "code"         # Assesses
]

@app.post("/scan/comprehensive", response_model=ComprehensiveScanResponse)
async def scan_comprehensive_prompt(request: ComprehensiveScanRequest):
    original_prompt = request.prompt
    current_prompt_state = original_prompt
    overall_is_valid = True
    applied_scanners_results: List[SingleScannerResult] = []

    # Filter and order the requested scanners according to our defined execution order
    ordered_scanners_to_run = [
        s_name for s_name in SCANNER_EXECUTION_ORDER if s_name in request.scanners
    ]

    for scanner_name in ordered_scanners_to_run:
        scanner_instance = AVAILABLE_SCANNERS_GLOBAL.get(scanner_name)
        if not scanner_instance:
            # Should not happen if ScannerName Literal is used correctly by client
            continue 

        # Override with request-specific configuration if provided
        if scanner_name == "bansubstrings" and request.banned_substrings_list is not None:
            scanner_instance = BanSubstrings(
                substrings=request.banned_substrings_list, 
                match_type="word",
                case_sensitive=False,
                redact=True
            )
        elif scanner_name == "regex" and request.regex_patterns_list is not None:
            scanner_instance = Regex(
                patterns=request.regex_patterns_list, 
                is_blocked=True,
                match_type="search"
            )

        input_for_this_scanner = current_prompt_state
        # Wrap scan call in try-except to catch potential scanner-specific errors
        try:
            sanitized_prompt, is_valid, risk_score = scanner_instance.scan(input_for_this_scanner)
        except Exception as e:
            print(f"Error during {scanner_name} scan: {e}") # Log the error
            # How to handle scanner failure? For now, assume it's invalid, 0 score, no change to prompt
            sanitized_prompt = input_for_this_scanner 
            is_valid = False
            risk_score = 1.0 # Max risk for scanner failure
            # Optionally add error details to the result
            applied_scanners_results.append(
                SingleScannerResult(
                    scanner_name=scanner_name,
                    input_prompt=input_for_this_scanner, 
                    sanitized_prompt=sanitized_prompt,
                    is_valid=is_valid,
                    risk_score=risk_score,
                    details={"error": str(e)} 
                )
            )
            current_prompt_state = sanitized_prompt
            overall_is_valid = False
            continue # Move to the next scanner or finish
        
        applied_scanners_results.append(
            SingleScannerResult(
                scanner_name=scanner_name,
                input_prompt=input_for_this_scanner, 
                sanitized_prompt=sanitized_prompt,
                is_valid=is_valid,
                risk_score=risk_score
            )
        )
        
        current_prompt_state = sanitized_prompt # Output of one becomes input to next
        if not is_valid:
            overall_is_valid = False
            # Optional: decide if we should stop processing further scanners if one fails decisively
            # For now, we'll run all selected scanners to get all findings, but overall_is_valid will reflect any failure.

    return ComprehensiveScanResponse(
        original_prompt=original_prompt,
        final_sanitized_prompt=current_prompt_state,
        overall_is_valid=overall_is_valid,
        applied_scanners_results=applied_scanners_results,
    )

@app.post("/scan/anonymize", response_model=ScanResponse)
async def scan_anonymize_prompt_individual(request: ScanRequest):
    """
    Scans a prompt using the Anonymize scanner to remove PII.
    """
    sanitized_prompt, is_valid, risk_score = anonymizer_global.scan(request.prompt)
    
    return ScanResponse(
        sanitized_prompt=sanitized_prompt,
        is_valid=is_valid,
        risk_score=risk_score # llm-guard scanners return a risk score (float)
    )

@app.post("/scan/secrets", response_model=ScanResponse)
async def scan_secrets_prompt_individual(request: ScanRequest):
    """
    Scans a prompt using the Secrets scanner.
    """
    sanitized_prompt, is_valid, risk_score = secrets_scanner_global.scan(request.prompt)
    return ScanResponse(
        sanitized_prompt=sanitized_prompt, # Secrets scanner might not change the prompt by default
        is_valid=is_valid,
        risk_score=risk_score
    )

@app.post("/scan/toxicity", response_model=ScanResponse)
async def scan_toxicity_prompt_individual(request: ScanRequest):
    """
    Scans a prompt using the Toxicity scanner.
    """
    sanitized_prompt, is_valid, risk_score = toxicity_scanner_global.scan(request.prompt)
    return ScanResponse(
        sanitized_prompt=sanitized_prompt, # Toxicity scanner doesn't change the prompt
        is_valid=is_valid,
        risk_score=risk_score
    )

@app.post("/scan/bansubstrings", response_model=ScanResponse)
async def scan_ban_substrings_prompt_individual(request: ScanRequest):
    """
    Scans a prompt using the BanSubstrings scanner.
    """
    sanitized_prompt, is_valid, risk_score = ban_substrings_scanner_global.scan(request.prompt)
    return ScanResponse(sanitized_prompt=sanitized_prompt, is_valid=is_valid, risk_score=risk_score)

@app.post("/scan/regex", response_model=ScanResponse)
async def scan_regex_prompt_individual(request: ScanRequest):
    """
    Scans a prompt using the Regex scanner for custom patterns.
    """
    sanitized_prompt, is_valid, risk_score = regex_scanner_global.scan(request.prompt)
    return ScanResponse(sanitized_prompt=sanitized_prompt, is_valid=is_valid, risk_score=risk_score)

@app.post("/scan/code", response_model=ScanResponse)
async def scan_code_prompt_individual(request: ScanRequest):
    """
    Scans a prompt using the Code scanner to detect source code.
    """
    sanitized_prompt, is_valid, risk_score = code_scanner_global.scan(request.prompt)
    return ScanResponse(
        sanitized_prompt=sanitized_prompt, # Prompt is usually unchanged unless it's ALL code and fails a threshold
        is_valid=is_valid, 
        risk_score=risk_score
    )

if __name__ == "__main__":
    import uvicorn
    # Running on 0.0.0.0 makes it accessible from the Next.js app
    # if it's running in a container or different network interface.
    # Port 8000 is a common default for dev servers.
    uvicorn.run(app, host="0.0.0.0", port=8000) 