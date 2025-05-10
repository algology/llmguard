from http.server import BaseHTTPRequestHandler
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

# Initialize scanners once
# These should be initialized outside the handler class if they are to be reused across invocations
# For simplicity in this example, placing them here. Consider memoization or global scope.
guard = Guard()
anonymizer = Anonymize(use_onnx=True)
secrets_scanner = Secrets()
toxicity_scanner = Toxicity(use_onnx=True)
ban_substrings_scanner = BanSubstrings(substrings=["Project Chimera", "Q4_Roadmap_Internal_Draft"])
regex_scanner = Regex(patterns=[r"INTDOC-\d{6}-[A-Z]{3}"])
code_scanner = Code()

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            body = json.loads(post_data.decode('utf-8'))

            prompt = body.get('prompt')
            # Defaulting to a sensible list of scanners if not provided or empty
            requested_scanners = body.get('scanners')
            if not requested_scanners: # Ensure there's always a default set of scanners
                requested_scanners = ['anonymize', 'toxicity', 'secrets']


            if not prompt:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Prompt is required'}).encode('utf-8'))
                return

            current_prompt = prompt
            overall_is_valid = True
            applied_scanners_results = []

            # Define a mapping from scanner names to scanner objects
            scanner_map = {
                'anonymize': anonymizer,
                'secrets': secrets_scanner,
                'toxicity': toxicity_scanner,
                'bansubstrings': ban_substrings_scanner,
                'regex': regex_scanner,
                # 'code': code_scanner # Add if 'code' scanner is intended to be available
            }

            for scanner_name in requested_scanners:
                scanner_instance = scanner_map.get(scanner_name.lower()) # Ensure case-insensitivity
                if not scanner_instance:
                    # Optionally, log or handle unknown scanner names
                    print(f"Unknown scanner requested: {scanner_name}")
                    continue

                scanner_result = {
                    'scanner_name': scanner_name,
                    'input_prompt': current_prompt,
                    'sanitized_prompt': current_prompt, # Default to input
                    'is_valid': True,
                    'risk_score': 0.0,
                    'details': {}
                }

                try:
                    # Directly use the instance's scan method
                    sanitized, is_valid, risk_score = scanner_instance.scan(current_prompt)
                    
                    scanner_result.update({
                        'sanitized_prompt': sanitized,
                        'is_valid': is_valid,
                        'risk_score': float(risk_score) # Ensure risk_score is float for JSON
                    })
                    current_prompt = sanitized # Update prompt for the next scanner
                    if not is_valid:
                        overall_is_valid = False
                
                except Exception as e:
                    print(f"Error during {scanner_name} scan: {str(e)}")
                    scanner_result.update({
                        'is_valid': False,
                        'risk_score': 1.0, # Max risk on error
                        'details': {'error': f"Error in {scanner_name} scanner: {str(e)}"}
                    })
                    overall_is_valid = False # Mark as invalid if any scanner errors

                applied_scanners_results.append(scanner_result)

            response_payload = {
                'original_prompt': prompt,
                'final_sanitized_prompt': current_prompt,
                'overall_is_valid': overall_is_valid,
                'applied_scanners_results': applied_scanners_results
            }
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))

        except json.JSONDecodeError:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Invalid JSON body'}).encode('utf-8'))
        except Exception as e:
            print(f"Unhandled server error: {str(e)}") # Log the full error server-side
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': f'Internal server error: {str(e)}'}).encode('utf-8'))

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