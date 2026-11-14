# Autonomous Urban Maintenance System (AUMS) 🏙️🛠️

![Kategori](https://img.shields.io/badge/Kategori-Web_Application-0EA5E9?style=plastic) ![license](https://img.shields.io/badge/License-MIT-yellow?style=plastic) ![GitHub last commit (branch)](https://img.shields.io/github/last-commit/ziehan/engineerizz-aums/main?style=plastic) ![theme](https://img.shields.io/badge/Theme-Civic_Tech_&_Community_Service-lightgray?style=plastic)

**Autonomous Urban Maintenance System (AUMS)** merupakan **aplikasi berbasis web (_Web Application_)** yang dirancang untuk mengotomatisasi pemrosesan laporan infrastruktur perkotaan, penyaringan laporan duplikat, perencanaan penanganan operasional, serta verifikasi perbaikan lapangan secara otonom. AUMS menjembatani komunikasi antara warga, tim pengelola pusat, dan petugas dinas pemeliharaan kota menggunakan arsitektur **Multi-Agent AI Multimodal** serta pencarian vektor (_vector search_) berbasis geospasial.

<div align="center">
  <a href="https://engineerizz-aums.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/🚀_Akses_Aplikasi_AUMS-Live_Demo-2563EB?style=for-the-badge&logo=vercel&logoColor=white" alt="Akses Aplikasi AUMS" />
  </a>
</div>

## 📋 Daftar Isi

<table align="center" width="100%">
  <tr>
    <td width="50%" valign="top">
      <ul>
        <li><a href="#-permasalahan">🚨 Permasalahan</a></li>
        <li><a href="#-solusi-kami">💡 Solusi Kami</a></li>
        <li><a href="#-target-pengguna">🎯 Target Pengguna</a></li>
        <li><a href="#-fitur-utama">✨ Fitur Utama</a></li>
        <li><a href="#-alur-pengguna">🔄 Alur Pengguna</a></li>
        <li><a href="#-arsitektur-sistem-dan-alur-data">🧩 Arsitektur Sistem dan Alur Data</a></li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <ul>
        <li><a href="#-dokumentasi-penggunaan-ai">🤖 Dokumentasi Penggunaan AI</a></li>
        <li><a href="#%EF%B8%8F-tech-stack">🛠️ Tech Stack</a></li>
        <li><a href="#-panduan-instalasi-dan-konfigurasi">📦 Panduan Instalasi dan Konfigurasi</a></li>
        <li><a href="#-akun-demonstrasi">🔑 Akun Demonstrasi</a></li>
        <li><a href="#-dampak-yang-diharapkan">📈 Dampak yang Diharapkan</a></li>
        <li><a href="#-tim-engineerizz">👥 Tim Engineerizz</a></li>
        <li><a href="#-atribusi-pihak-ketiga">📜 Atribusi Pihak Ketiga</a></li>
        <li><a href="#-referensi">📚 Referensi</a></li>
      </ul>
    </td>
  </tr>
</table>

## 🚨 Permasalahan

Infrastruktur publik perkotaan, seperti jalan berlubang dan lampu penerangan jalan yang mati, sering kali membutuhkan waktu berminggu-minggu untuk diperbaiki. Kanal pelaporan yang umumnya digunakan saat ini masih sangat bergantung pada pemrosesan secara manual oleh petugas untuk membaca, menyortir, dan memverifikasi ribuan keluhan yang masuk, sehingga terbentuklah masalah-masalah berikut:

- **Verifikasi yang Lambat**, Berdasarkan regulasi nasional (SP4N-LAPOR), proses pengecekan dan verifikasi tiket secara manual memakan waktu hingga **3 hari kerja**.
- **Tingginya Duplikasi Laporan**, Data operasional kota (seperti Jakarta Smart City) menunjukkan bahwa **20% hingga 30%** laporan yang masuk merupakan duplikat dari masalah yang sudah pernah dilaporkan sebelumnya, sehingga masalah-masalah duplikat tersebut menumpuk beban administrasi dan memperlambat perbaikan yang seharusnya memiliki prioritas lebih tinggi.
- **Menurunnya Kepercayaan Publik**, Penanganan yang berlarut-larut akan menimbulkan masalah yang seharusnya dapat diselesaikan, justru menjadi masalah yang lebih rumit sehingga membuat warga merasa diabaikan oleh pemerintah daerah.

## 💡 Solusi Kami

Autonomous Urban Maintenance System (AUMS) menggantikan formulir pelaporan statis yang bersifat manual dengan alur pemilahan (_triage_) dan verifikasi otonom. Dengan menggabungkan **Google Gemini Multimodal AI** dan **PostgreSQL (`pgvector` + `PostGIS`)**, AUMS dapat mengevaluasi keaslian serta tingkat kerusakan visual, menyaring laporan duplikat melalui pencocokan spasial-semantik, menyusun rencana tindakan operasional berbasis data historis (_RAG_), hingga mengaudit foto bukti perbaikan lapangan secara otomatis.

## 🎯 Target Pengguna

AUMS dirancang untuk melayani tiga peran utama dalam ekosistem pemeliharaan infrastruktur perkotaan:

- **Warga (`CITIZEN`):** Masyarakat umum yang melaporkan kerusakan fasilitas publik (jalan berlubang, banjir/genangan, sampah liar, pohon tumbang, trotoar rusak, dll.) lengkap dengan foto serta koordinat GPS, dan memantau perkembangan status penanganannya.
- **Admin / CRM Officer (`ADMIN` dan `CRM_OFFICER`):** Tim pengelola pusat pemerintah daerah yang memantau seluruh aduan masuk, meninjau hasil analisis AI (_confidence score_, log agen, dan rencana aksi), menyetujui perintah kerja (_work order_), menangani laporan yang membutuhkan peninjauan manusia (_human review_), mengelola laporan tertolak/duplikat, serta mengelola akun petugas.
- **Petugas Lapangan (`FIELD_OFFICER`):** Personel operasional dari 5 instansi SKPD DKI Jakarta (_Dinas Bina Marga_, _Dinas Sumber Daya Air_, _Dinas Lingkungan Hidup_, _Dinas Pertamanan dan Hutan Kota_, serta _Dinas Perhubungan_) yang menerima dan mengambil tugas divisi, menyesuaikan rencana kerja bila diperlukan, dan mengunggah bukti perbaikan langsung di lokasi kejadian.

## ✨ Fitur Utama

- **Penilaian Kerusakan Multimodal Instan (`IntakeAgent`):** Didukung oleh Google Gemini API untuk menganalisis foto dan deskripsi teks secara otomatis guna memverifikasi keaslian kerusakan fasilitas publik (_anti-spam_), menentukan tingkat urgensi (`Low`, `Medium`, `High`, `Critical`), serta menghitung skor prioritas (`1-100`).
- **Deteksi Duplikat Spasial-Semantik (`PostGIS` + `pgvector`):** Menggabungkan kueri radius geospasial (`< 100 meter`) menggunakan **PostGIS** dengan pencarian kemiripan vektor `768 dimensi` melalui **pgvector** serta pencocokan visual multimodal untuk mengelompokkan laporan duplikat ke laporan induk (_parent report_).
- **Perencanaan Penugasan Berbasis RAG (`PlanningAgent`):** Memanfaatkan konteks historis hingga 3 laporan terselesaikan terdekat (_Retrieval-Augmented Generation_) untuk menunjuk SKPD terkait, menyusun `3-5` langkah kerja operasional di lapangan, dan mengestimasi waktu penyelesaian (_SLA_).
- **Pelacakan Laporan dan Peta Interaktif (`Leaflet` + `OpenStreetMap`):** Warga dapat melihat peta sebaran laporan publik serta melacak detail perkembangan laporan miliknya mulai dari tahap `Pending`, `Approved`, `In_Progress`, `Resolved`, hingga `Rejected`.
- **Dashboard Multi-Role dan Pengawasan Manusia (_Human-in-the-Loop_):**
  - **Dashboard Admin:** Menyediakan ringkasan metrik sistem, detail log eksekusi agen AI, _confidence score_, persetujuan rencana kerja, pengelolaan staf dinas, serta penghapusan laporan yang ditolak atau duplikat.
  - **Dashboard Petugas Lapangan:** Menampilkan ringkasan dan peta tugas per divisi, klaim tugas mandiri, serta opsi penyuntingan _action plan_ rekomendasi AI (_Agency_, estimasi hari, dan detail langkah kerja) sebelum pengerjaan.
- **Verifikasi Lapangan Anti-Fraud (`VerificationAgent` + _Geofencing_):** Membatasi pengiriman bukti perbaikan hanya dalam radius maksimal `100 meter` dari titik laporan menggunakan perhitungan jarak _Haversine_, membubuhkan watermark koordinat GPS dan _timestamp_ secara otomatis via **HTML5 Canvas**, serta membandingkan foto _before-after_ guna mencegah rekayasa atau pemotretan ulang dari layar (_digital spoofing_).

## 🔄 Alur Pengguna

1. **Pengiriman Laporan oleh Warga (`CITIZEN`):** Warga masuk ke aplikasi web, mengambil/mengunggah foto fasilitas rusak, memilih atau mendeteksi titik lokasi GPS pada peta interaktif, dan mengirimkan laporan.
2. **Evaluasi dan Perencanaan AI (`IntakeAgent` ➔ `PlanningAgent`):**
   - Sistem membuat _vector embedding_ (`768 dimensi`) lalu menjalankan **Intake Agent** untuk memeriksa validitas gambar/teks dan duplikasi radius `< 100m`.
   - Jika laporan tidak valid, status diubah menjadi `Rejected` dan **Planning Agent** tidak dijalankan.
   - Jika valid dan unik, **Planning Agent** dipicu dengan konteks RAG untuk menghasilkan target dinas SKPD, estimasi hari, serta langkah aksi operasional.
3. **Peninjauan dan Persetujuan Admin/CRM (`ADMIN`):** Admin meninjau detail laporan (termasuk log AI, _confidence score_, dan rekomendasi _action plan_), lalu menyetujui laporan untuk diteruskan ke divisi lapangan, atau menghapus laporan yang tidak valid/ditolak.
4. **Eksekusi oleh Petugas Lapangan (`FIELD_OFFICER`):** Petugas melihat daftar serta ringkasan tugas divisinya, mengklaim tugas, meninjau atau menyesuaikan _action plan_ bila diperlukan, dan mengunggah foto bukti setelah perbaikan berikut catatan penyelesaian saat berada di radius lokasi (`≤ 100m`).
5. **Audit Visual Otomatis (`VerificationAgent`):** AI membandingkan foto _before_ dan _after_, memeriksa kecocokan tengara fisik permanen serta watermark koordinat HTML5 Canvas, lalu mengubah status menjadi `Resolved` apabila terverifikasi (atau menandai `requiresHumanReview` jika skor keyakinan di bawah ambang batas).

## 🧩 Arsitektur Sistem dan Alur Data

AUMS dibangun dengan arsitektur _monorepo_ tiga layanan terpisah yang saling terintegrasi secara aman:

1. **Frontend Client (`frontend/` - Port `3000`):** Antarmuka web berbasis **Next.js 16 (App Router)** yang menangani sesi pengguna berbasis JWT, peta interaktif **Leaflet**, penangkapan koordinat _Web Geolocation API_, serta pembubuhan watermark **HTML5 Canvas** pada foto verifikasi.
2. **Core Backend API (`backend/` - Port `5000`):** Layanan inti berbasis **Express.js 5** dan **Prisma ORM 7** yang mengelola autentikasi, validasi skema (**Zod**), kompresi gambar (**Multer** + **Sharp**), penyimpanan media (**Supabase Storage**), _reverse geocoding_ (**Google Maps API** / **OpenStreetMap Nominatim**), kueri spasial-vektor, dan pencatatan `AuditLog`.
3. **AI Intelligence Layer (`ai-services/` - Port `3001`):** Layanan mikro khusus berbasis **Express.js 5** yang diproteksi dengan `x-internal-api-key` untuk menjalankan tiga agen multimodal dan generator _embedding_ melalui **Google Gemini API**.
4. **Database (`PostgreSQL 16` + `PostGIS` + `pgvector`):** Menyimpan data relasional (`User`, `Department`, `Report`, `ActionPlan`, `AuditLog`), koordinat geospasial (`geography(Point, 4326)`), dan _vector embedding_ (`vector(768)`).

```mermaid
flowchart TD
    User["Pengguna: Warga, Admin, dan Petugas Lapangan"] -->|"HTTPS / Browser"| FE["Frontend - Next.js 16 dan Leaflet (Port 3000)"]
    FE -->|"REST API + JWT Bearer"| BE["Core Backend - Express.js 5 dan Prisma 7 (Port 5000)"]
    BE -->|"SQL, PostGIS, dan pgvector"| DB[("PostgreSQL 16: PostGIS + pgvector")]
    BE -->|"Upload dan URL Publik JPEG"| Storage["Supabase Storage (Bucket: aums-media)"]
    BE -->|"Reverse Geocoding"| Maps["Google Maps API / OSM Nominatim"]
    BE -->|"Internal HTTP + x-internal-api-key"| AI["AI Services - Express.js 5 (Port 3001)"]
    AI -->|"Multimodal Vision dan Embedding"| Gemini["Google Gemini API"]
    AI -->|"1. Validasi dan Cek Duplikat"| Intake["Intake Agent"]
    Intake -->|"Valid dan Unik"| Plan["Planning Agent (Konteks RAG)"]
    Intake -->|"Tidak Valid (isValid: false)"| Reject["Status: Rejected (Planning Dilewati)"]
    AI -->|"2. Audit Foto Before-After"| Verify["Verification Agent"]
```

### Alur Data Utama

1. **Input dan Pra-pemrosesan:** Foto dari warga maupun petugas divalidasi MIME-nya (`JPEG`/`PNG`/`WebP`, maks. `10 MB`), dikompresi oleh **Sharp** menjadi JPEG berlebar maksimal `1080px` (`quality: 75`), lalu diunggah ke **Supabase Storage** (dengan fallback URL lokal apabila kredensial cloud tidak diatur).
2. **Ekstraksi Vektor dan Kandidat Spasial:** Backend memanggil `/api/v1/ai/embed` untuk menghasilkan vektor `768 dimensi`, menyimpannya ke kolom `embedding`, dan mengambil laporan kandidat dalam radius kedekatan geografis via **PostGIS**.
3. **Orkestrasi Multi-Agent dan Audit Trail:** Backend mengirim payload ke `/api/v1/ai/validate` (`IntakeAgent`), `/api/v1/ai/plan` (`PlanningAgent`), dan `/api/v1/ai/verify` (`VerificationAgent`). Seluruh masukan, keluaran JSON terstruktur, dan skor keyakinan dicatat ke tabel `AuditLog`.

## 🤖 Dokumentasi Penggunaan AI

AUMS memanfaatkan layanan **Google Gemini API** melalui SDK `@google/genai` dengan konfigurasi terisolasi di dalam layanan `ai-services/`.

### Konfigurasi Model

- **Model Generatif Utama:** `gemini-3.5-flash-lite` (dapat dikonfigurasi melalui variabel `GEMINI_MODEL`).
- **Mekanisme _Failover_ Otomatis:** Apabila terjadi gangguan sementara atau _rate limit_ (`HTTP 429` / `503`), sistem otomatis melakukan _retry_ dan berpindah ke model cadangan secara berurutan (`gemini-3.1-flash-lite`, `gemini-3.8-flash`, `gemini-3.6-flash` melalui `GEMINI_FALLBACK_MODEL`).
- **Model _Embedding_:** `gemini-embedding-001` dengan keluaran vektor ter-normalisasi **`768 dimensi`** untuk pencocokan kemiripan laporan di PostgreSQL `pgvector`.

### Peran Tiga Agen Multimodal

| Agen AI                                         | Endpoint                   | Input Utama                                                                                                                 | Output dan Fungsi                                                                                                                                                                                                         |
| :---------------------------------------------- | :------------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Intake Agent** (`intakeAgent.js`)             | `POST /api/v1/ai/validate` | Judul, deskripsi, kategori, koordinat, foto laporan, dan daftar kandidat laporan terdekat (`< 100m`).                       | Mengembalikan `isValid`, `validityConfidence`, `isDuplicate`, `deduplicationConfidence`, `parentReportId`, `priorityScore` (`1-100`), `urgencyLevel`, `category`, dan `reasoning` dalam Bahasa Indonesia.                 |
| **Planning Agent** (`planningAgent.js`)         | `POST /api/v1/ai/plan`     | Data laporan tervalidasi beserta `ragContext` (hingga 3 laporan terselesaikan serupa di radius `< 100m`).                   | Menentukan 1 dari 5 SKPD DKI Jakarta (`targetAgency`), `agencyConfidence`, `planConfidence`, `confidenceScore`, `estimatedDays`, `3-5` langkah `actionSteps`, dan `dispatchReason`.                                       |
| **Verification Agent** (`verificationAgent.js`) | `POST /api/v1/ai/verify`   | Foto kondisi awal (`before`), foto perbaikan (`after`) berwatermark kanvas, deskripsi laporan, dan metadata lokasi petugas. | Mengembalikan `isResolved`, `visualMatch`, `verificationConfidence`, `confidenceScore`, dan `auditNotes` (pengecekan kesamaan tengara fisik, watermark HTML5 Canvas, serta deteksi _digital spoofing_ / foto daur ulang). |

### Pengamanan dan Kontrol (_Guardrails_ dan _Human-in-the-Loop_)

- **Mitigasi _Prompt Injection_:** Seluruh data masukan tidak terpercaya dibungkus dengan pembatas XML `<user_data>...</user_data>` dan dipaksa mengikuti `responseSchema` JSON yang ketat (`temperature: 0`).
- **Proteksi SSRF (`ssrfGuard.js`):** URL gambar eksternal divalidasi sebelum diunduh oleh adaptor Gemini untuk mencegah akses ke jaringan internal/lokal.
- **Ambang Batas Peninjauan Manusia (`requiresHumanReview`):** Laporan dengan skor keyakinan di bawah `0.70` pada tahap _intake/planning_ atau bukti perbaikan yang ditolak / di bawah ambang `0.80` pada tahap verifikasi otomatis ditandai agar ditinjau secara manual oleh Admin.

## 🛠️ Tech Stack

- **Frontend:**
  ![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-grey?style=for-the-badge&logo=tailwind-css&logoColor=38B2AC) ![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white)
  - `Next.js 16.4.6` (App Router), `React 19.3.0`, `TypeScript 5`, `Tailwind CSS 4.3.3`
  - `Leaflet 1.9.4` dan `react-leaflet 5.0.0` (Peta interaktif dan pemilih koordinat lokasi)
  - `clsx` dan `tailwind-merge` (Utilitas styling komponen)
- **Backend Core:**
  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/express.js-000000?style=for-the-badge&logo=express&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
  - `Node.js` dan `Express.js 5.3.0`
  - `Prisma 7.10.0` (`@prisma/client` dan `@prisma/adapter-pg`) dengan driver `pg 8.23.1`
  - `jsonwebtoken 9.0.2` dan `bcryptjs 3.0.2` (Autentikasi JWT dan hashing password)
  - `Zod 3.25.76` (Validasi payload dan environment variables)
  - `Multer 2.0.2` dan `Sharp 0.34.3` (Upload multipart dan optimasi gambar JPEG)
  - `Helmet 8.1.0`, `express-rate-limit 7.5.0`, `CORS 2.8.6`, dan `Axios 1.20.0`
- **Database dan Penyimpanan:**
  ![Postgresql](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
  - `PostgreSQL 16` dengan ekstensi **`pgvector`** (pencarian vektor `768d`), **`PostGIS`** (kueri geospasial), dan **`uuid-ossp`**
  - `Supabase Storage` (`@supabase/supabase-js 2.49.1`) untuk penyimpanan foto laporan dan bukti perbaikan (dilengkapi mode fallback lokal untuk pengembangan tanpa kredensial cloud)
- **AI dan Layanan Pihak Ketiga:**
  ![Gemini](https://img.shields.io/badge/Gemini-black?style=for-the-badge&logo=google-gemini) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) ![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
  - `Google Gemini API` (`@google/genai 2.29.1`) untuk analisis multimodal dan _text embeddings_
  - `Google Maps Services JS` (`@googlemaps/google-maps-services-js 3.4.2`) dan `OpenStreetMap Nominatim` (_reverse geocoding_)
  - `Docker` dan `Docker Compose` (kontainerisasi PostgreSQL + pgvector + PostGIS serta layanan API) serta `Vercel` (hosting frontend)

## 📦 Panduan Instalasi dan Konfigurasi

### Prasyarat

- **Node.js** v20+ atau v22 LTS dan **npm**
- **Docker** dan **Docker Compose** (untuk menjalankan PostgreSQL 16 dengan ekstensi `pgvector` dan `PostGIS`)
- **Google Gemini API Key** dari [Google AI Studio](https://aistudio.google.com/)

### 1. Kloning Repositori

```bash
git clone https://github.com/ziehan/engineerizz-aums.git
cd engineerizz-aums
```

### 2. Menjalankan Database (`PostgreSQL` + `pgvector` + `PostGIS`)

Di dalam folder `backend/`, sudah tersedia konfigurasi Docker (`docker-compose.yml` dan `Dockerfile.postgres`) yang langsung memasang `pgvector` dan `postgresql-16-postgis-3` pada port `5433`:

```bash
cd backend
docker compose up -d
cd ..
```

### 3. Konfigurasi Variabel Lingkungan (`.env`)

Salin file `.env.example` yang tersedia di `ai-services/` dan `backend/`, serta buat file `.env` pada `frontend/`:

#### A. AI Services (`ai-services/.env`, mengacu ke [ai-services/.env.example](ai-services/.env.example))

```bash
cp ai-services/.env.example ai-services/.env
```

| Variabel                | Wajib | Contoh / Default                                          | Keterangan                                                         |
| :---------------------- | :---: | :-------------------------------------------------------- | :----------------------------------------------------------------- |
| `GEMINI_API_KEY`        |  Ya   | `your_gemini_api_key_here`                                | API Key Google Gemini untuk inferensi agen dan embedding           |
| `PORT`                  |  Ya   | `3001`                                                    | Port HTTP layanan AI                                               |
| `ALLOWED_ORIGINS`       | Tidak | `http://localhost:3000,http://localhost:5000`             | Daftar origin yang diizinkan oleh CORS                             |
| `GEMINI_MODEL`          | Tidak | `gemini-3.5-flash-lite`                                   | Model utama Gemini untuk penalaran multimodal                      |
| `GEMINI_FALLBACK_MODEL` | Tidak | `gemini-3.1-flash-lite,gemini-3.8-flash,gemini-3.6-flash` | Daftar model cadangan otomatis jika model utama gagal              |
| `INTERNAL_API_KEY`      |  Ya   | `your_secret_internal_key_2026`                           | Kunci otorisasi komunikasi internal antara Backend dan AI Services |
| `LLM_TIMEOUT_MS`        | Tidak | `30000`                                                   | Batas waktu permintaan ke Gemini API (milidetik)                   |

#### B. Core Backend (`backend/.env`, mengacu ke [backend/.env.example](backend/.env.example))

```bash
cp backend/.env.example backend/.env
```

| Variabel                                          |   Wajib   | Contoh / Default                                                   | Keterangan                                                                                    |
| :------------------------------------------------ | :-------: | :----------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                    |    Ya     | `postgresql://postgres:postgres@localhost:5433/aums?schema=public` | String koneksi PostgreSQL (sesuai konfigurasi `docker-compose.yml`)                           |
| `PORT`                                            |   Tidak   | `5000`                                                             | Port HTTP Backend API                                                                         |
| `HOST`                                            |   Tidak   | `localhost`                                                        | Host binding server backend                                                                   |
| `AI_SERVICE_URL`                                  |    Ya     | `http://localhost:3001`                                            | URL endpoint layanan `ai-services`                                                            |
| `JWT_SECRET`                                      | Ya (Prod) | `replace-with-a-long-random-secret`                                | Secret key untuk penandatanganan token JWT                                                    |
| `INTERNAL_API_KEY`                                | Ya (Prod) | `your_secret_internal_key_2026`                                    | Harus sama persis dengan `INTERNAL_API_KEY` di `ai-services/.env`                             |
| `ENABLE_AI_FALLBACK_DEFAULT`                      |   Tidak   | `false`                                                            | Mengaktifkan respons fallback default saat AI service tidak tersedia                          |
| `MAPS_API_KEY`                                    |   Tidak   | `""`                                                               | Google Maps API Key untuk _reverse geocoding_ (jika kosong, otomatis memakai alamat fallback) |
| `NODE_ENV`                                        |   Tidak   | `development`                                                      | Lingkungan eksekusi (`development`, `production`, `test`)                                     |
| `SUPABASE_URL`                                    | Opsional  | `""`                                                               | URL proyek Supabase untuk penyimpanan foto di cloud (jika kosong, memakai URL mock lokal)     |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` | Opsional  | `""`                                                               | Kunci akses Supabase Storage bucket                                                           |
| `SUPABASE_STORAGE_BUCKET`                         | Opsional  | `aums-media`                                                       | Nama bucket Supabase Storage                                                                  |
| `NOMINATIM_URL` dan `NOMINATIM_USER_AGENT`        | Opsional  | `https://nominatim.openstreetmap.org`                              | Konfigurasi layanan _reverse geocoding_ OpenStreetMap Nominatim                               |

#### C. Frontend (`frontend/.env`)

Buat file `frontend/.env` dan isi dengan URL Backend API:

```env
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:5000
```

### 4. Instalasi Dependensi, Migrasi, dan _Seeding_ Database

```bash
# 1. Instalasi dependensi AI Services
cd ai-services
npm install

# 2. Instalasi dependensi Backend, generate Prisma Client, migrasi, dan seeding
cd ../backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 3. Instalasi dependensi Frontend
cd ../frontend
npm install
```

### 5. Menjalankan Aplikasi

Jalankan ketiga layanan secara bersamaan di tiga terminal terpisah:

```bash
# Terminal 1: AI Services (Port 3001)
cd ai-services
npm run dev

# Terminal 2: Core Backend API (Port 5000)
cd backend
npm run dev

# Terminal 3: Frontend Web App (Port 3000)
cd frontend
npm run dev
```

Setelah ketiganya berjalan, buka **`http://localhost:3000`** di browser Anda.

#### Menjalankan Unit Test (Opsional)

```bash
# Pengujian Backend
cd backend
npm test

# Pengujian AI Services
cd ../ai-services
npm test
```

## 🔑 Akun Demonstrasi

Menjalankan perintah `npm run prisma:seed` di folder `backend/` akan mengisi database dengan 5 instansi SKPD DKI Jakarta, 8 laporan contoh beserta riwayat `AuditLog` multi-agen, dan akun pengguna untuk seluruh peran.

Kata sandi default untuk seluruh akun demonstrasi adalah **`PasswordAUMS2026!`**:

| Peran (`Role`)                      | Email                                  | Nama Pengguna            | Akses dan Keterangan                                                                                                                          |
| :---------------------------------- | :------------------------------------- | :----------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- |
| **Admin** (`ADMIN`)                 | `admin@aums.jakarta.go.id`             | Drs. Hendra Wijaya, M.Si | Dashboard Admin/CRM (`/admin/dashboard`): tinjau log AI, setujui/hapus laporan, kelola pengguna _(tersedia juga `admin2@aums.jakarta.go.id`)_ |
| **Field Officer** (`FIELD_OFFICER`) | `officer.binamarga@aums.jakarta.go.id` | Bambang Suryanto, S.T.   | Dashboard Petugas (`/officer/dashboard`): Dinas Bina Marga DKI Jakarta                                                                        |
| **Field Officer** (`FIELD_OFFICER`) | `officer.sda@aums.jakarta.go.id`       | Dedi Kurniawan, A.Md     | Dashboard Petugas: Dinas Sumber Daya Air DKI Jakarta                                                                                          |
| **Field Officer** (`FIELD_OFFICER`) | `officer.dlh@aums.jakarta.go.id`       | Agus Setiawan            | Dashboard Petugas: Dinas Lingkungan Hidup DKI Jakarta                                                                                         |
| **Field Officer** (`FIELD_OFFICER`) | `officer.tamhut@aums.jakarta.go.id`    | Wahyu Hidayat, S.P.      | Dashboard Petugas: Dinas Pertamanan dan Hutan Kota DKI Jakarta                                                                                |
| **Field Officer** (`FIELD_OFFICER`) | `officer.dishub@aums.jakarta.go.id`    | Rizky Ramadhan, S.Tr.Tra | Dashboard Petugas: Dinas Perhubungan DKI Jakarta                                                                                              |
| **Warga** (`CITIZEN`)               | `warga1@aums.jakarta.go.id`            | Andi Pratama             | Dashboard Warga (`/dashboard`): buat laporan baru dan lacak progres _(tersedia juga `warga2` s.d. `warga4@aums.jakarta.go.id`)_               |

> **Catatan:** Seeder juga menyediakan akun dengan peran `CRM_OFFICER` (`crm@aums.jakarta.go.id` dan `crm2@aums.jakarta.go.id`) untuk otorisasi endpoint API backend; untuk mengakses antarmuka Dashboard pengelola pada frontend web, gunakan akun `admin@aums.jakarta.go.id`.

## 📈 Dampak yang Diharapkan

Berdasarkan pengukuran menggunakan simulasi data operasional perkotaan, AUMS menargetkan pencapaian berikut:

- **⏱️ Pemilahan >99% Lebih Cepat**, Memangkas waktu verifikasi dan pemilahan laporan dari **3 hari kerja** menjadi **kurang dari 2 menit**.
- **📉 Pengurangan Beban Duplikasi >50%**, Mengurangi pemrosesan tiket duplikat secara manual hingga lebih dari setengahnya.

## 👥 Tim Engineerizz

### Universitas Indonesia (UI)

| Peran         | Nama                             |
| :------------ | :------------------------------- |
| **Ketua Tim** | Naziehan Labieb                  |
| **Anggota**   | Dimar Ilham Tamara               |
| **Anggota**   | Naufal Rahman                    |
| **Anggota**   | Raihan Muhammad Nafis Al-Kautsar |

<a href="https://github.com/ziehan/engineerizz-aums/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ziehan/engineerizz-aums&max=101" /> <img width=70 style="border-radius:100%; border: 1px solid white" src="https://avatars.githubusercontent.com/u/188180556?v=4"/>
</a>

## 📜 Atribusi Pihak Ketiga

Seluruh kode inti aplikasi dikembangkan oleh Tim Engineerizz dengan memanfaatkan pustaka, layanan, dan aset pihak ketiga berikut sesuai lisensinya masing-masing:

- **Peta dan Data Geospasial:** [OpenStreetMap](https://www.openstreetmap.org/copyright) (peta dasar _tile layer_ dan layanan _reverse geocoding_ Nominatim) yang dirender melalui [Leaflet](https://leafletjs.com/) dan [React Leaflet](https://react-leaflet.js.org/), termasuk aset CSS dan ikon _marker_ Leaflet pada `frontend/public/leaflet/`.
- **Model dan Layanan AI:** [Google Gemini API](https://ai.google.dev/) melalui pustaka `@google/genai` untuk analisis multimodal (_vision + text_) dan pembuatan _vector embeddings_.
- **Tipografi:** [Google Fonts](https://fonts.google.com/) (`Noto Sans Malayalam` melalui modul `next/font/google`).
- **Framework, ORM, dan Pustaka Open-Source:** Next.js, React, Tailwind CSS, Express.js, Prisma ORM, PostgreSQL, `pgvector`, PostGIS, Supabase JS Client, Sharp, Multer, Zod, Helmet, `express-rate-limit`, `bcryptjs`, dan `jsonwebtoken`.
- **Aset Visual dan Widget:** Ilustrasi dan logo aplikasi (`frontend/public/Ilustrasi.png`, `hero-img.png`, `logo-fix.svg`, `logo-white.svg`) dibuat oleh Tim Engineerizz; badge dokumentasi menggunakan [Shields.io](https://shields.io/) dan visualisasi kontributor menggunakan [contrib.rocks](https://contrib.rocks/).

## 📚 Referensi

1. **PermenPAN-RB No. 62/2018** tentang Pedoman Sistem Pengaduan Pelayanan Publik Nasional (SLA verifikasi 3 hari SP4N-LAPOR).
2. **Jakarta Smart City (JSC)** Riset Deteksi Laporan Duplikat dan Laporan Infrastruktur Nasional SP4N-LAPOR.
