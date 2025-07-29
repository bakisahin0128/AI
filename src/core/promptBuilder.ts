/**
 * LLM'e, verilen bir kod parçasını (veya dosyanın tamamını) bir talimata göre
 * değiştirmesini ve SADECE değiştirilmiş kodu döndürmesini söyler.
 */
export function createModificationPrompt(instruction: string, codeToModify: string): string {
    return `Sen bir uzman yazılım geliştirme asistanısın. Aşağıdaki "DEĞİŞTİRİLECEK KOD"u, verilen "TALİMAT"a göre değiştir.

TALİMAT: "${instruction}"

DEĞİŞTİRİLECEK KOD:
---
${codeToModify}
---

ÇOK ÖNEMLİ KURAL: Yanıt olarak SADECE VE SADECE, başka hiçbir açıklama, yorum veya markdown formatı eklemeden, değiştirilmiş kodun tamamını ver.
`;
}

/**
 * LLM'e, bir kodun orijinal ve değiştirilmiş halini vererek, bu iki versiyon
 * arasındaki farkları AÇIKÇA VE GEREKSİZ GİRİŞ CÜMLELERİ OLMADAN açıklamasını ister.
 */
export function createExplanationPrompt(originalCode: string, modifiedCode: string): string {
    return `Sen bir uzman yazılım geliştirme asistanısın. Aşağıda bir kodun "ÖNCEKİ HALİ" ile "YENİ HALİ" verilmiştir.

GÖREVİN: Yapılan değişiklikleri, doğrudan madde madde Markdown formatında listelemektir. Herhangi bir giriş veya sonuç cümlesi KURMA. Sadece değişiklikleri listele.

ÖRNEK ÇIKTI FORMATI:
* \`degisken_adi\` güncellenerek daha anlaşılır hale getirildi.
* Gereksiz döngü kaldırılarak performans iyileştirmesi yapıldı.
* Hata yakalama için \`try-except\` bloğu eklendi.

ÖNCEKİ HALİ:
---
${originalCode}
---

YENİ HALİ:
---
${modifiedCode}
---

Şimdi, bu iki versiyon arasındaki değişiklikleri yukarıdaki örnek formata birebir uyarak, GİRİŞ CÜMLESİ OLMADAN açıkla.
`;
}


/**
 * GÜNCELLENMİŞ NİYET ANALİZİ PROMPT'U
 * LLM'den, kullanıcının niyetini ('answer' veya 'modify') belirlemesini,
 * bir açıklama üretmesini ve gerekirse hedef dosya adını vermesini ister.
 */
export function createFileInteractionAnalysisPrompt(files: Array<{ fileName: string, content: string }>, instruction: string): string {
    const fileContents = files.map(file => `
---
DOSYA ADI: "${file.fileName}"
İÇERİK:
${file.content}
---
`).join('\n\n');

    return `
Sen bir uzman yazılım geliştirme asistanısın. Kullanıcının talimatını ve sağlanan dosya içeriklerini analiz et.

GÖREVİN:
1.  Kullanıcının niyetini dikkatlice belirle:
    - Eğer kullanıcı AÇIKÇA "değiştir", "düzelt", "ekle", "sil", "yeniden yaz", "refactor et", "optimize et", "güncelle" gibi bir EYLEM belirten bir komut veriyorsa, niyet MUTLAKA 'modify' olmalıdır.
    - Diğer tüm durumlarda (örneğin: "bu kod ne yapar?", "hatayı bul", "özetle", "karşılaştır") niyet 'answer' olmalıdır.

2.  Cevabını MUTLAKA aşağıdaki özel formatta oluştur. Başka hiçbir metin ekleme.

FORMAT:
INTENT: [Buraya 'answer' veya 'modify' yaz]
FILENAME: [Eğer niyet 'modify' ise, değişiklik yapılacak dosyanın adını buraya yaz. 'answer' ise bu satırı boş bırak.]
EXPLANATION:
[Kullanıcının sorusuna Markdown formatında bir cevap veya yapılacak değişikliğin kısa bir özeti buraya gelecek.]

KULLANICI BİLGİLERİ:
- Kullanıcı Talimatı: "${instruction}"

DOSYALARIN MEVCUT İÇERİĞİ:
${fileContents}
`;
}

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