# Autonomous Urban Maintenance System (AUMS) 🏙️🛠️

![license](https://img.shields.io/badge/License-MIT-yellow?style=plastic) ![GitHub last commit (branch)](https://img.shields.io/github/last-commit/ziehan/engineerizz-aums/main?style=plastic) ![theme](https://img.shields.io/badge/Theme-Civic_Tech_&_Community_Service-lightgray?style=plastic)

**Autonomous Urban Maintenance System (AUMS)** merupakan web-based app yang dirancang untuk mengotomatisasi pemrosesan laporan infrastruktur perkotaan, penyaringan laporan duplikat, dan penugasan pekerjaan pemeliharaan secara otomatis. AUMS menjembatani komunikasi antara warga dan tim pemeliharaan kota menggunakan agen AI multimodal serta pencarian vektor (*vector search*).

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
        <li><a href="#-fitur-utama">✨ Fitur Utama</a></li>
        <li><a href="#-alur-pengguna">🔄 Alur Pengguna</a></li>
        <li><a href="#%EF%B8%8F-tech-stack">🛠️ Tech Stack</a></li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <ul>
        <li><a href="#-dampak-yang-diharapkan">📈 Dampak yang Diharapkan</a></li>
        <li><a href="#-tim-engineerizz">👥 Tim Engineerizz</a></li>
        <li><a href="#-referensi">📚 Referensi</a></li>
      </ul>
    </td>
  </tr>
</table>

## 🚨 Permasalahan

Infrastruktur publik perkotaan, seperti jalan berlubang dan lampu penerangan jalan yang mati, sering kali membutuhkan waktu berminggu-minggu untuk diperbaiki. Channel pelaporan yang umumnya digunkan saat ini masih sangat bergantung pada pemrosesan secara manual oleh petugas untuk membaca, menyortir, dan memverifikasi ribuan keluhan yang masuk, sehingga terbentuklah masalah-masalah berikut:

* **Verifikasi yang Lambat**, Berdasarkan regulasi nasional (SP4N-LAPOR), proses pengecekan dan verifikasi tiket secara manual memakan waktu hingga **3 hari kerja**.
* **Tingginya Duplikasi Laporan**, Data operasional kota (seperti Jakarta Smart City) menunjukkan bahwa **20% hingga 30%** laporan yang masuk merupakan duplikat dari masalah yang sudah pernah dilaporkan sebelumnya, sehingga masalah-masalah duplikat tersebut menumpuk beban administrasi dan memperlambat perbaikan yang seharusnya memiliki prioritas lebih tinggi.
* **Menurunnya Kepercayaan Publik**, Penanganan yang berlarut-larut akan menimbulkan masalah yang seharusnya dapat diselesaikan, justru menjadi masalah yang lebih rumit sehingga membuat warga merasa diabaikan oleh pemerintah daerah.

## 💡 Solusi Kami

Autonomous Urban Maintenance System (AUMS) menggantikan formulir pelaporan statis yang bersifat manual dengan alur pemilahan (*triage*) otonom. Dengan menggabungkan **Google Gemini Multimodal AI** dan **PostgreSQL (`pgvector`)**, AUMS dapat mengevaluasi tingkat kerusakan visual, menyaring laporan duplikat melalui pencocokan spasial-semantik, serta membuat perintah kerja (*work order*) berprioritas langsung ke dasbor pemeliharaan kota.

## ✨ Fitur Utama

* **Penilaian Kerusakan Multimodal Instan:** Didukung oleh Google Gemini API untuk menganalisis foto dan deskripsi teks yang diunggah, serta mengklasifikasikan jenis dan tingkat keparahan kerusakan secara otomatis.
* **Deteksi Duplikat Otomatis:** Menggabungkan pengecekan kedekatan geolokasi dengan pencarian kemiripan vektor (`pgvector`) untuk mengidentifikasi dan menggabungkan keluhan duplikat sebelum tiket baru dibuat.
* **Penugasan Kerja Otonom:** Laporan yang tervalidasi secara otomatis diubah menjadi perintah kerja terstruktur dan dikirimkan ke dasbor administratif berdasarkan tingkat urgensinya.
* **Pengawasan Manusia (*Human-in-the-Loop*):** Menyediakan langkah konfirmasi manual yang cepat untuk tugas dengan tingkat keparahan tinggi guna memitigasi risiko kesalahan klasifikasi AI pada kerusakan yang kompleks.

## 🔄 Alur Pengguna

1. **Pengiriman Laporan oleh warga**, Warga membuka aplikasi web, mengambil foto fasilitas yang rusak, dan mengirimkan titik geolokasi.
2. **Evaluasi AI**, Agen AI multimodal kemudian akan memproses gambar dan teks untuk menentukan tingkat keparahan kerusakan serta menghasilkan *vector embeddings*.
3. **Pengecekan Duplikasi**, Backend Express.js melakukan kueri ke PostgreSQL (`pgvector`) menggunakan koordinat terdekat dan kemiripan *embedding* untuk memastikan apakah masalah tersebut sudah pernah dilaporkan.
4. **Pembuatan Perintah Kerja (*Work Order*)**, Jika laporan unik dan valid, perintah kerja berprioritas akan dibuat dan langsung diteruskan ke **Dasbor Administratif** untuk penugasan tim lapangan.

## 🛠️ Tech Stack

* **Frontend:**
    ![Next.js](https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-grey?style=for-the-badge&logo=tailwind-css&logoColor=38B2AC)
* **Backend:** Node.js & Express.js
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white) ![Express.js](https://img.shields.io/badge/express.js-000000?style=for-the-badge&logo=express&logoColor=white)
* **Database:**
![Postgresql](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)
* **AI & Pemrosesan Multimodal:** 
![Gemini](https://img.shields.io/badge/Gemini-black?style=for-the-badge&logo=google-gemini)

## 📈 Dampak yang Diharapkan

Berdasarkan pengukuran menggunakan simulasi data operasional perkotaan, AUMS menargetkan pencapaian berikut

* **⏱️ Pemilahan >99% Lebih Cepat**, Memangkas waktu verifikasi dan pemilahan laporan dari **3 hari kerja** menjadi **kurang dari 2 menit**.
* **📉 Pengurangan Beban Duplikasi >50%**, Mengurangi pemrosesan tiket duplikat secara manual hingga lebih dari setengahnya.

## 👥 Tim Engineerizz

### Universitas Indonesia (UI)

| Peran | Nama |
| :--- | :--- |
| **Ketua Tim** | Naziehan Labieb |
| **Anggota** | Dimar Ilham Tamara |
| **Anggota** | Raihan Muhammad Nafis Al-Kautsar |
| **Anggota** | Naufal Rahman |

<a href="https://github.com/ziehan/engineerizz-aums/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ziehan/engineerizz-aums&max=101" />
</a>

## 📚 Referensi

1. **PermenPAN-RB No. 62/2018** tentang Pedoman Sistem Pengaduan Pelayanan Publik Nasional (SLA verifikasi 3 hari SP4N-LAPOR).
2. **Jakarta Smart City (JSC)** Riset Deteksi Laporan Duplikat dan Laporan Infrastruktur Nasional SP4N-LAPOR.