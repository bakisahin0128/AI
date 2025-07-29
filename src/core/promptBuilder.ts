/**
 * Creates a prompt to fix a specific error in a given code block.
 *
 * @param errorMessage The error message identified.
 * @param lineNumber The line number where the error occurred.
 * @param fullCode The complete source code to be analyzed and fixed.
 * @returns A formatted string to be used as a prompt for the language model.
 */
export function createFixErrorPrompt(errorMessage: string, lineNumber: number, fullCode: string): string {
    return `Aşağıdaki Python kodunda belirtilen hatayı düzelt. Sadece ve sadece, başka hiçbir açıklama veya yorum eklemeden, düzeltilmiş Python kodunun tamamını yanıt olarak ver.

HATA BİLGİSİ:
- Hata Mesajı: "${errorMessage}"
- Satır Numarası: ${lineNumber}

DÜZELTİLECEK KODUN TAMAMI:
---
${fullCode}
---`;
}


/**
 * Creates a prompt to modify a selected block of code based on a given instruction.
 *
 * @param instruction The user's instruction detailing the desired modification.
 * @param codeToModify The specific code snippet that needs to be changed.
 * @returns A formatted string to be used as a prompt for the language model.
 */
export function createModificationPrompt(instruction: string, codeToModify: string): string {
    return `Sen bir uzman Python geliştiricisisin. Aşağıdaki Python kodunu verilen talimata göre değiştir. Sadece ve sadece, başka hiçbir açıklama veya yorum eklemeden, istenen değişikliği yapılmış yeni kodu yanıt olarak ver.

TALİMAT: "${instruction}"

DEĞİŞTİRİLECEK KOD:
---
${codeToModify}
---`;
}

/**
 * DEĞİŞİKLİK: Fonksiyon artık tek bir dosya yerine bir dosya dizisi alıyor.
 * Creates a structured prompt for analyzing or modifying an entire file's content.
 * The prompt instructs the model to determine the user's intent ('answer' or 'modify')
 * and return a JSON object containing the result.
 *
 * @param files The array of files to be processed.
 * @param instruction The user's high-level instruction for the file.
 * @returns A detailed, structured prompt for the language model to generate a JSON response.
 */
export function createFileInteractionPrompt(files: Array<{ fileName: string, content: string }>, instruction: string): string {
    // YENİ: Birden fazla dosyanın içeriğini tek bir string'de birleştiriyoruz.
    const fileContents = files.map(file => `
---
DOSYA ADI: "${file.fileName}"
İÇERİK:
${file.content}
---
`).join('\n\n');

    return `
Sen bir uzman yazılım geliştirme asistanısın. Kullanıcının talimatını ve sağlanan dosya içeriklerini analiz et. Birden fazla dosya sağlandı.

GÖREVİN:
1.  Önce kullanıcının niyetini belirle:
    - Eğer kullanıcı soru soruyor, açıklama istiyor, karşılaştırma yapıyor veya bir şeyi bulmasını istiyorsa (örn: "bu nedir?", "hatayı bul", "özetle"), niyet 'answer' olmalıdır.
    - Eğer kullanıcı açıkça BİR VEYA DAHA FAZLA dosyayı değiştirmeyi, düzeltmeyi, ekleme yapmayı veya yeniden düzenlemeyi istiyorsa, niyet 'modify' olmalıdır.

2.  Cevabını MUTLAKA aşağıdaki JSON formatında oluştur. Başka hiçbir metin ekleme.
    
    \`\`\`json
    {
      "intent": "answer" | "modify",
      "explanation": "Kullanıcıya gösterilecek detaylı ve Markdown formatında açıklama metni. Cevabını veya yaptığın değişikliği burada anlat. Eğer değişiklik yaptıysan, HANGİ DOSYAYI DEĞİŞTİRDİĞİNİ bu açıklamada belirt.",
      "fileName": "Eğer niyet 'modify' ise, DEĞİŞİKLİK YAPILAN dosyanın adını buraya yaz. Eğer niyet 'answer' ise bu alanı boş bir string olarak bırak (\\\"\\\").",
      "modifiedCode": "Eğer niyet 'modify' ise, DEĞİŞTİRDİĞİN dosyanın baştan sona değiştirilmiş tam içeriğini buraya yaz. Sadece tek bir dosyanın içeriğini döndür. Eğer niyet 'answer' ise bu alanı boş bir string olarak bırak (\\\"\\\")."
    }
    \`\`\`

KULLANICI BİLGİLERİ:
- Kullanıcı Talimatı: "${instruction}"

DOSYALARIN MEVCUT İÇERİĞİ:
${fileContents}
`;
}