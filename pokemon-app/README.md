# 🎮 PokéDuel - Pokémon TCG Battle Game

Pokémon Trading Card Game temelli interaktif bir duel oyunu! Antrenörleri seçin, destelerinizi hazırlayın, farklı arenalarda savaşın ve rakiplerinizi yenin.

## ✨ Özellikler

- 🎭 **Çok Oyunculu Antrenör Seçimi** - Farklı antrenörleri ve onların rakiplerini seçin
- 🃏 **TCG Deste Yönetimi** - Pokémon kartlarından oluşan desteler oluşturun
- 🏟️ **Dinamik Arenalar** - Farklı lokasyonlarda savaşın, her biri benzersiz mekanikler ile
- ⚔️ **Gerçekçi Savaş Motoru** - Statlar, tip avantajları ve dön-tabanlı sistemle
- 🎨 **Güzel Animasyonlar** - Framer Motion ile akıcı geçişler ve efektler
- 🎵 **Ses Efektleri** - İmmerısif oyun deneyimi
- 📱 **Responsive Tasarım** - Tüm cihazlarda oynanabilir
- 🚀 **Modern Stack** - Next.js 16, React 19, TypeScript

## 🛠️ Teknoloji Yığını

- **Framework:** [Next.js](https://nextjs.org) 16.2.4
- **UI Library:** React 19.2.4
- **Styling:** Tailwind CSS 4
- **Animasyon:** Framer Motion 12.38.0
- **Dil:** TypeScript 5
- **Linting:** ESLint 9

## 📋 Proje Yapısı

```
src/
├── app/
│   ├── components/          # React bileşenleri
│   │   ├── BattleScreen     # Savaş arayüzü
│   │   ├── TrainerSelect    # Antrenör seçimi
│   │   ├── DeckSelect       # Deste seçimi
│   │   ├── LocationSelect   # Arena seçimi
│   │   ├── PokemonCard      # Kart görünümü
│   │   ├── TypeBadge        # Tip göstergesi
│   │   ├── StatBar          # İstatistik göstergesi
│   │   ├── CompareModal     # Karşılaştırma penceresi
│   │   ├── AudioPlayer      # Ses yönetimi
│   │   ├── SplashScreen     # Başlangıç ekranı
│   │   └── StarField        # Arka plan efekti
│   ├── layout.tsx           # Ana layout
│   ├── page.tsx             # Ana sayfa
│   └── globals.css          # Global stiller
│
└── lib/
    ├── battle-engine.ts     # Savaş mekanikler
    ├── pokemon-utils.ts     # Pokémon yardımcı fonksiyonları
    ├── trainers.ts          # Antrenör verileri
    ├── locations.ts         # Arena verileri
    ├── types.ts             # TypeScript tipleri
    ├── tcg-types.ts         # TCG kart tipleri
    ├── cards.json           # Kart veritabanı
    └── spring.ts            # Animasyon yapılandırması
```

## 🚀 Başlangıç

### Gereksinimler
- Node.js 18+ veya Bun
- npm/yarn/pnpm

### Kurulum

```bash
# Depoyu klonlayın
git clone https://github.com/canberkyildiz25/PokeDuel.git
cd PokeDuel/pokemon-app

# Bağımlılıkları yükleyin
npm install
# veya
yarn install
# veya
pnpm install
```

### Geliştirme Sunucusunu Başlatın

```bash
npm run dev
# veya
yarn dev
# veya
pnpm dev
```

Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresini açın.

### Üretim Derlemesi

```bash
npm run build
npm start
```

## 🎮 Nasıl Oynanır

1. **Antrenör Seçin** - Oyun başında antrenörleri seçin
2. **Deste Oluşturun** - Pokémon kartlarından 5 kartlık bir deste seçin
3. **Arena Seçin** - Savaşacağınız lokasyonu belirleyin
4. **Savaşın** - Karşılıklı savaşta rakibi yenmeye çalışın
5. **Kazanın** - İstatistik avantajlarını kullanarak zaferi alın

## 📊 Oyun Mekanikleri

### Savaş Sistemi
- **Tur Tabanlı:** Oyuncular ve rakip sırayla hareket eder
- **Tip Avantajı:** Kendi savaş motoru tarafından hesaplanan avantajlar
- **İstatistikler:** HP, Saldırı, Savunma, Hız, Özel Saldırı, Özel Savunma

### Kartlar
- Her kart benzersiz istatistiklere sahiptir
- Farklı Pokémon tipleri farklı mekanikler sunar
- Deste seçimi stratejik başarının anahtarıdır

## 🙏 Teşekkürler

Bu proje aşağıdaki harika açık kaynak projelerden yararlanmıştır:

- **[Next.js](https://github.com/vercel/next.js)** - Harika React framework
- **[Framer Motion](https://github.com/framer/motion)** - Profesyonel animasyon kütüphanesi
- **[Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)** - Utility-first CSS framework
- **[TypeScript](https://github.com/microsoft/TypeScript)** - Type-safe JavaScript

Ayrıca Pokémon TCG'nin ilhamlı oyun tasarımından esinlenilmiştir.

## 📝 Lisans

Bu proje kişisel kullanım ve öğrenme amaçlıdır.

## 👨‍💻 Geliştirici

Tarafından oluşturuldu: [canberkyildiz25](https://github.com/canberkyildiz25)

---

**Eğlenceli oyun oynamalar!** 🎮✨
