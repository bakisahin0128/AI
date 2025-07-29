/* ==========================================================================
   DOSYA 5: src/core/utils.ts (GÜNCELLENMİŞ DOSYA)
   
   SORUMLULUK: Proje genelinde kullanılacak yardımcı fonksiyonları barındırır.
   ========================================================================== */

// ... cleanLLMCodeBlock ve cleanLLMJsonBlock fonksiyonları burada kalacak ...

export function cleanLLMCodeBlock(rawResponse: string): string {
    const cleaned = rawResponse.replace(/^```(?:\w+)?\s*\n|```\s*$/g, '');
    return cleaned.trim();
}

export function cleanLLMJsonBlock(rawResponse: string): string {
    const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/);
    const potentialJson = jsonMatch ? jsonMatch[1] : rawResponse;
    return potentialJson.trim();
}

// YENİ EKLENEN FONKSİYONLAR
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}