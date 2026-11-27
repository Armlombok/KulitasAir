# WaterWatch UNRAM Dashboard

Dashboard statis untuk GitHub Pages. Dashboard menampilkan nilai sensor terbaru,
grafik pH/turbiditas/DO/EC, tabel seluruh kolom Google Sheets, filter tanggal,
unduhan CSV, dan formulir koefisien kalibrasi.

## Menyiapkan Apps Script

1. Buka proyek Google Apps Script yang terhubung ke spreadsheet Anda.
2. Ganti isi file Apps Script dengan `../google_apps_script_water_quality.gs`.
3. Jalankan `setupSpreadsheet()` sekali bila sheet belum disiapkan.
4. Deploy ulang sebagai **Web app**. Pilih **New deployment** atau **Manage
   deployments > Edit > New version**, lalu salin URL yang berakhiran `/exec`.
5. Pastikan akses deployment mengizinkan ESP32 dan dashboard membukanya.
6. Bila URL berubah, ubah `scriptUrl` pada `config.js`.

Endpoint tambahan dashboard adalah `?action=data` (data bertahap) dan
`?action=calibration` (koefisien terkini). Form dashboard mengirim POST
`action=setCalibration`; Apps Script menyimpan koefisien kemudian menetapkan
status `UPDATE`, yang akan diambil ESP32 dalam maksimal 30 detik.

## Mengamankan form kalibrasi (disarankan)

Pada Apps Script, buka **Project Settings > Script properties**, tambahkan
`DASHBOARD_WRITE_TOKEN` dengan token rahasia. Ketik token itu pada kolom
**Token tulis** di dashboard sebelum menyimpan kalibrasi. Tanpa properti ini,
siapa pun yang mengetahui URL Web App dapat meminta pembaruan kalibrasi.

## Menerbitkan pada GitHub Pages

Unggah **isi** folder `dashboard` ke repository GitHub khusus dashboard,
atau arahkan GitHub Pages ke folder tersebut bila berada dalam repository yang
sama. Di GitHub, buka **Settings > Pages**, pilih sumber branch yang berisi
`index.html`, lalu simpan. Tidak ada proses build atau server yang diperlukan.

Logo pada `assets/unram-logo.png` berasal dari paket aset di Unram Brand Center.
