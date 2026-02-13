# AI Assistant Global Instructions

File ini berisi instruksi untuk semua AI coding assistant yang bekerja di project ini.

## Global Coding & Collaboration Standards

- **Ikuti pola yang sudah ada**
  - Hormati struktur folder, penamaan, dan arsitektur yang sudah dipakai project.
  - Jangan mengubah arsitektur besar kecuali user minta jelas.

- **Minimalkan dependency baru**
  - Utamakan pakai library dan pattern yang sudah ada di project.
  - Jika perlu library besar/baru, jelaskan singkat alasan dan konsekuensinya.

- **Error handling**
  - Jangan pernah diam-diam mengabaikan error (tidak ada catch kosong, tidak buang error tanpa log/penjelasan).
  - Pesan error harus membantu debug tapi tidak membocorkan rahasia (password, secret, path sensitif).

- **Keamanan dasar**
  - Selalu gunakan query terparameter (atau ORM) untuk akses database; hindari SQL injection.
  - Validasi input pada boundary (HTTP handler, controller, form) sebelum masuk ke business logic.

- **Testing & perubahan aman**
  - Jika project sudah punya test, pertahankan pola test yang sama.
  - Untuk perubahan signifikan pada logic, usahakan ada minimal satu test yang melindungi behavior utama.

- **Bahasa & gaya penjelasan**
  - Sesuaikan bahasa jawaban dengan bahasa user (Indonesia atau Inggris), dan tetap ringkas serta to the point.
  - Jelaskan langkah dan alasan teknis dengan singkat jika membuat perubahan yang tidak trivial.

---

## Go DTO & Model Safety

Berlaku untuk file `*.go`:

- **Pemisahan DTO dan model**
  - Jangan pernah decode request body langsung ke DB model.
  - Jangan pakai struct yang sama untuk: input request, model DB, dan response sekaligus.
  - Setiap endpoint harus punya DTO input sendiri (create dan update boleh beda DTO).

- **Prinsip whitelist (seperti Laravel fillable)**
  - DTO harus whitelist: hanya field yang boleh diisi dari request yang ada di struct.
  - Mapping dari DTO ke model harus eksplisit, field-per-field.
  - Hindari auto-mapper/reflection yang menyamakan semua field tanpa kontrol.

- **Validasi di depan**
  - Lakukan validasi penuh di DTO sebelum mapping ke model: required, tipe, nilai kosong/zero, dan aturan bisnis dasar.
  - Request yang tidak valid tidak boleh mengubah state DB sama sekali.

- **Response DTO**
  - Jangan expose field internal: password, token, internal ID, flag sensitif.
  - Respons harus pakai DTO response terpisah jika perlu, bukan langsung return model DB mentah.

---

## Laravel Mass Assignment ($fillable vs $guarded)

Berlaku untuk file `*.php`:

- **Gunakan $fillable (whitelist)**
  - Definisikan kolom yang BOLEH diisi dari request di `$fillable`.
  - Kolom di luar `$fillable` akan diabaikan; ini lebih aman untuk SaaS/multi-tenant.

- **Hindari $guarded (blacklist)**
  - `$guarded` mudah salah saat kolom baru ditambah dan lupa di-guard.
  - Default: selalu prefer `$fillable` untuk model yang terhubung dengan input user.

---

## Pre-Production Checklist (Senior Dev Standard)

- **Functional & flow check**
  - Semua fitur utama harus bisa dipakai end-to-end tanpa dead-end.
  - Uji edge case dasar: data kosong, role salah, input aneh.
  - Fokus: aplikasi BISA DIPAKAI user nyata, bukan cuma bisa di-run.

- **FE–BE–API sinkron**
  - Selalu definisikan dan patuhi kontrak API (Swagger/OpenAPI atau dokumentasi setara).
  - FE tidak memegang bisnis logic; BE yang ambil keputusan.
  - BE wajib validasi semua input dan response shape harus konsisten.

- **Database siap**
  - Schema mengikuti kebutuhan bisnis, lengkap dengan constraint (FK, NOT NULL, ENUM).
  - Migration harus aman, repeatable, dan menjadi satu-satunya cara ubah schema.

- **Security dasar**
  - Auth & RBAC benar: tidak ada endpoint sensitif tanpa proteksi.
  - CORS dikonfigurasi dengan benar; tidak all-origins tanpa alasan.
  - Tidak ada secret bocor (env, token, key) di FE/log/public.

- **Error & observability**
  - Pasang mekanisme penangkap error (Sentry atau setara) di BE, idealnya juga di FE.
  - Jangan ada silent failure; setiap error penting harus kelihatan di log/monitoring.

- **Infra & deploy**
  - ENV variable rapi dan dipisah per environment.
  - Konfigurasi Docker/service harus stabil dan bisa di-restart tanpa merusak state.
  - Harus ada cara rollback yang realistis.

---

## Product Context, Behavior, UI, dan User Flow

- **Konteks aplikasi & user**
  - Selalu jelaskan dulu: jenis aplikasi, target user, masalah utama, tujuan, dan konteks penggunaan.
  - Semua fitur, UI, dan arsitektur harus menyesuaikan konteks ini.
  - Utamakan kesederhanaan, kejelasan, dan fokus ke masalah nyata user.

- **Fitur berbasis perilaku (behavior-driven)**
  - Setiap fitur dijelaskan sebagai: Saat [aksi/kondisi user] → sistem [aksi] → sehingga [hasil untuk user].
  - Frontend hanya mengirim intent dan menampilkan hasil; semua keputusan bisnis ada di backend.

- **Desain UI eksplisit**
  - Nyatakan gaya desain secara jelas dan jangan dicampur.
  - Definisikan warna utama, sekunder, dan netral.
  - Mobile-first: nyaman dipakai di HP.

- **User flow terstruktur**
  - Jelaskan alur sebagai cerita dari awal sampai akhir.
  - Tidak boleh ada langkah "ajaib" tanpa penjelasan.

---

## Security Audit & QA Mindset untuk SaaS

- **Peran & pola pikir**
  - Berpikir sebagai attacker dan defender: cari celah di logic, auth, data, dan infra.
  - Jangan percaya frontend, input user, atau asumsi "user pasti jujur".

- **Security audit SaaS (ringkas per area)**
  - Landing & public: cek asset exposure, CORS, header security.
  - Registration: hindari enumeration, abuse signup, tenant spoofing.
  - Login & auth: brute force protection, token expiry/refresh, logout invalidation.
  - Authorization & role: cegah privilege escalation, IDOR, role tampering; auth harus di-backend.
  - Multi-tenant: isolasi data antar tenant, hindari tenant ID injection.
  - API security: validasi input, hindari mass assignment/over-posting.
  - Payment: cegah invoice tampering, replay, status forgery; validasi webhook.

- **QA coverage**
  - Uji happy path, error path, edge case, dan abuse scenario.
  - Setiap temuan diberi severity (LOW/MEDIUM/HIGH/CRITICAL).

- **Prinsip senior**
  - Lebih takut data rusak daripada error muncul.
  - Jika sistem belum layak production, sebut dengan tegas dan jelaskan alasannya.
