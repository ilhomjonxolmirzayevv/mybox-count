# 📦 My Box Count Bot

Telegram orqali ombordagi mahsulotlarni boshqarish uchun bot.

## Imkoniyatlar

* ➕ Mahsulot qo‘shish
* ✏️ Mahsulot miqdorini tahrirlash
* 🗑 Mahsulotni o‘chirish
* 📦 Mahsulotlar ro‘yxatini ko‘rish
* 🔍 Mahsulot qidirish
* 💾 MongoDB bazasida saqlash
* 🌐 Barcha foydalanuvchilar uchun umumiy ombor

## Texnologiyalar

* Node.js
* Telegraf
* MongoDB
* Mongoose

## O‘rnatish

Repository'ni klon qiling:

```bash
git clone (https://github.com/ilhomjonxolmirzayevv/mybox-count.git)
cd mybox-count
```

Paketlarni o‘rnating:

```bash
npm install
```

`.env` fayl yarating:

```env
BOT_TOKEN=YOUR_BOT_TOKEN
MONGODB_URI=YOUR_MONGODB_URI
```

Botni ishga tushiring:

```bash
npm start
```

yoki

```bash
node index.js
```

## Buyruqlar

* `/start` — Botni ishga tushirish
* `/list` — Mahsulotlar ro‘yxati
* `/add [nom] [soni]` — Mahsulot qo‘shish
* `/edit [nom] [soni]` — Mahsulotni tahrirlash
* `/delete [nom]` — Mahsulotni o‘chirish
* `/help` — Yordam

## Menyu

* ➕ Qo'shish
* ✏️ Tahrirlash
* 📦 Mahsulotlar
* 🔍 Qidirish
* ℹ️ Yordam

## Litsenziya

MIT License
