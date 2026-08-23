# OMEN Fan Control

**HP OMEN dizüstü bilgisayarlar** için açık kaynaklı fan kontrol uygulaması. Özel sıcaklık eğrileri, manuel hız, güç modları — İngilizce ve Türkçe koyu temalı kompakt bir masaüstü arayüzüyle.

> HP ile bağlantılı değildir. Kullanım riski size aittir.

## Özellikler

- Gerçek zamanlı CPU / GPU sıcaklık takibi
- Fan devri (RPM) görüntüleme (CPU & GPU fanları)
- Fan modları: Otomatik / Maksimum / Manuel / Özel eğri
- Canlı grafikle düzenlenebilir sıcaklık → hız eğrileri
- HP WMI üzerinden güç modları (Varsayılan / Performans / Serin)
- Donanımı korumak için güvenli maksimum RPM sınırı
- Hızlı işlemlerle sistem tepsisi, otomatik başlatma desteği
- Türkçe & İngilizce arayüz
- Yerleşik işlem günlüğü konsolu

## Gereksinimler

| Gereksinim | Notlar |
|---|---|
| Windows 10 / 11 (64-bit) | |
| HP OMEN dizüstü | BIOS tarafından sunulan HP `hpqBIntM` WMI arayüzünü kullanır. Diğer cihazlarda uygulama açılır ama fanlar okunamaz/yönetilemez. |
| Yönetici hakları | Her açılışta gerekli (Windows UAC onayı) — fan/EC erişimi ayrıcalıklıdır. |
| NVIDIA sürücüsü | İsteğe bağlı — yalnızca GPU sıcaklığı için. |

## Kurulum (hazır kurulum paketi)

1. [Releases](../../releases) sayfasından `OMEN Fan Control Setup x.x.x.exe` dosyasını indirin.
2. Uygulama imzasız olduğu için SmartScreen uyarısı çıkabilir: **Daha fazla bilgi → Yine de çalıştır** tıklayın.
3. UAC onayı verin ve kurulum sihirbazını tamamlayın.
4. Başlat Menüsü veya masaüstü kısayolundan açın ve UAC'yi bir kez daha onaylayın.

Uygulama makine genelinde kurulur (`C:\Program Files\OMEN Fan Control`). Otomatik başlatma, Görev Zamanlayıcı üzerinden yükseltilmiş yetkiyle yönetilir (girişte UAC çıkmaz).

## Kaynak koddan derleme

Gereksinimler:
- [Node.js](https://nodejs.org) 18+
- Python 3 + `pip`
- Windows 10/11

```bat
:: 1. Python backend'i derle (tek dosya exe)
pip install pyinstaller
cd backend
pyinstaller tcp_server.spec
copy dist\tcp_server.exe tcp_server.exe
cd ..

:: 2. Bağımlılıkları kur ve kurulum paketini oluştur
npm install
npm run dist
```

Çıktı `../release/installer` klasörüne NSIS kurulum paketi + taşınabilir `win-unpacked` klasörü olarak düşer.

### Nasıl çalışır

```
Electron arayüzü (renderer.js)
   │  JSON satırları üzerinden TCP 127.0.0.1:9292
   ▼
Python backend (tcp_server.py + fan_control.py)
   │  PowerShell / WMI (root\wmi, hpqBIntM)
   ▼
HP firmware EC (fan RPM, fan modları, termal politika)
   ▲
nvidia-smi ──── GPU sıcaklığı
```

Backend her 100 ms'de durum yayını yapar (sıcaklık, RPM) ve arayüzün komutlarını uygular (`set_fan_mode`, `set_curve`, `set_power_mode`, …). Seçilen modu sürekli yeniden uygulayan bir döngü vardır; böylece BIOS/OGH müdahalesi geçersiz kalır.

## Proje yapısı

```
├── main.js            Electron ana süreç (pencere, tepsi, backend yaşam döngüsü)
├── renderer.js        Arayüz mantığı, i18n, TCP istemcisi
├── index.html         Tek sayfa arayüz
├── styles.css
├── package.json       electron-builder yapılandırması
├── backend/
│   ├── tcp_server.py      TCP sunucu + komut yönlendirici
│   ├── fan_control.py     HP WMI bağları, modlar, eğriler
│   ├── system_info.py     Sıcaklık yoklaması
│   └── tcp_server.spec    PyInstaller yapılandırması
└── build/             Uygulama ikonları
```

## Sorun giderme

- **"Bağlantı yok" / fan verisi gelmiyor** — uygulamayı yönetici olarak açtığınızdan ve cihazınızın `hpqBIntM` sunan bir OMEN modeli olduğundan emin olun. Test: yükseltilmiş PowerShell'de `Get-CimInstance -Namespace root\wmi -ClassName hpqBIntM`.
- **GPU sıcaklığı 0** — NVIDIA sürücüsü kurulu değil veya `nvidia-smi` PATH'te değil.
- **9292 portu kullanımda** — başka bir backend örneği çalışıyor demektir; Görev Yöneticisi'nden `tcp_server.exe` kapatın.

## Destek

- [GitHub Issues](../../issues) üzerinden konu açın — tercih edilen yol, diğer kullanıcılara da yardımcı olur
- Veya e-posta: **klashain0@gmail.com**

## Lisans

[MIT](LICENSE) © klashain
