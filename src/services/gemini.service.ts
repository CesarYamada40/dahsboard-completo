
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { GeminiAnalysis } from '../models';

@Injectable({
  providedIn: 'root',
})
export class GeminiService {
  private http = inject(HttpClient);
  private readonly proxyUrl = '/api/gemini'; // Backend proxy endpoint

  async analyzeCode(
    code: string,
    userQuery: string,
    rules: string
  ): Promise<GeminiAnalysis> {
    if (!code || !userQuery || !rules) {
      return Promise.reject(new Error('Code, user query, and rules must be provided.'));
    }

    const prompt = `
      You are an expert AI Governance agent for a Bybit crypto trading bot. Your purpose is to analyze code changes and ensure they adhere to a strict set of immutable operational rules.

      Here are the immutable rules (Source of Truth):
      ---
      ${rules}
      ---

      Here is a code snippet that has been proposed by another AI agent:
      ---
      ${code}
      ---

      Analyze the provided code snippet based on the following user request:
      ---
      ${userQuery}
      ---

      Your analysis MUST be structured in a valid JSON format with the following keys: "overallAssessment", "ruleComplianceCheck", "detailedAnalysis", "suggestedCorrection", "costOptimization".

      - "overallAssessment": A brief summary of whether the code is compliant, has warnings, or is in violation.
      - "ruleComplianceCheck": An array of objects, each with "rule" (string), "compliant" (boolean), and "details" (string).
      - "detailedAnalysis": A point-by-point explanation of any potential issues, violations, or improvements, referencing specific lines of code. Use markdown for formatting.
      - "suggestedCorrection": (Optional) If violations are found, provide a corrected version of the code snippet that is fully compliant with the rules. Provide only the code block.
      - "costOptimization": (Optional) Suggest ways to make the code more efficient in terms of API calls or token usage.
    `;

    try {
      // The backend proxy is expected to return the JSON structure from Gemini
      const response = await firstValueFrom(
        this.http.post<{ text: string }>(this.proxyUrl, { prompt }).pipe(
          timeout(60000), // 60 second timeout
          catchError((error: HttpErrorResponse) => {
            console.error('Gemini proxy error:', error);
            const errorMessage = error.error?.error || error.message || 'Unknown proxy error';
            return throwError(() => new Error(`Proxy Error: ${errorMessage}`));
          })
        )
      );

      // The backend proxy wraps the response in a "text" field.
      // We need to parse this text field as JSON.
      try {
        // Clean the string before parsing
        let jsonString = response.text.trim();
        if(jsonString.startsWith('```json')) {
          jsonString = jsonString.substring(7);
        }
        if(jsonString.endsWith('```')) {
          jsonString = jsonString.slice(0, -3);
        }
        return JSON.parse(jsonString) as GeminiAnalysis;
      } catch (parseError) {
         console.error('Failed to parse Gemini response:', parseError);
         console.error('Raw Gemini response:', response.text);
         return Promise.reject(new Error('Failed to parse analysis from AI. The response was not valid JSON.'));
      }

    } catch (error) {
      return Promise.reject(error);
    }
  }
}
