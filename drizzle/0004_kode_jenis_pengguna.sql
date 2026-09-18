-- Kode jenis buatan pengguna dipindah ke ruang UMxx/UKxx supaya tidak bentrok dengan
-- jenis bawaan yang ditambahkan pembaruan (PM10 Iuran Tahunan, PM11, PM12). Setelah ini
-- seed saat start menyisipkan bawaan yang sempat terlewat.
UPDATE `jenis` SET `kode` = 'U' || substr(`kode`, 2) WHERE `bawaan` = 0 AND `kode` GLOB 'P[MK][0-9][0-9]*';
