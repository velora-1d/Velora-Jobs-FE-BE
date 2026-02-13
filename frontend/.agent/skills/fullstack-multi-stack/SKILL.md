---
name: fullstack-multi-stack
description: Helps the agent work across mixed-stack projects using Golang, Laravel/PHP, Python, Next.js/React, and native DLL integrations. Use when the project involves multiple backends, frontends, utilities, or when the user mentions these technologies explicitly.
---

# Fullstack Multi-Stack (Golang, Laravel, Python, Next.js, DLL)

## Tujuan skill

- Memastikan agent **mengikuti pola yang sudah ada di project**, bukan mengada-ada arsitektur baru.
- Membantu agent **memilih bahasa/framework yang tepat** tergantung konteks file.
- Menjaga **struktur, error handling, dan testing** konsisten di berbagai stack.

## Deteksi konteks project

Saat bekerja di project apa pun, lakukan ini terlebih dahulu:

1. **Deteksi stack utama per folder**
   - Jika ada `go.mod`, `main.go`, `cmd/`, `internal/` → anggap ini **service Golang**.
   - Jika ada `artisan`, `composer.json`, `routes/web.php` atau `routes/api.php` → anggap ini **Laravel/PHP**.
   - Jika ada `requirements.txt`, `pyproject.toml`, `Pipfile` → anggap ini **Python project/utilities**.
   - Jika ada `next.config.*`, `app/` atau `pages/` → anggap ini **Next.js (React)**.
   - Jika ada `.dll` atau pembahasan library native → anggap ini **DLL interop** dari bahasa host (Go/Python/PHP).

2. **Ikuti konvensi yang sudah ada**
   - Ikuti penamaan, struktur folder, pendekatan dependency injection, pattern auth, dan error handling yang sudah dipakai project.
   - Jangan ganti arsitektur besar kecuali diminta eksplisit.

3. **Pilih bahasa & pattern yang tepat**
   - Lanjut pakai bahasa/framework yang sudah dominan di folder tersebut.
   - Bila ada beberapa opsi (misal Python & Go ada di root), lihat file yang sedang disentuh user lalu sesuaikan.

## Pedoman umum lintas bahasa

- **Error handling**
  - Jangan pernah diam-diam mengabaikan error.
  - Beri pesan error yang jelas dan tidak membocorkan rahasia (credentials, path internal sensitif, dsb).
- **Struktur**
  - Pisahkan jelas: lapisan HTTP/controller, bisnis logic/service/use case, dan persistence/repository.
  - Buat fungsi/komponen yang kecil dan fokus (single responsibility).
- **Testing**
  - Jika project sudah punya test, tiru setup dan style yang sama.
  - Minimal buat test untuk logic penting dan edge case.

## Pedoman spesifik Golang

- Struktur direkomendasikan (kalau cocok dengan project):
  - `cmd/` untuk entrypoint
  - `internal/` untuk business logic & modul dalam
  - `pkg/` hanya jika memang ingin diekspos ke luar
- Gunakan `context.Context` pada operasi I/O, DB, HTTP, atau long-running.
- Hindari panic di code biasa; prefer return error.
- Untuk HTTP handler:
  - Keep handler tipis, delegasikan logic ke service.
  - Validasi input, logging, dan mapping error → HTTP status dilakukan dengan konsisten.

## Pedoman spesifik Laravel (PHP)

- Gunakan:
  - **Controllers** untuk request/response
  - **Form Request** untuk validasi
  - **Models/Eloquent** atau repository/service sesuai pola project
- Simpan aturan bisnis yang kompleks di **Service/Action class**, bukan di Controller.
- Buat perubahan DB via **migrations**; jangan ubah skema langsung di DB kecuali project sudah jelas menggunakan raw SQL.
- Ikuti style route yang sudah ada (`api.php` vs `web.php`, grouping, middleware, prefix).

## Pedoman spesifik Python

- Gunakan dependency management yang sudah ada di project (`requirements.txt`, `pyproject.toml`, dll).
- Tulis fungsi yang mudah dites, hindari state global yang tidak perlu.
- Untuk script/CLI, gunakan pola:

  - Entry point di `if __name__ == "__main__":`
  - Pisahkan logic ke fungsi terpisah agar bisa di-test.

- Pilih library yang:
  - Sudah dipakai di project, atau
  - Standard library, kecuali ada kebutuhan khusus.

## Pedoman spesifik Next.js (React)

- Hormati jenis router yang digunakan:
  - Jika ada `app/` → gunakan **App Router** (Server Components, `route.ts`, segment-based).
  - Jika ada `pages/` → gunakan **Pages Router** (`getServerSideProps`, `getStaticProps`, dsb).
- Gunakan kembali:
  - UI components yang sudah ada
  - Hooks/context yang sudah dipakai (auth, theme, dsb)
  - Desain system yang ada (Tailwind, UI kit, dsb)
- Pastikan:
  - Komponen responsif dan accessible (semantic HTML, ARIA seperlunya).
  - Data fetching mengikuti pattern yang sudah ada (SSR/SSG/CSR sesuai project).

## Pedoman integrasi DLL (Windows)

- Jika user butuh panggil DLL dari:
  - **Go** → gunakan `syscall` atau `golang.org/x/sys/windows`, atau pattern yang sudah ada di project.
  - **Python** → gunakan `ctypes` atau `cffi` sesuai contoh yang sudah digunakan (jika ada).
  - **PHP/Laravel** → biasanya via ekstensi atau CLI wrapper; ikuti pola yang sudah ada.
- Selalu dokumentasikan:
  - Nama fungsi di DLL
  - Tipe argumen dan return
  - Calling convention (misal `stdcall`, `cdecl`)
  - Cara error-nya dikomunikasikan (return value khusus, GetLastError, dll)

## Kapan skill ini dipakai

Agent harus menerapkan skill ini ketika:

- Project berisi kombinasi **Golang / Laravel / Python / Next.js / DLL** atau ketika user menyebut langsung teknologi tersebut.
- User meminta:
  - Menambah fitur backend atau endpoint API
  - Mengubah/membuat halaman atau komponen Next.js
  - Menulis script/utility Python
  - Integrasi dengan DLL/native library
- Agent butuh memutuskan **di bahasa/framework mana** sebaiknya fitur baru dibuat di project multi-stack.

## Contoh penggunaan

### Contoh 1: Project dominan Golang + Next.js

- Jika user mengubah handler di Go dan halaman di Next.js:
  - Ikuti pattern service & handler di Go yang sudah ada.
  - Ikuti struktur halaman/komponen Next.js yang serupa (folder, naming, styling).

### Contoh 2: Laravel API + Next.js dashboard

- Tambah endpoint baru:
  - Tambah route di `routes/api.php` mengikuti style yang sama.
  - Buat Controller + Form Request + logika di Service.
- Hubungkan dari Next.js:
  - Pakai helper/fetch hook yang sudah ada untuk memanggil API.
  - Tangani loading/error state dengan pattern yang sama di project.

### Contoh 3: Python utility untuk otomasi

- Jika ada folder `scripts/` atau `tools/` berisi Python:
  - Tambah script dengan struktur serupa.
  - Dokumentasikan cara pakai di docstring atau README lokal.

### Contoh 4: Integrasi DLL dari Go

- Buat wrapper Go yang:
  - `LoadLibrary` / `NewLazyDLL`
  - `NewProc` fungsi yang dibutuhkan
  - Menyediakan fungsi Go-level yang aman tipe datanya
  - Meng-handle error dan convert ke error Go yang jelas

