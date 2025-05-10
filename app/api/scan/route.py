# Python route that was attempted but had compatibility issues with Next.js
from typing import Dict, Any
import json
from llm_guard import Guard
from llm_guard.input_scanners import (
    Anonymize,
    Secrets,
    Toxicity,
    BanSubstrings,
    Code,
    Regex
)
from http import HTTPStatus
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Initialize scanners once
guard = Guard()
anonymizer = Anonymize(use_onnx=True)
secrets_scanner = Secrets()
toxicity_scanner = Toxicity(use_onnx=True)
ban_substrings_scanner = BanSubstrings(substrings=["Project Chimera", "Q4_Roadmap_Internal_Draft"])
regex_scanner = Regex(patterns=[r"INTDOC-\d{6}-[A-Z]{3}"])
code_scanner = Code()

def POST(request):
    try:
        body = request.json()
        prompt = body.get('prompt')
        scanners = body.get('scanners', ['anonymize'])
        
        if not prompt:
            return {
                'status': 400,
                'body': {'error': 'Prompt is required'}
            }

        current_prompt = prompt
        overall_is_valid = True
        applied_scanners_results = []

        # Process each scanner in order
        for scanner_name in scanners:
            scanner_result = {
                'scanner_name': scanner_name,
                'input_prompt': current_prompt,
                'sanitized_prompt': current_prompt,
                'is_valid': True,
                'risk_score': 0.0,
                'details': {}
            }

            try:
                if scanner_name == 'anonymize':
                    sanitized, is_valid, risk_score = anonymizer.scan(current_prompt)
                elif scanner_name == 'secrets':
                    sanitized, is_valid, risk_score = secrets_scanner.scan(current_prompt)
                elif scanner_name == 'toxicity':
                    sanitized, is_valid, risk_score = toxicity_scanner.scan(current_prompt)
                elif scanner_name == 'bansubstrings':
                    sanitized, is_valid, risk_score = ban_substrings_scanner.scan(current_prompt)
                elif scanner_name == 'regex':
                    sanitized, is_valid, risk_score = regex_scanner.scan(current_prompt)
                elif scanner_name == 'code':
                    sanitized, is_valid, risk_score = code_scanner.scan(current_prompt)
                else:
                    continue

                scanner_result.update({
                    'sanitized_prompt': sanitized,
                    'is_valid': is_valid,
                    'risk_score': float(risk_score)
                })
                current_prompt = sanitized
                if not is_valid:
                    overall_is_valid = False

            except Exception as e:
                scanner_result.update({
                    'is_valid': False,
                    'risk_score': 1.0,
                    'details': {'error': str(e)}
                })
                overall_is_valid = False

            applied_scanners_results.append(scanner_result)

        response = {
            'original_prompt': prompt,
            'final_sanitized_prompt': current_prompt,
            'overall_is_valid': overall_is_valid,
            'applied_scanners_results': applied_scanners_results
        }
        
        return {
            'status': 200,
            'body': response
        }
    except Exception as e:
        return {
            'status': 500,
            'body': {'error': str(e)}
        }

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

# Example of how to test this locally (not for Vercel deployment itself)
# if __name__ == '__main__':
#     from http.server import HTTPServer
#     server = HTTPServer(('localhost', 8000), handler)
#     print('Starting server on http://localhost:8000')
#     server.serve_forever() 