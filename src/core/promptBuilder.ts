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

Şimdi, bu iki versiyon arasındaki değişiklikleri yukarıdaki örnek formata birebir uyarak, GİRİŞ CÜMLEMESİ OLMADAN açıkla.
`;
}

/**
 * Dosya bazlı etkileşimler için niyet analizi yapar.
 */
export function createFileInteractionAnalysisPrompt(files: Array<{ fileName:string, content:string }>, instruction: string): string {
    const fileContents = files.map(file => `
--- DOSYA ADI: "${file.fileName}" ---
${file.content}
---
`).join('\n\n');

    return `
Sen, birincil görevi kullanıcının talebini yerine getirmek olan bir yazılım asistanısın.

GÖREVİN:
Kullanıcının talimatını ve verilen dosya(lar)ı analiz ederek aşağıdaki iki niyetten birini seç ve cevabını MUTLAKA JSON formatında oluştur:

1.  **Niyet: "answer"**
    - **Koşul:** Eğer kullanıcı bir soru soruyor, açıklama istiyor, hata bulmasını istiyor veya kod hakkında bir fikir talep ediyorsa bu niyeti seç.
    - **JSON Çıktısı:**
      {
        "intent": "answer",
        "explanation": "[KULLANICININ SORUSUNA DOĞRUDAN VE TAM CEVAP BURAYA GELECEK. Cevabını Markdown formatında, GEREKTİĞİNDE maddeler ve kod blokları kullanarak detaylı bir şekilde oluştur.]"
      }

2.  **Niyet: "modify"**
    - **Koşul:** Eğer kullanıcı AÇIKÇA kodun değiştirilmesini, yeniden yazılmasını, bir şey eklenmesini/silinmesini veya refactor edilmesini istiyorsa bu niyeti seç.
    - **JSON Çıktısı:**
      {
        "intent": "modify",
        "fileName": "[DEĞİŞTİRİLECEK TEK BİR DOSYANIN ADI]",
        "explanation": "[YAPILACAK DEĞİŞİKLİĞİ TEK CÜMLEDE ÖZETLE]"
      }

SAKIN UNUTMA:
- Cevabın SADECE ve SADECE JSON içermelidir. Başka hiçbir metin ekleme.
- Eğer birden fazla dosya varsa ve kullanıcı bir değişiklik istiyorsa, talimata en uygun TEK bir dosyayı seç.

KULLANICI TALİMATI: "${instruction}"

DOSYA(LAR):
${fileContents}
`;
}

/**
 * Seçili kod bazlı etkileşimler için niyet analizi yapar.
 */
export function createSelectionInteractionAnalysisPrompt(selectedCode: string, instruction: string): string {
    return `
Sen, birincil görevi kullanıcının talebini yerine getirmek olan bir yazılım asistanısın.

GÖREVİN:
Kullanıcının talimatını ve verilen seçili kodu analiz ederek aşağıdaki iki niyetten birini seç ve cevabını MUTLAKA JSON formatında oluştur:

1.  **Niyet: "answer"**
    - **Koşul:** Eğer kullanıcı seçili kod hakkında bir soru soruyor, açıklama istiyor veya hata bulmasını istiyorsa bu niyeti seç.
    - **JSON Çıktısı:**
      {
        "intent": "answer",
        "explanation": "[SEÇİLİ KOD HAKKINDAKİ SORUYA DOĞRUDAN VE TAM CEVAP BURAYA GELECEK. Cevabını Markdown formatında, GEREKTİĞİNDE maddeler ve kod blokları kullanarak detaylı bir şekilde oluştur.]"
      }

2.  **Niyet: "modify"**
    - **Koşul:** Eğer kullanıcı AÇIKÇA seçili kodun değiştirilmesini, yeniden yazılmasını veya refactor edilmesini istiyorsa bu niyeti seç.
    - **JSON Çıktısı:**
      {
        "intent": "modify",
        "explanation": "[YAPILACAK DEĞİŞİKLİĞİ TEK CÜMLEDE ÖZETLE]"
      }

SAKIN UNUTMA:
- Cevabın SADECE ve SADECE JSON içermelidir. Başka hiçbir metin ekleme.

KULLANICI TALİMATI: "${instruction}"

SEÇİLİ KOD:
---
${selectedCode}
---
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