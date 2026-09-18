# Spesifikasi Pembaruan 2 — Keluarga, Status Meninggal, dan Nominal Iuran

> **Untuk AI/agen (Claude):** dokumen ini adalah **tambahan** di atas
> `STM_KEUANGAN_SPEC.md`. Dipakai untuk memperbarui repo **`stm-management-app`**
> agar setara dengan `stm-management-lite`, lalu melangkah lebih jauh.
>
> **Wajib dibaca lebih dulu, berurutan:**
> 1. `STM_KEUANGAN_SPEC.md` — spesifikasi dasar; seluruh prinsip P1–P8 tetap berlaku
> 2. `STM_KEUANGAN_BUILD.md` — cara kerja per fase dan "bukti selesai"
> 3. Dokumen ini
>
> Dokumen ini punya tiga bagian dengan status berbeda:
>
> | Bagian | Isi | Status di `stm-management-lite` |
> | --- | --- | --- |
> | **A** | Anggota keluarga, status meninggal, sakelar jenis uang | **Sudah dibangun & teruji** — replikasi persis |
> | **B** | Nominal & periode per jenis uang | **Belum ada** — bangun baru |
> | **C** | Anggota pecah dari orang tua | **Belum ada** — disarankan, bukan wajib |
> | **E** | Jebakan yang sudah ditemukan | Pengetahuan yang harus dibawa |
>
> Bagian A ditulis sebagai spesifikasi, bukan sebagai catatan perubahan, supaya bisa
> dibangun tanpa membuka repo `lite`. Bila ragu, repo `lite` adalah acuan hidup.

---

## 0. Kenapa pembaruan ini ada

STM mengumpulkan iuran dan menyalurkan santunan. Tiga hal ini muncul begitu
aplikasi dipakai sungguhan:

1. **Santunan duka dibayarkan atas orang tertentu** — sering bukan anggotanya
   sendiri, melainkan istri, anak, atau orang tua yang ditanggung. Tanpa daftar
   tanggungan, pemeriksa tidak bisa mencocokkan santunan dengan surat kematian.
2. **Status meninggal harus tercatat dan tidak boleh salah** — orang yang sudah
   menerima santunan tidak boleh menerima santunan kedua, dan pembatalan catatan
   harus mengembalikan statusnya seperti semula.
3. **Nominal iuran itu tetap** — iuran wajib bulanan, iuran tahunan, uang pangkal
   anggota baru, dan uang pangkal anggota yang pecah dari orang tua masing-masing
   punya angka sendiri yang ditetapkan pengurus. Bendahara tidak boleh mengetiknya
   ulang setiap kali (salah nol adalah kesalahan paling sering — P5).

---

## Bagian A — Anggota Keluarga & Status Meninggal (replikasi)

### A1. Model data

#### `keuangan_anggota_keluarga` (tabel baru)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | id | |
| `anggota_id` | foreignId → `keuangan_anggota` | `cascadeOnDelete` |
| `nama` | string(100) | |
| `hubungan` | string(30) | Salah satu dari daftar tetap di bawah |
| `tanggal_lahir` | date nullable | |
| `status` | enum(`aktif`,`meninggal`) default `aktif` | |
| `tanggal_meninggal` | date nullable | |
| `ditandai_oleh_transaksi_id` | unsignedBigInteger nullable | **Tanpa FK** — lihat A3 |
| `keterangan` | string(255) nullable | |
| `deleted_at`, timestamps | | |

Index: `['anggota_id', 'status']`, `['ditandai_oleh_transaksi_id']`.

Daftar hubungan (konstanta di model, dipakai form & validasi):
`Istri`, `Suami`, `Anak`, `Orang Tua`, `Mertua`, `Saudara`, `Lainnya`.

#### Kolom tambahan pada tabel yang sudah ada

| Tabel | Kolom | Tipe | Keterangan |
| --- | --- | --- | --- |
| `keuangan_anggota` | `status` | enum(`aktif`,`meninggal`) default `aktif` | **Terpisah dari `aktif`** — lihat catatan |
| `keuangan_anggota` | `tanggal_meninggal` | date nullable | |
| `keuangan_anggota` | `ditandai_oleh_transaksi_id` | unsignedBigInteger nullable, index | |
| `keuangan_tipe` | `menandai_meninggal` | boolean default `false` | Sakelar — lihat A4 |
| `keuangan_transaksi` | `anggota_keluarga_id` | foreignId nullable → `keuangan_anggota_keluarga`, `nullOnDelete` | Siapa yang meninggal; kosong = anggotanya sendiri |

**`aktif` dan `status` sengaja dua kolom.** `aktif` = masih tercatat sebagai
anggota yang beriuran; `status` = masih hidup atau sudah meninggal. Seorang janda
bisa meneruskan keanggotaan setelah suaminya meninggal — kedua keadaan itu tidak
boleh digabung.

**Semua cast tanggal wajib `date:Y-m-d`**, bukan `date` polos. Lihat E1.

### A2. Route, permission, halaman

Bersarang di bawah anggota, hanya empat aksi (tambah/ubah lewat modal):

```
GET    admin/anggota/{anggota}/keluarga             admin.anggota.keluarga.index
POST   admin/anggota/{anggota}/keluarga             admin.anggota.keluarga.store
PUT    admin/anggota/{anggota}/keluarga/{keluarga}  admin.anggota.keluarga.update
DELETE admin/anggota/{anggota}/keluarga/{keluarga}  admin.anggota.keluarga.destroy
```

**Tidak ada permission baru.** Daftar keluarga adalah bagian dari data anggota,
jadi memakai `anggota-list/create/edit/delete` yang sudah ada. Bendahara boleh
mengelola tanggungan; Pengawas tidak.

Halaman `Anggota/Keluarga.tsx`: kepala berisi nama anggota (dan badge *Meninggal
dunia* bila statusnya begitu), tombol **Tambah Tanggungan**, lalu satu kartu per
tanggungan berisi nama, hubungan, tanggal lahir, badge status, dan — bila
`ditandai_oleh_transaksi_id` terisi — teks kecil *"dari catatan santunan"*.

Pada `Anggota/List.tsx` tambah kolom **Keluarga** berisi tombol
`Keluarga (n)` (`withCount('keluarga')`) menuju halaman di atas, dan pada kolom
Status tampilkan badge *Meninggal* di samping badge Aktif/Tidak aktif.

Validasi (`AnggotaKeluargaRequest`), seluruh pesan wajib persis:

| Aturan | Pesan |
| --- | --- |
| `nama` required | Nama anggota keluarga belum diisi. |
| `nama` max 100 | Nama terlalu panjang. Persingkat sampai 100 huruf. |
| `hubungan` required | Pilih dulu hubungannya dengan anggota. |
| `hubungan` in daftar | Hubungan yang dipilih tidak dikenali. Pilih ulang dari daftar. |
| `tanggal_lahir` date | Tanggal lahir belum terbaca. Pilih tanggalnya dari kalender. |
| `tanggal_lahir` ≤ hari ini | Tanggal lahir tidak boleh melebihi hari ini. |
| `status` required/in | Pilih dulu orang ini masih hidup atau sudah meninggal. |
| `tanggal_meninggal` required_if status=meninggal | Isi tanggal meninggalnya. |
| `tanggal_meninggal` date | Tanggal meninggal belum terbaca. Pilih tanggalnya dari kalender. |
| `tanggal_meninggal` ≤ hari ini | Tanggal meninggal tidak boleh melebihi hari ini. |
| `keterangan` max 255 | Keterangan terlalu panjang. Persingkat sampai 255 huruf. |

`authorize()` pada Form Request **wajib** memeriksa permission — lihat E4.

Bila `status` diubah lewat form ini, `ditandai_oleh_transaksi_id` **dikosongkan**:
status yang diisi manual menjadi status manual dan tidak lagi boleh dibatalkan
oleh penghapusan catatan santunan mana pun.

### A3. Penandaan meninggal otomatis — `PenandaMeninggalService`

Satu-satunya tempat aturan ini hidup. Dipanggil dari `TransaksiObserver`, bukan
dari controller, supaya perubahan lewat jalur apa pun tetap ditangani.

```php
public function terapkan(Transaksi $t): void;   // created, restored
public function batalkan(Transaksi $t): void;   // deleted, forceDeleted
public function segarkan(Transaksi $t): void;   // updated: batalkan() lalu terapkan()
```

**Sasaran** ditentukan dari catatan: bila `anggota_keluarga_id` terisi → baris
keluarga itu; bila kosong tapi `anggota_id` terisi → anggotanya sendiri; bila
keduanya kosong (nama diketik lepas) → tidak ada yang ditandai, catatan tetap
tersimpan seperti biasa.

**Penandaan hanya berlaku bila `tipe.menandai_meninggal = true`.** Yang menentukan
sakelar pada jenisnya, **bukan nama jenisnya** — mengganti nama "Santunan Duka"
tidak boleh mematikan otomatisasi.

`terapkan()`: bila sasaran masih `aktif` → set `status = meninggal`,
`tanggal_meninggal = tanggal catatan`, `ditandai_oleh_transaksi_id = id catatan`.
Bila sasaran **sudah** `meninggal` → **tidak disentuh sama sekali** (penandanya
tidak diambil alih). Simpan dengan `saveQuietly()`.

`batalkan()`: cari **semua** baris (anggota maupun keluarga) yang
`ditandai_oleh_transaksi_id = id catatan ini` — **bukan** dari sasaran catatan
saat ini, karena pada perubahan sasarannya bisa sudah dipindah — lalu kembalikan
ke `aktif`, kosongkan `tanggal_meninggal` dan penandanya.

Inilah yang membuat pembatalan **mengembalikan keadaan sebelumnya**, bukan sekadar
menyetel ulang ke aktif:

| Keadaan sebelum | Santunan dicatat | Santunan dihapus |
| --- | --- | --- |
| Aktif | → meninggal, ditandai catatan itu | → **kembali aktif** |
| Sudah meninggal (manual) | tidak disentuh | **tetap meninggal** |
| Sudah meninggal (santunan lain) | tidak disentuh | tetap meninggal |
| Sasaran dipindah A → B | A kembali aktif, B meninggal | — |
| Jenis diganti ke bukan penanda | sasaran lama kembali aktif | — |

`ditandai_oleh_transaksi_id` **sengaja tanpa foreign key**: penandanya harus
tetap terbaca walau catatannya dihapus permanen. Karena itu observer juga wajib
menangani `forceDeleted` untuk mencabutnya.

**Kolom `anggota_keluarga_id` wajib masuk daftar kolom yang dipantau observer**
(`KOLOM_DIPANTAU`). Tanpa itu, mengubah hanya sasarannya tidak memicu
`updated()` dan `segarkan()` tidak pernah jalan — bug nyata yang pernah terjadi.

### A4. Sakelar di master jenis uang

Kolom `menandai_meninggal` pada `keuangan_tipe`. Seeder menyalakannya **hanya**
untuk `PK01 — Santunan Duka / Kemalangan`.

Di modal Jenis Uang, sakelar ini hanya tampil bila `jenis = keluar`, sebagai
`SelectInput` "Menandai orang meninggal dunia?" (Tidak / Ya) dalam kotak kuning
berpenjelasan. Hanya pemegang `tipe-transaksi-edit` (Ketua) yang bisa mengubahnya
— bendahara tidak bisa menyalakan/mematikan otomatisasi ini.

**Ditegakkan di backend:** `menandai_meninggal = jenis === 'keluar' && boolean('menandai_meninggal')`.
Jenis **uang masuk** dipaksa `false` walau sakelarnya dikirim paksa lewat
permintaan yang dikarang. Validasinya `nullable|boolean` — bukan `required` —
supaya form lain yang tidak mengirimnya tidak ditolak.

### A5. Form catat & tampilan

**Form catat** (`Transaksi/Form.tsx`): begitu tipe ber-`menandai_meninggal`
terpilih **dan** nama yang dipilih adalah anggota terdaftar, muncul kotak kuning
**"Siapa yang meninggal?"** — `SelectInput` berisi tanggungan anggota itu;
placeholder-nya *"[nama anggota] (anggota sendiri)"* (nilai kosong = anggotanya
sendiri). Di bawahnya kalimat penegas:

> Menyimpan catatan ini akan menandai **[nama]** meninggal dunia. Menghapus
> catatannya akan mengembalikan statusnya seperti semula.

Bila sasaran yang dipilih **sudah** bertanda meninggal, kalimatnya berganti jadi
peringatan santunan ganda:

> **[nama]** sudah bertanda meninggal dunia. Periksa dulu, jangan sampai
> santunannya terbayar dua kali.

Bila tipe penanda dipilih tapi namanya diketik lepas (bukan anggota terdaftar),
tampilkan kalimat abu-abu: *"Nama di atas belum terdaftar sebagai anggota, jadi
tidak ada status yang bisa ditandai. Catatan kasnya tetap tersimpan seperti biasa."*

Saat jenis berganti atau anggota berganti, `anggota_keluarga_id` **dikosongkan**
— tanggungan milik anggota lama tidak boleh terbawa.

Daftar tipe dan daftar anggota yang dikirim ke form membawa `menandai_meninggal`
dan `keluarga:id,anggota_id,nama,hubungan,status` (eager load), supaya pilihan
disusun di layar tanpa permintaan tambahan.

**Daftar catatan, rincian, dan PDF Buku Kas** menyebut siapa yang meninggal —
nama di kolom Nama adalah **penerima uang**, belum tentu yang meninggal:

- Daftar: baris kedua di bawah Nama, `Meninggal: Ani Santoso · Istri`
  (atau nama anggotanya sendiri bila tanggungan kosong).
- Rincian: baris **Yang meninggal** — *Ani Santoso · Istri dari Budi Santoso*,
  atau *Budi Santoso · anggota sendiri*. Hanya muncul pada jenis ber-penanda.
- PDF Buku Kas: baris kecil di bawah Keterangan, bukan kolom baru (kolom
  tersendiri kosong di hampir semua baris dan memakan lebar A4 lanskap).

Semua sumber daftar (index, laporan, 10 catatan terakhir di beranda) wajib
eager-load `tipe:…,menandai_meninggal` dan `anggotaKeluarga:id,nama,hubungan`.

### A6. Validasi pada `TransaksiRequest`

| Aturan | Pesan |
| --- | --- |
| `anggota_keluarga_id` integer/exists | Anggota keluarga yang dipilih tidak dikenali. Pilih ulang dari daftar. |
| `anggota_keluarga_id` harus milik `anggota_id` (cek di `after()`) | Anggota keluarga itu bukan tanggungan nama yang dipilih. Pilih ulang dari daftar. |

Pemeriksaan kepemilikan **wajib di backend**: id yang dikarang bisa menandai
orang dari keluarga lain meninggal — akibat yang jauh lebih berat daripada salah
catat, karena statusnya ikut terbawa ke daftar santunan berikutnya.

### A7. Jejak audit

Potret di `keuangan_log` mendapat kunci baru `yang_meninggal` (nama tanggungan,
disalin sebagai teks). `AuditController::LABEL` memetakannya ke *"Yang
meninggal"*; ringkasan log pada PDF Lembar Audit memakai label yang sama, bukan
kunci mentah.

### A8. Test yang wajib ada (`PenandaMeninggalTest`, 15 test di `lite`)

- santunan untuk tanggungan menandainya meninggal; anggotanya sendiri tidak
- santunan tanpa memilih tanggungan menandai anggotanya sendiri
- menghapus santunan mengembalikan status, tanggal, dan penanda ke kosong
- memulihkan santunan menandai ulang
- **status yang diisi manual tidak ikut dibatalkan** (inti "kembali seperti sebelumnya")
- memindahkan sasaran membebaskan orang yang lama
- mengubah jenis ke bukan penanda membatalkan penandaan
- jenis tanpa sakelar tidak menandai siapa pun
- tanggungan keluarga lain ditolak validasi
- hanya PK01 yang menandai meninggal secara bawaan
- jenis uang masuk tidak bisa diberi penanda walau dipaksa
- daftar & rincian menyertakan orang yang meninggal; catatan biasa tidak
- bendahara bisa mengelola tanggungan; pengawas ditolak

---

## Bagian B — Nominal & Periode per Jenis Uang (baru)

### B1. Tujuan

Pengurus menetapkan angka iuran satu kali di Master Data; bendahara tinggal
memilih jenisnya dan jumlahnya terisi sendiri. Angka yang ditetapkan pengurus
tidak bisa salah ketik oleh bendahara.

Empat kasus yang harus tertangani, masing-masing dengan nominal **berbeda**:

| Kasus | Sifat |
| --- | --- |
| Iuran wajib | tetap, **per bulan** |
| Iuran tahunan | tetap, **per tahun** |
| Uang pangkal anggota baru | tetap, **sekali** |
| Uang pangkal anggota pecah dari orang tua | tetap, **sekali**, angkanya **berbeda** dari anggota baru |

### B2. Model data — kolom tambahan `keuangan_tipe`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `nominal_bawaan` | decimal(18,2) nullable | Kosong = bendahara mengetik sendiri (perilaku lama) |
| `nominal_dikunci` | boolean default `false` | `true` = jumlah tidak bisa diubah di form catat |
| `periode` | enum(`bebas`,`sekali`,`bulanan`,`tahunan`) default `bebas` | Dipakai label & deteksi duplikat (B4) |

Berlaku untuk **uang masuk maupun uang keluar** — santunan duka pun umumnya
punya nominal tetap yang ditetapkan rapat anggota.

**Nominal disalin ke `keuangan_transaksi.jumlah` saat menyimpan.** Mengubah
`nominal_bawaan` di kemudian hari **tidak** mengubah catatan lama — tulis ini
sebagai teks kecil di modal Jenis Uang.

### B3. Seeder

Dua jenis uang masuk baru, ditambahkan ke `KeuanganTipeSeeder` (idempoten,
`updateOrCreate` by `kode`, `bawaan = true`):

| Kode | Nama | Periode |
| --- | --- | --- |
| PM10 | Iuran Tahunan | `tahunan` |
| PM11 | Uang Pangkal Anggota Pecah dari Orang Tua | `sekali` |

Periode untuk jenis yang sudah ada:

| Kode | Periode |
| --- | --- |
| PM01 Iuran Wajib Anggota | `bulanan` |
| PM03 Uang Pangkal Anggota Baru | `sekali` |
| PK01 Santunan Duka / Kemalangan | `sekali` |
| lainnya | `bebas` |

**`nominal_bawaan` dan `nominal_dikunci` tidak pernah ditulis seeder** — keduanya
milik pengurus, diisi lewat Master Data. Seeder hanya menulis `periode` (itu sifat
struktural jenisnya). Aplikasi tetap langsung bisa dipakai tanpa nominal terisi
(P1): kolom jumlah cukup kembali ke perilaku lama.

Konsekuensi untuk test idempotensi: jumlah jenis bawaan menjadi **21**
(11 masuk, 10 keluar).

### B4. Aturan bisnis

**Prefill.** Saat tipe dengan `nominal_bawaan` terisi dipilih di form catat,
kolom Jumlah Uang terisi otomatis dan terbilangnya langsung tampil. Bila
`nominal_dikunci = false`, bendahara boleh mengubahnya. Bila tipe berganti,
jumlah diisi ulang dari tipe baru (atau dikosongkan bila tipe baru tanpa nominal).

**Kunci nominal.** Bila `nominal_dikunci = true`:

- Kolom Jumlah Uang `readOnly`, dengan hint *"Nominal ditetapkan pengurus.
  Ubah di Master Data bila memang berubah."*
- **Backend menolak** `jumlah ≠ nominal_bawaan` dengan pesan:
  *"Jumlah untuk [nama jenis] sudah ditetapkan Rp X. Bila angkanya memang
  berubah, minta Ketua mengubahnya di Master Data."*
  Ditegakkan di `TransaksiRequest::after()` — form yang `readOnly` hanya
  menyembunyikan aksi, tidak menghalangi permintaan yang dikirim langsung.
- Pengecualian: pemegang `keuangan-setting-edit` **tidak** dikecualikan. Kunci
  berlaku untuk semua saat mencatat; Ketua mengubah nominalnya di tempat yang
  benar, bukan menembus kunci di form catat.

**Deteksi duplikat memakai periode** — memperluas §6.2 SPEC dasar:

| `periode` | Dianggap duplikat bila ada catatan lain dengan |
| --- | --- |
| `bebas` | tanggal + tipe + jumlah sama (aturan lama) |
| `bulanan` | anggota sama + tipe sama + **bulan & tahun** sama |
| `tahunan` | anggota sama + tipe sama + **tahun** sama |
| `sekali` | anggota sama + tipe sama, **kapan pun** |

Hanya berlaku bila `anggota_id` terisi; nama lepas memakai aturan lama. Tetap
**dialog, bukan penolakan** — tombol *Tetap Simpan* dan *Batal, Saya Periksa
Dulu*, dengan kalimat yang menyebut periodenya:

> Sepertinya **Budi Santoso** sudah membayar **Iuran Wajib Anggota** untuk
> **September 2026** (nomor bukti KM-2026-0031). Tetap simpan?

Untuk `sekali`: *"…sudah pernah membayar Uang Pangkal Anggota Baru pada
12 Januari 2026 (KM-2026-0004). Uang pangkal biasanya hanya sekali. Tetap simpan?"*

### B5. Master Data — modal Jenis Uang

Tiga field baru, berlaku untuk masuk maupun keluar:

1. **Nominal (boleh dikosongkan)** — `TextInputMask` prefix `Rp`, `inputMode="numeric"`,
   terbilang di bawahnya (P5).
2. **Kunci nominal?** — `SelectInput` Tidak / Ya, hint: *"Ya berarti bendahara
   tidak bisa mengubah jumlahnya saat mencatat."* Hanya tampil bila nominal terisi.
3. **Periode** — `SelectInput`: Bebas / Sekali / Bulanan / Tahunan, hint:
   *"Dipakai untuk mengingatkan bila anggota yang sama dicatat dua kali dalam
   periode yang sama."*

Teks kecil di bawah ketiganya: *"Mengubah nominal tidak mengubah catatan yang
sudah ada."*

Daftar Jenis Uang mendapat dua kolom: **Nominal** (`Rp 50.000` + badge kecil
*terkunci* bila dikunci, atau `-`) dan **Periode**.

Validasi (`TipeTransaksiRequest`):

| Aturan | Pesan |
| --- | --- |
| `nominal_bawaan` nullable, numeric, > 0, ≤ 999.999.999.999 | Nominal hanya boleh berisi angka. / Nominal harus lebih dari nol. / Nominal terlalu besar. Coba periksa lagi banyaknya angka nol. |
| `nominal_dikunci` nullable, boolean | Pilihan kunci nominal tidak terbaca. Pilih ulang dari daftar. |
| `nominal_dikunci` = true **tanpa** `nominal_bawaan` (cek di `after()`) | Nominal belum diisi, jadi belum ada yang bisa dikunci. |
| `periode` nullable, in daftar | Periode tidak dikenali. Pilih ulang dari daftar. |

Backend memaksa `nominal_dikunci = false` bila `nominal_bawaan` kosong.

### B6. Dropdown "Untuk apa uangnya?" di form catat

Label opsi menyertakan nominal dan periode bila ada, supaya bendahara tahu
sebelum memilih:

```
Iuran Wajib Anggota · Rp 50.000 / bulan
Iuran Tahunan · Rp 120.000 / tahun
Uang Pangkal Anggota Baru · Rp 250.000
Uang Pangkal Anggota Pecah dari Orang Tua · Rp 150.000
Iuran Sukarela
```

Format: `nama` + (` · Rp X` bila nominal terisi) + (` / bulan` | ` / tahun` bila
periode bulanan/tahunan). Nominal penuh dengan pemisah ribuan, tidak disingkat (P5).

### B7. Test yang wajib ada (`NominalTipeTest`)

- memilih tipe bernominal mengisi jumlah (diuji lewat props/respons, bukan UI)
- nominal terkunci: `jumlah ≠ nominal` ditolak dengan pesan yang benar
- nominal tidak terkunci: `jumlah` berbeda tetap diterima
- mengubah nominal di master **tidak** mengubah `jumlah` catatan lama
- duplikat `bulanan`: anggota + tipe + bulan sama → dialog; bulan berbeda → lolos
- duplikat `tahunan`: tahun sama → dialog; tahun berbeda → lolos
- duplikat `sekali`: pernah ada → dialog
- duplikat pada nama lepas memakai aturan lama
- `nominal_dikunci` dipaksa false bila nominal kosong
- seeder: PM10 & PM11 ada, periode PM01/PM03/PK01 benar, nominal tetap null
  setelah seed ulang (**nominal yang diisi Ketua tidak boleh tertimpa seeder**)
- test yang menghitung `tipe_list` di form catat (di `lite`: `TransaksiCrudTest`, sekarang 19) naik ke 21

---

## Bagian C — Anggota Pecah dari Orang Tua (disarankan)

Kasus nyata: seorang anak yang selama ini tercatat sebagai tanggungan (A1)
menikah dan menjadi anggota sendiri. Uang pangkalnya berbeda dari anggota baru
dari luar (PM11 vs PM03). Tanpa alur ini, bendahara harus menghapus tanggungan
lalu membuat anggota baru secara manual, dan hubungan asalnya hilang.

### C1. Model data

| Tabel | Kolom | Keterangan |
| --- | --- | --- |
| `keuangan_anggota` | `anggota_asal_id` foreignId nullable → `keuangan_anggota`, `nullOnDelete` | Dari keluarga siapa ia pecah |
| `keuangan_anggota` | `tanggal_bergabung` date nullable | Diisi saat pecah; untuk anggota lama boleh kosong |
| `keuangan_anggota_keluarga` | `pindah_ke_anggota_id` unsignedBigInteger nullable | Diisi saat baris ini dijadikan anggota sendiri |

### C2. Alur

Di halaman Keluarga, setiap tanggungan berstatus `aktif` mendapat tombol
**Jadikan Anggota Sendiri**. Dialog konfirmasi berisi (P6):

> **Jadikan Cahyo Santoso anggota sendiri?**
> Anak dari Budi Santoso
> Ia akan punya iuran dan tanggungan sendiri, dan tidak lagi ditanggung
> keluarga Budi Santoso.

Saat dikonfirmasi, dalam satu `DB::transaction`:

1. Buat `Anggota` baru: `nama` disalin, `anggota_asal_id = anggota induk`,
   `tanggal_bergabung = hari ini`, `aktif = true`, `status = aktif`.
2. Pada baris keluarga: isi `pindah_ke_anggota_id`, lalu **soft delete**.
   Riwayatnya tetap terbaca lewat `withTrashed()`.
3. Arahkan ke form catat dengan
   `?jenis=masuk&tipe=PM11&anggota=<id baru>` — form membaca ketiga parameter
   itu sebagai nilai awal, sehingga bendahara tinggal menekan Simpan untuk
   mencatat uang pangkal pecahnya (nominal terisi otomatis dari B4).

Langkah 3 adalah **pengarahan**, bukan pencatatan otomatis: uang pangkal
belum tentu dibayar hari itu juga.

### C3. Yang ditampilkan

- Halaman Keluarga anggota induk: tanggungan yang sudah pecah tampil redup di
  bagian bawah dengan badge *Sudah jadi anggota sendiri* dan tautan ke
  anggotanya. Ambil lewat `withTrashed()->whereNotNull('pindah_ke_anggota_id')`.
- Halaman Keluarga anggota baru: kepala menampilkan *"Pecah dari keluarga
  Budi Santoso, bergabung 18 September 2026"*.
- Daftar Anggota: kolom Status mendapat badge kecil *Pecah KK* bila
  `anggota_asal_id` terisi.

### C4. Test

- pecah membuat anggota baru dengan asal & tanggal yang benar
- baris keluarga ter-soft-delete dengan `pindah_ke_anggota_id` terisi
- gagal di tengah (mis. nama kosong) tidak menyisakan anggota setengah jadi
- tanggungan berstatus `meninggal` tidak bisa dipecah (tombol tidak tampil
  **dan** backend menolak)
- form catat menerima `?tipe=` & `?anggota=` sebagai nilai awal

---

## Bagian D — Urutan pengerjaan & bukti selesai

Satu bagian per sesi, mengikuti disiplin `STM_KEUANGAN_BUILD.md`.

| Sesi | Isi | Bukti selesai |
| --- | --- | --- |
| **D1** | Bagian A lengkap: migrasi, model, service, observer, request, controller, tiga halaman, seeder PK01, audit | `PenandaMeninggalTest` 15 hijau; lewat UI: catat santunan untuk tanggungan → status berubah; hapus → kembali; status manual tidak terpengaruh |
| **D2** | Bagian B: kolom, seeder, validasi, prefill & kunci, duplikat per periode, modal & daftar | `NominalTipeTest` hijau; lewat UI: Ketua isi nominal PM01 = 50.000 & kunci → bendahara pilih PM01, jumlah terisi & tidak bisa diubah; catat anggota yang sama dua kali sebulan → dialog menyebut bulannya |
| **D3** | Bagian C | pecah satu tanggungan → anggota baru muncul, tanggungan hilang dari induk, form catat terbuka dengan PM11 & nominalnya |

Setiap sesi diakhiri `php artisan test` hijau, Pint bersih pada berkas yang
disentuh, `npm run build` bersih, dan pemeriksaan di lebar 360px.

---

## Bagian E — Jebakan yang sudah ditemukan di `stm-management-lite`

Semuanya pernah benar-benar terjadi. **Bawa ke repo baru sejak awal**, jangan
tunggu menabraknya lagi.

| # | Jebakan | Akibat bila diabaikan | Pencegahan |
| --- | --- | --- | --- |
| E1 | Cast `'date'` polos diserialkan ke browser sebagai UTC (`2026-01-01` → `2025-12-31T17:00:00Z`) | Layar salah sehari; **menyimpan ulang halaman Pengaturan memundurkan tanggal tutup buku satu hari, berulang** | Semua kolom tanggal memakai `'date:Y-m-d'` |
| E2 | Soft delete adalah `UPDATE`, bukan `DELETE` | `restrictOnDelete` **tidak pernah menyala** — jenis yang dipakai ratusan catatan bisa ter-soft-delete diam-diam | Periksa pemakaian eksplisit di controller sebelum `delete()`; FK hanya jaring pengaman |
| E3 | `restore()` memanggil `save()` → event `updated` ikut menyala | Setiap pemulihan menulis **dua** log: `ubah` palsu + `pulihkan` | Di observer, abaikan `updated` yang tidak menyentuh kolom terpantau (`wasChanged(KOLOM_DIPANTAU)`) |
| E4 | Form Request divalidasi **sebelum** `checkPermission()` di controller | Pengguna tanpa izin menerima daftar pesan validasi, bukan 403 — bocor bentuk data | `authorize()` di setiap Form Request memeriksa permission; controller tetap sebagai lapis kedua |
| E5 | `Route::resource('anggota')` menghasilkan parameter `{anggotum}` | Route model binding `Anggota $anggota` **tidak pernah terisi** | `->parameters(['anggota' => 'anggota'])` |
| E6 | `EnsureFrontendRequestsAreStateful` (Sanctum) di grup middleware **web** | Begitu `Referer` cocok dengan `sanctum.stateful` (mis. `APP_URL` = alamat server sungguhan), `EncryptCookies` + `StartSession` berjalan **dua kali** → cookie sesi login tertimpa sesi kosong → **diminta login lagi tiap pindah halaman**. Versi web lolos hanya karena `APP_URL` kebetulan tidak cocok | **Jangan pasang middleware itu di grup web** pada repo baru. Ia untuk grup `api`. Bila `routes/api.php` di-require dari `web.php`, ia sama sekali tidak dibutuhkan |
| E7 | `GeneralNotification` menyiarkan lewat Reverb; `phpunit.xml` memakai `QUEUE_CONNECTION=sync` | Setiap test yang menghapus catatan gagal 500 karena Reverb tidak hidup | `BROADCAST_CONNECTION=null` di `phpunit.xml` |
| E8 | Pint pada boilerplate warisan sudah kotor (~60 berkas) | `pint --test` global merah bukan karena pekerjaan sendiri | Jalankan Pint **hanya pada path yang disentuh**; jangan `pint app/Http` seluruhnya |
| E9 | `access_permissions` di `AppServiceProvider` memakai guard bawaan (`web`) | Dikira permission admin tak pernah sampai ke props | **Bukan bug**: middleware `auth:admin` memanggil `shouldUse('admin')` untuk sisa request. Jangan "memperbaiki" ini |
| E10 | `SANCTUM_STATEFUL_DOMAINS`, `sanctum.stateful` menyertakan `APP_URL` host:port secara otomatis | Menyetel `APP_URL` **dengan benar** justru yang mengaktifkan E6 | Lihat E6 |

---

## Bagian F — Yang sengaja tidak masuk

- **Tunggakan iuran** (siapa yang belum bayar bulan ini). Data untuk itu sudah
  ada setelah Bagian B (`periode` + `anggota_id`), tapi tampilannya butuh
  keputusan tersendiri: kapan seseorang dianggap menunggak, bagaimana anggota
  baru di tengah tahun dihitung. Buat spesifikasi terpisah.
- **Pembayaran sekaligus beberapa bulan** (bayar Januari–Maret dalam satu
  kuitansi). Sekarang dicatat sebagai tiga catatan atau satu catatan dengan
  keterangan; belum perlu kolom `periode_mulai`/`periode_sampai`.
- **Status anggota selain `aktif`/`meninggal`** (mis. keluar, pindah). Belum ada
  permintaan; jangan menambah enum yang belum dipakai.
