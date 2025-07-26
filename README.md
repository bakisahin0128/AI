# Baykar AI Fixer

Baykar AI Fixer, kodlama süreçlerinizi hızlandırmak ve verimliliğinizi artırmak için tasarlanmış, Baykar'ın yapay zeka altyapısıyla güçlendirilmiş akıllı bir Visual Studio Code eklentisidir. Sadece hataları düzeltmekle kalmaz, aynı zamanda kodunuzu analiz eder, düzenler ve sizinle sohbet ederek geliştirme süreçlerinize aktif olarak katılır.


---

## ✨ Temel Özellikler

- ✈️ **Entegre AI Sohbet Paneli**  
  VS Code içinden ayrılmadan yapay zeka ile sohbet edin. Kod analizi, yeni fikirler veya genel programlama soruları için kullanın.

- 📄 **Dosya Bazlı Etkileşim**  
  Bir kod dosyasını sohbete ekleyerek dosyanın tamamı hakkında sorular sorun, analiz isteyin veya dosyanın tümünü yeniden düzenlettirin.

- ✍️ **Akıllı Kod Değiştirme**  
  Editörde seçtiğiniz bir kod bloğunu, “AI Sohbete Gönder” özelliği ile direkt olarak chat paneline gönderin ve verdiğiniz talimatlarla kodun anında güncellenmesini sağlayın.

- 💡 **Hızlı Hata Düzeltme (Quick Fix)**  
  Kodunuzdaki diagnostic hatalarının üzerine gelerek veya ampul simgesine tıklayarak tek tuşla otomatik düzeltme önerileri alın.

- 🔄 **Refactoring ve Kod Düzenleme**  
  Seçili kod bloklarına sağ tıklayarak dokümantasyon ekleme, yeniden yapılandırma, try-catch blokları ekleme gibi işlemleri kolayca yapın.

- 🔐 **Güvenli API Anahtarı Yönetimi**  
  Baykar API anahtarınız, VS Code'un SecretStorage altyapısı kullanılarak güvenli bir şekilde saklanır.

---

## 🛠️ Kullanım

Öncelikle Komut Paleti (`Ctrl+Shift+P`) üzerinden **Baykar AI: API Anahtarını Ayarla** komutuyla Baykar API anahtarınızı kaydedin.

### 1. AI Sohbet Paneli

- **Genel Sohbet**  
  Sol taraftaki Activity Bar'da Baykar AI Chat simgesine tıklayın ve programlama sorularınızı Markdown formatında sorarak zengin cevaplar alın.

- **Dosya Bazlı Analiz ve Değişiklik**  
  1. Sohbet panelindeki ataş (📎) simgesine tıklayın.  
  2. İncelemek veya düzenlemek istediğiniz dosyayı seçin.  
  3. Dosya yüklendikten sonra talimatınızı girin.  
     - Örnek (Analiz):  
       > “Bu Python scriptindeki potansiyel hataları ve performans darboğazlarını açıkla.”  
     - Örnek (Değişiklik):  
       > “Tüm fonksiyonlara PEP 484 standardında type hint ekle ve kodu Black formatına göre düzenle.”

### 2. Seçili Kod Üzerinde Sohbet (Önerilen)

1. Editörde değiştirmek istediğiniz kod bloğunu seçin.  
2. Sağ tıklayıp **✈️ AI Sohbete Gönder** seçeneğine tıklayın veya `Ctrl+Alt+A` (Mac: `Cmd+Alt+A`) kullanın.  
3. Sohbet panelinde “Talimatınız seçili koda uygulanacaktır…” mesajını görün.  
4. Talimatınızı yazın (örneğin: “Bu kodu `try-except` bloğu içine al ve `ValueError` hatalarını yakala.”).  
5. AI, sadece seçili bölümü güncelleyerek yeni kodu editöre yazar.

### 3. Hızlı Hata Düzeltme (Quick Fix)

1. Kodunuzda altı kırmızı ile çizili bir hata gördüğünüzde üzerine gelin.  
2. Açılan hover penceresindeki **✈️ Baykar AI ile Düzelt** linkine tıklayın.  
3. Alternatif olarak ampul (💡) simgesine tıklayıp **✈️ Baykar AI ile Düzelt** seçeneğini seçin.  
4. AI, dosyanın tamamını analiz edip düzeltilmiş içeriğiyle değiştirecektir.

### 4. Kod Bloklarını Değiştirme (Refactor)

1. Düzenlemek istediğiniz kod bloğunu seçin.  
2. Sağ tıklayıp **✈️ Baykar AI ile Değiştir…** seçeneğini seçin.  
3. Üstte beliren giriş kutusuna yapmak istediğiniz değişikliği yazın.  
   - Örnek: “Bu fonksiyona bir docstring ekle.”  
4. AI, sadece seçili alanı talimatınıza göre düzenleyerek günceller.

---

## ⌨️ Komutlar ve Kısayollar

| Komut                             | Açıklama                                     | Kısayol                  |
|-----------------------------------|----------------------------------------------|--------------------------|
| Baykar AI: API Anahtarını Ayarla  | Baykar API anahtarını kaydeder.             | —                        |
| Baykar AI Sohbetini Göster        | Baykar AI sohbet panelini açar/odaklar.      | —                        |
| ✈️ AI Sohbete Gönder               | Seçili kodu analiz için sohbet paneline gönderir. | `Ctrl+Alt+A` / `Cmd+Alt+A` |
| Baykar AI: Düzeltmeyi Uygula      | Hızlı düzeltme (Quick Fix) aksiyonunu tetikler. | (Menüden)                |
| Baykar AI: Seçili Kodu Değiştir   | Seçili kodu verilen talimata göre değiştirir.  | (Menüden)                |

---

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen pull request göndermekten veya issue açmaktan çekinmeyin.  
