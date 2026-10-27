<p align="center">
  <img src="build/icon_256.png" width="110" alt="OMEN Fan Control ikonu">
</p>

<h1 align="center">OMEN Fan Control</h1>

<p align="center">
  <b>Windows'ta HP OMEN dizüstü bilgisayarlar için hafif, açık kaynaklı fan kontrolü.</b><br>
  Özel fan eğrileri · manuel hız · güç modları · canlı sıcaklık ve RPM — OMEN Gaming Hub'ın fan ayarlarına küçük bir alternatif.
</p>

<p align="center">
  <a href="https://github.com/klashain/HP_Fan_Control/releases/latest"><img src="https://img.shields.io/github/v/release/klashain/HP_Fan_Control?label=indir&color=2ea44f" alt="Son sürüm"></a>
  <img src="https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D6?logo=windows&logoColor=white" alt="Windows 10 | 11">
  <img src="https://img.shields.io/badge/Electron-%2B%20Python-47848F?logo=electron&logoColor=white" alt="Electron + Python">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/klashain/HP_Fan_Control" alt="MIT lisansı"></a>
</p>

<p align="center">
  <a href="README.md">English</a> · <b>Türkçe</b>
</p>

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
| HP OMEN dizüstü | BIOS tarafından sunulan HP `hpqBIntM` WMI arayüzünü kullanır. **HP Victus** ve Pavilion Gaming modelleri aynı arayüzü paylaşır ve *kısmen veya tamamen* çalışabilir — test edilmedi, komut ID'leri nesillere göre farklılık gösterebilir. Diğer cihazlarda uygulama açılır ama fanlar okunamaz/yönetilemez. Cihazınızı test edin: yükseltilmiş PowerShell'de `Get-CimInstance -Namespace root\wmi -ClassName hpqBIntM`. |
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

## Katkıda bulunma

Hata bildirimleri, model uyumluluk raporları ve pull request'ler memnuniyetle karşılanır.
**HP Victus / Pavilion Gaming** ya da listede olmayan bir OMEN modeliniz varsa, model adınız ve yukarıdaki `hpqBIntM` test komutunun çıktısıyla bir issue açın — cihaz desteğini büyütmenin en hızlı yolu bu.

Araç işinize yaradıysa repoya bir ⭐ bırakmanız, diğer OMEN kullanıcılarının onu bulmasına yardım eder.

## Lisans

[MIT](LICENSE) © klashain
