/**
 * Cleans Markdown code blocks (e.g., ```python ... ```) from a string
 * and returns only the pure code.
 * @param rawResponse The raw string response from the language model.
 * @returns The cleaned and trimmed code content.
 */
export function cleanLLMCodeBlock(rawResponse: string): string {
    // This regex finds and removes the code block start (with or without language)
    // and end fences.
    const cleaned = rawResponse.replace(/^```(?:\w+)?\s*\n|```\s*$/g, '');
    return cleaned.trim();
}

/**
 * Finds and extracts the content of a JSON Markdown block from a raw string,
 * preparing it for parsing.
 * @param rawResponse The raw string response from the language model.
 * @returns The cleaned JSON string content.
 */
export function cleanLLMJsonBlock(rawResponse: string): string {
    const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
    const potentialJson = jsonMatch ? jsonMatch[1] : rawResponse;
    return potentialJson.trim();
}
