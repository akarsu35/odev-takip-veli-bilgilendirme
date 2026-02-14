<div align="center">

# 📚 Ödev Takip & Veli Bilgilendirme Sistemi

<p align="center">
  <strong>Öğretmenler için akıllı ödev takip ve otomatik veli bilgilendirme platformu</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.1-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Zustand-State-orange?style=for-the-badge" alt="Zustand">
  <img src="https://img.shields.io/badge/Prisma-6.19-2D3748?style=for-the-badge&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/Supabase-Auth-green?style=for-the-badge&logo=supabase" alt="Supabase">
</p>

</div>

---

## ✨ Özellikler

### 📋 Ödev Yönetimi

- **Ödev Oluşturma**: Sınıf veya öğrenci bazlı ödev atama.
- **Durum Takibi**: Ödevlerin tamamlanma durumunu izleme (Yapıldı, Eksik, Yapılmadı, Gelmedi, Getirmedi).
- **Toplu İşlemler**: Birden fazla öğrenciyi aynı anda işaretleme ve toplu bildirim.
- **Akıllı Analiz**: Ödev bazlı başarı ve katılım istatistikleri.

### 👨‍🎓 Öğrenci Yönetimi

- **Öğrenci Ekleme**: Tek tek veya Excel ile toplu öğrenci ekleme.
- **Gelişim Takibi**: Her öğrencinin tüm ödev geçmişini gösteren detaylı gelişim sayfası.
- **Hızlı Arama**: İsim, sınıf veya veli adına göre anlık filtreleme.

### 📱 Otomatik Veli Bilgilendirme

- **WhatsApp Entegrasyonu**: Tek tıkla kişiye özel mesaj gönderme.
- **Yapay Zeka (AI) Desteği**: Gemini AI ile ödev açıklamaları ve veli mesajları üretme.
- **Mesaj Geçmişi**: Gönderilen tüm mesajların kaydını tutma ve öğrenci bazlı listeleme.
- **Kişiselleştirilmiş İmzalar**: Öğretmen branş ve okul bilgilerini otomatik ekleme.

---

## 🛠️ Teknolojiler

| Teknoloji                   | Açıklama                                       |
| :-------------------------- | :--------------------------------------------- |
| **Next.js 15 (App Router)** | Modern full-stack Web Framework                |
| **React 19**                | Modern UI kütüphanesi                          |
| **Zustand**                 | Hafif ve performanslı state yönetimi           |
| **Prisma & PostgreSQL**     | Tip güvenli veritabanı erişimi (Supabase/Neon) |
| **Tailwind CSS**            | Modern ve responsive tasarım                   |
| **Supabase Auth**           | Güvenli kimlik doğrulama sistemi               |
| **Google Gemini AI**        | Yapay zeka destekli içerik üretimi             |

---

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+
- npm veya yarn
- Supabase hesabı

### 1. Projeyi Klonlayın

```bash
git clone https://github.com/akarsu35/odev-takip-veli-bilgilendirme.git
cd odev-takip-veli-bilgilendirme
```

### 2. Bağımlılıkları Yükleyin

```bash
npm install
```

### 3. Ortam Değişkenlerini Ayarlayın

`.env` dosyasını oluşturun ve aşağıdaki değişkenleri ekleyin:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_url

# Gemini AI (Opsiyonel)
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Veritabanını Hazırlayın

```bash
npx prisma db push
```

### 5. Uygulamayı Başlatın

```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

---

## 📖 Kullanım

### İlk Kullanım

1. Google hesabınızla veya e-posta ile giriş yapın.
2. Profil bilgilerinizi (isim, okul, branş) doldurun.
3. Öğrencilerinizi ekleyin (tek tek veya Excel ile).
4. Ödev oluşturun ve sınıfları/öğrencileri seçin.

### Ödev Kontrolü

1. Ana sayfadan kontrol edeceğiniz ödevi seçin.
2. Her öğrenci için durumu işaretleyin (Tamam, Yapılmadı, Eksik, Gelmedi, Getirmedi).
3. Bildirim göndermek istediğiniz öğrenci için WhatsApp ikonuna tıklayın.
4. Mesaj geçmişinden daha önce gönderilen bildirimleri takip edin.

---

## 📁 Proje Yapısı

```bash
├── app/
│   ├── api/              # API rotaları (state, student, homework, messages)
│   ├── components/       # Ana bileşenler
│   │   ├── messages/     # Mesajlaşma modülü (Composer, History, Groups)
│   │   ├── HomeworkManager.tsx # Ödev yönetimi
│   │   └── ...           # Diğer modüller
│   └── (routes)/         # Sayfa rotaları
├── components/
│   └── ui/               # Standardize edilmiş UI kütüphanesi (Card, Button, Input)
├── hooks/                # Özel React hook'ları (useAppState vb.)
├── store/                # Zustand global store tanımları
├── lib/                  # Yardımcı fonksiyonlar (utils, cn helper)
├── prisma/               # Veritabanı şeması ve migrasyonlar
└── services/             # Dış servis entegrasyonları (DB, Gemini, WhatsApp)
```

---

## 🔧 Ek Dokümantasyon

- [Google Auth Kurulumu](./GOOGLE_AUTH_SETUP.md)
- [Supabase Kurulumu](./SUPABASE_SETUP.md)

---

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

<div align="center">
  <p>
    <strong>🎓 Öğretmenler için, öğretmenler tarafından geliştirildi</strong>
  </p>
  <p>
    <a href="https://github.com/akarsu35/odev-takip-veli-bilgilendirme/issues">Sorun Bildir</a>
    •
    <a href="https://github.com/akarsu35/odev-takip-veli-bilgilendirme/pulls">Katkıda Bulun</a>
  </p>
</div>
