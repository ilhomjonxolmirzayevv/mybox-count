// import { Telegraf, Markup } from "telegraf";
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// dotenv.config();

// /* ── INIT ── */
// const { MONGO_URI, BOT_TOKEN } = process.env;
// if (!MONGO_URI || !BOT_TOKEN)
//   throw new Error("❌ .env: MONGO_URI / BOT_TOKEN kerak");

// // MongoDB-ga ulanish
// mongoose.connect(MONGO_URI)
//   .then(() => console.log("🍃 MongoDB-ga muvaffaqiyatli ulandi!"))
//   .catch((err) => console.error("❌ MongoDB ulanishda xatolik:", err));

// const bot = new Telegraf(BOT_TOKEN);

// /* ── MONGOOSE SCHEMAS & MODELS ── */
// const productSchema = new mongoose.Schema({
//   name: { type: String, required: true, unique: true },
//   quantity: { type: Number, required: true, default: 0 }
// });
// const Product = mongoose.model("Product", productSchema);

// const userStateSchema = new mongoose.Schema({
//   user_id: { type: Number, required: true, unique: true },
//   step: { type: String, required: true },
//   data: { type: Object, default: {} }
// });
// const UserState = mongoose.model("UserState", userStateSchema);

// /* ── CONSTANTS ── */
// const MENU = Markup.keyboard([
//   ["➕ Qo'shish", "✏️ Tahrirlash"],
//   ["📦 Mahsulotlar", "🔍 Qidirish"],
//   ["ℹ️ Yordam"],
// ]).resize();

// const CANCEL_KB = Markup.keyboard([["❌ Bekor qilish"]]).resize();

// const KB = ["➕ Qo'shish", "✏️ Tahrirlash", "📦 Mahsulotlar",
//   "🔍 Qidirish", "ℹ️ Yordam", "❌ Bekor qilish"];

// /* ── HELPERS ── */
// const sq = (q) => q === 0 ? "🔴" : q < 5 ? "🟡" : "🟢";

// const sep = "─────────────────────";

// function productCard(item) {
//   return `${sep}\n📦  *${item.name.toUpperCase()}*\n${sep}\n\n` +
//     `${sq(item.quantity)}  Miqdor: *${item.quantity} karobka*`;
// }

// function productActions(name) {
//   return Markup.inlineKeyboard([
//     [Markup.button.callback("✏️ Tahrirlash", `edit:${name}`),
//     Markup.button.callback("🗑 O'chirish", `del:${name}`)],
//     [Markup.button.callback("◀️ Ro'yxat", "list")],
//   ]);
// }

// async function sendList(ctx, editMode = false) {
//   const data = await Product.find().sort({ name: 1 });
//   const text = data?.length
//     ? `${sep}\n📦  *MAHSULOTLAR* (${data.length} ta)\n${sep}\n\nBosing 👇`
//     : "📭 Mahsulotlar yo'q.";
//   const kb = data?.length
//     ? Markup.inlineKeyboard(data.map(i =>
//       [Markup.button.callback(`${sq(i.quantity)}  ${i.name}`, `view:${i.name}`)]))
//     : Markup.inlineKeyboard([]);
//   const opts = { parse_mode: "Markdown", ...kb };
//   return editMode ? ctx.editMessageText(text, opts) : ctx.reply(text, { ...opts, ...MENU });
// }

// /* ── STATE ── */
// async function getState(uid) {
//   const data = await UserState.findOne({ user_id: uid });
//   return data ? { step: data.step, ...data.data } : null;
// }
// async function setState(uid, step, extra = {}) {
//   await UserState.findOneAndUpdate(
//     { user_id: uid },
//     { step, data: extra },
//     { upsert: true, returnDocument: 'after' } // <-- Shu yerda { new: true } o'rniga returnDocument qo'yildi
//   );
// }
// async function clearState(uid) {
//   await UserState.deleteOne({ user_id: uid });
// }

// /* ── DB OPS ── */
// async function upsertProduct(name, quantity) {
//   try {
//     const ex = await Product.findOne({ name });
//     if (ex) {
//       await Product.updateOne({ name }, { quantity });
//       return { error: null, updated: true };
//     }
//     await Product.create({ name, quantity });
//     return { error: null, updated: false };
//   } catch (error) {
//     return { error, updated: false };
//   }
// }

// async function getProduct(name) {
//   return await Product.findOne({ name });
// }

// /* ── /start ── */
// bot.start(async (ctx) => {
//   await clearState(ctx.from.id);
//   ctx.reply(
//     `${sep}\n📦  *SKLAD BOT*\n${sep}\n\n` +
//     `Salom, *${ctx.from.first_name}*! 👋\n\n` +
//     `Barcha o'zgarishlar hammaga ko'rinadi 🌐`,
//     { parse_mode: "Markdown", ...MENU }
//   );
// });

// /* ── YORDAM ── */
// const helpText =
//   `${sep}\nℹ️  *YORDAM*\n${sep}\n\n` +
//   `➕ *Qo'shish* — yangi mahsulot\n` +
//   `✏️ *Tahrirlash* — miqdorni o'zgartirish\n` +
//   `📦 *Mahsulotlar* — ro'yxat\n` +
//   `🔍 *Qidirish* — qidiruv\n\n` +
//   `*Buyruqlar:*\n` +
//   `/add [nom] [karobka]\n` +
//   `/edit [nom] [karobka]\n` +
//   `/delete [nom]\n` +
//   `/list`;

// bot.command("help", async (ctx) => { await clearState(ctx.from.id); ctx.reply(helpText, { parse_mode: "Markdown", ...MENU }); });
// bot.hears("ℹ️ Yordam", async (ctx) => { await clearState(ctx.from.id); ctx.reply(helpText, { parse_mode: "Markdown", ...MENU }); });

// /* ── RO'YXAT ── */
// bot.command("list", (ctx) => sendList(ctx));
// bot.hears("📦 Mahsulotlar", async (ctx) => { await clearState(ctx.from.id); sendList(ctx); });

// /* ── VIEW ── */
// bot.action(/^view:(.+)$/, async (ctx) => {
//   await ctx.answerCbQuery();
//   const item = await getProduct(ctx.match[1]);
//   if (!item) return ctx.answerCbQuery("❌ Topilmadi");
//   ctx.editMessageText(productCard(item), { parse_mode: "Markdown", ...productActions(item.name) });
// });

// /* ── LIST CALLBACK ── */
// bot.action("list", async (ctx) => {
//   await ctx.answerCbQuery();
//   sendList(ctx, true);
// });

// /* ── INLINE EDIT ── */
// bot.action(/^edit:(.+)$/, async (ctx) => {
//   await ctx.answerCbQuery();
//   const name = ctx.match[1];
//   await setState(ctx.from.id, "inline_qty", { name });
//   ctx.editMessageText(
//     `✏️ *${name}* — yangi karobka sonini yozing:`,
//     {
//       parse_mode: "Markdown",
//       ...Markup.inlineKeyboard([[Markup.button.callback("❌ Bekor", `view:${name}`)]])
//     }
//   );
// });

// /* ── INLINE DELETE ── */
// bot.action(/^del:(.+)$/, async (ctx) => {
//   await ctx.answerCbQuery();
//   const name = ctx.match[1];
//   ctx.editMessageText(
//     `⚠️ *${name}* ni o'chiramizmi?`,
//     {
//       parse_mode: "Markdown",
//       ...Markup.inlineKeyboard([
//         [Markup.button.callback("✅ Ha", `confirmDel:${name}`),
//         Markup.button.callback("❌ Yo'q", `view:${name}`)],
//       ])
//     }
//   );
// });

// bot.action(/^confirmDel:(.+)$/, async (ctx) => {
//   const name = ctx.match[1];
//   await ctx.answerCbQuery("O'chirildi ✅");
//   await Product.deleteOne({ name });
//   sendList(ctx, true);
// });

// /* ── BEKOR ── */
// bot.hears("❌ Bekor qilish", async (ctx) => {
//   await clearState(ctx.from.id);
//   ctx.reply("✅ Bekor qilindi.", MENU);
// });
// bot.command("cancel", async (ctx) => {
//   await clearState(ctx.from.id);
//   ctx.reply("✅ Bekor qilindi.", MENU);
// });

// /* ── QO'SHISH ── */
// bot.hears("➕ Qo'shish", async (ctx) => {
//   await setState(ctx.from.id, "add_name");
//   ctx.reply("➕ Mahsulot *nomini* kiriting:", { parse_mode: "Markdown", ...CANCEL_KB });
// });
// bot.command("add", async (ctx) => {
//   const [, name, n] = ctx.message.text.trim().split(/\s+/);
//   if (!name || !n) return ctx.reply("❌ Misol: `/add dermazol 10`", { parse_mode: "Markdown" });
//   const qty = parseInt(n);
//   if (isNaN(qty) || qty < 0) return ctx.reply("❌ Soni noto'g'ri");
//   const { error, updated } = await upsertProduct(name.toLowerCase(), qty);
//   if (error) return ctx.reply("❌ Xatolik: " + error.message);
//   ctx.reply(updated ? `♻️ *${name}* yangilandi — *${qty} karobka*` : `✅ *${name}* qo'shildi — *${qty} karobka*`,
//     { parse_mode: "Markdown", ...MENU });
// });

// /* ── TAHRIRLASH ── */
// bot.hears("✏️ Tahrirlash", async (ctx) => {
//   await setState(ctx.from.id, "edit_name");
//   ctx.reply("✏️ Mahsulot *nomini* kiriting:", { parse_mode: "Markdown", ...CANCEL_KB });
// });
// bot.command("edit", async (ctx) => {
//   const [, name, n] = ctx.message.text.trim().split(/\s+/);
//   if (!name || !n) return ctx.reply("❌ Misol: `/edit dermazol 20`", { parse_mode: "Markdown" });
//   const qty = parseInt(n);
//   if (isNaN(qty) || qty < 0) return ctx.reply("❌ Soni noto'g'ri");
//   const item = await getProduct(name.toLowerCase());
//   if (!item) return ctx.reply(`❌ *${name}* topilmadi.`, { parse_mode: "Markdown" });
//   await Product.updateOne({ name: name.toLowerCase() }, { quantity: qty });
//   ctx.reply(`♻️ *${name}* yangilandi — *${qty} karobka*`, { parse_mode: "Markdown", ...MENU });
// });

// /* ── QIDIRISH ── */
// bot.hears("🔍 Qidirish", async (ctx) => {
//   await setState(ctx.from.id, "search");
//   ctx.reply("🔍 Qidirish uchun nom kiriting:", CANCEL_KB);
// });

// /* ── DELETE COMMAND ── */
// bot.command("delete", async (ctx) => {
//   const [, name] = ctx.message.text.trim().split(/\s+/);
//   if (!name) return ctx.reply("❌ Misol: `/delete dermazol`", { parse_mode: "Markdown" });
//   const item = await getProduct(name.toLowerCase());
//   if (!item) return ctx.reply(`❌ *${name}* topilmadi.`, { parse_mode: "Markdown" });
//   await Product.deleteOne({ name: name.toLowerCase() });
//   ctx.reply(`🗑 *${name}* o'chirildi.`, { parse_mode: "Markdown", ...MENU });
// });

// /* ── TEXT HANDLER ── */
// bot.on("text", async (ctx) => {
//   const text = ctx.message.text.trim();
//   if (text.startsWith("/") || KB.includes(text)) return;

//   const uid = ctx.from.id;
//   const state = await getState(uid);

//   if (!state) {
//     // State yo'q → qidiruv (regex orqali qisman mos kelishni qidirish)
//     const data = await Product.find({ name: new RegExp(text.toLowerCase(), "i") }).sort({ name: 1 });
//     if (!data?.length)
//       return ctx.reply(`❌ *${text}* topilmadi.`, { parse_mode: "Markdown", ...MENU });
//     if (data.length === 1)
//       return ctx.reply(productCard(data[0]), { parse_mode: "Markdown", ...productActions(data[0].name) });
//     const buttons = data.map(i => [Markup.button.callback(`${sq(i.quantity)}  ${i.name}`, `view:${i.name}`)]);
//     return ctx.reply(`🔍 *${data.length}* ta natija:`, { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) });
//   }

//   const { step, name } = state;

//   if (step === "add_name") {
//     await setState(uid, "add_qty", { name: text.toLowerCase() });
//     return ctx.reply(`📦 *${text}* — karobka sonini kiriting:`, { parse_mode: "Markdown", ...CANCEL_KB });
//   }

//   if (step === "add_qty") {
//     const qty = parseInt(text);
//     if (isNaN(qty) || qty < 0) return ctx.reply("❌ Noto'g'ri son:");
//     await clearState(uid);
//     const { error, updated } = await upsertProduct(name, qty);
//     if (error) return ctx.reply("❌ Xatolik: " + error.message);
//     return ctx.reply(updated ? `♻️ *${name}* yangilandi — *${qty} karobka*` : `✅ *${name}* qo'shildi — *${qty} karobka*`,
//       { parse_mode: "Markdown", ...MENU });
//   }

//   if (step === "edit_name") {
//     const item = await getProduct(text.toLowerCase());
//     if (!item) return ctx.reply(`❌ *${text}* topilmadi. Qaytadan:`, { parse_mode: "Markdown" });
//     await setState(uid, "edit_qty", { name: text.toLowerCase() });
//     return ctx.reply(`✏️ *${text}* — yangi karobka sonini kiriting:`, { parse_mode: "Markdown", ...CANCEL_KB });
//   }

//   if (step === "edit_qty") {
//     const qty = parseInt(text);
//     if (isNaN(qty) || qty < 0) return ctx.reply("❌ Noto'g'ri son:");
//     await clearState(uid);
//     await Product.updateOne({ name }, { quantity: qty });
//     return ctx.reply(`♻️ *${name}* yangilandi — *${qty} karobka*`, { parse_mode: "Markdown", ...MENU });
//   }

//   if (step === "inline_qty") {
//     const qty = parseInt(text);
//     if (isNaN(qty) || qty < 0) return ctx.reply("❌ Noto'g'ri son:");
//     await clearState(uid);
//     await Product.updateOne({ name }, { quantity: qty });
//     const item = await getProduct(name);
//     return ctx.reply(productCard(item), { parse_mode: "Markdown", ...productActions(name), ...MENU });
//   }

//   if (step === "search") {
//     await clearState(uid);
//     const data = await Product.find({ name: new RegExp(text.toLowerCase(), "i") }).sort({ name: 1 });
//     if (!data?.length)
//       return ctx.reply(`❌ *${text}* topilmadi.`, { parse_mode: "Markdown", ...MENU });
//     if (data.length === 1)
//       return ctx.reply(productCard(data[0]), { parse_mode: "Markdown", ...productActions(data[0].name) });
//     const buttons = data.map(i => [Markup.button.callback(`${sq(i.quantity)}  ${i.name}`, `view:${i.name}`)]);
//     return ctx.reply(`🔍 *${data.length}* ta natija:`, { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) });
//   }

//   await clearState(uid);
//   ctx.reply("⚠️ Noma'lum holat.", MENU);
// });

// /* ── START ── */
// process.once("SIGINT", () => bot.stop("SIGINT"));
// process.once("SIGTERM", () => bot.stop("SIGTERM"));
// bot.launch().then(() => console.log("✅ Bot ishga tushdi!"));

import { Telegraf, Markup } from "telegraf";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

/* ── INIT ── */
const { MONGO_URI, BOT_TOKEN } = process.env;
if (!MONGO_URI || !BOT_TOKEN)
  throw new Error("❌ .env: MONGO_URI / BOT_TOKEN kerak");

// MongoDB-ga ulanish va keyin botni ishga tushirish
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("🍃 MongoDB-ga muvaffaqiyatli ulandi!");
    bot.launch().then(() => console.log("✅ Bot ishga tushdi!"));
  })
  .catch((err) => console.error("❌ MongoDB ulanishda xatolik:", err));

const bot = new Telegraf(BOT_TOKEN);

/* ── MONGOOSE SCHEMAS & MODELS ── */
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  quantity: { type: Number, required: true, default: 0 }
});
const Product = mongoose.model("Product", productSchema);

const userStateSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  step: { type: String, required: true },
  data: { type: Object, default: {} }
});
const UserState = mongoose.model("UserState", userStateSchema);

/* ── CONSTANTS & KEYBOARDS ── */
const MENU = Markup.keyboard([
  ["➕ Qo'shish", "✏️ Tahrirlash"],
  ["📦 Mahsulotlar", "🔍 Qidirish"],
  ["ℹ️ Yordam"],
]).resize();

const CANCEL_KB = Markup.keyboard([["❌ Bekor qilish"]]).resize();

const KB = ["➕ Qo'shish", "✏️ Tahrirlash", "📦 Mahsulotlar", "🔍 Qidirish", "ℹ️ Yordam", "❌ Bekor qilish"];

const sq = (q) => q === 0 ? "🔴" : q < 5 ? "🟡" : "🟢";
const sep = "─────────────────────";

/* ── HELPERS ── */
function productCard(item) {
  return `${sep}\n📦  *${item.name.toUpperCase()}*\n${sep}\n\n` +
    `${sq(item.quantity)}  Quti ichida: *${item.quantity}x*`;
}


// Xabarni o'chirib tashlash (Yopish) funksiyasi

bot.action("close_card", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.deleteMessage(); // Kelgan xabarni butunlay o'chiradi
  } catch (error) {
    console.error("Xabarni o'chirishda xatolik:", error);
  }
});

function productActions(name) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("✏️ Miqdorni o'zgartirish", `edit:${name}`),
    Markup.button.callback("🗑 O'chirish", `del:${name}`)],
    [Markup.button.callback("❌ Yopish", "close_card")] // <-- Yangi yopish tugmasi
  ]);
}

// Mahsulotlarni pastki menyu (Keyboard) sifatida chiqarish
async function sendListAsKeyboard(ctx) {
  const data = await Product.find().sort({ name: 1 });
  if (!data?.length) {
    return ctx.reply("📭 Omborda tovarlar mavjud emas.", MENU);
  }

  // Tovarlar nomidan keyboard tugmalari yasash (har bir qatorda 2 tadan)
  const buttons = [];
  for (let i = 0; i < data.length; i += 2) {
    const row = [`${sq(data[i].quantity)} ${data[i].name}`];
    if (data[i + 1]) {
      row.push(`${sq(data[i + 1].quantity)} ${data[i + 1].name}`);
    }
    buttons.push(row);
  }
  buttons.push(["❌ Bekor qilish"]); // Asosiy menyuga qaytish uchun

  return ctx.reply(
    `${sep}\n📦  *OMBORDA MAVJUD TOVARLAR* (${data.length} ta)\n${sep}\n\nBatafsil ko'rish uchun quyidagi tugmalardan birini bosing:`,
    { parse_mode: "Markdown", ...Markup.keyboard(buttons).resize() }
  );
}

/* ── STATE MANAGEMENT ── */
async function getState(uid) {
  const data = await UserState.findOne({ user_id: uid });
  return data ? { step: data.step, ...data.data } : null;
}
async function setState(uid, step, extra = {}) {
  await UserState.findOneAndUpdate(
    { user_id: uid },
    { step, data: extra },
    { upsert: true, returnDocument: 'after' }
  );
}
async function clearState(uid) {
  await UserState.deleteOne({ user_id: uid });
}

/* ── DB OPERATIONS ── */
async function upsertProduct(name, quantity) {
  try {
    const cleanName = name.trim().toLowerCase();
    const ex = await Product.findOne({ name: cleanName });
    if (ex) {
      await Product.updateOne({ name: cleanName }, { quantity });
      return { updated: true, name: cleanName };
    }
    await Product.create({ name: cleanName, quantity });
    return { updated: false, name: cleanName };
  } catch (error) {
    return { error };
  }
}

// Matndan bulk (ko'p qatorli) tovarlarni ajratib olib bazaga yozish funksiyasi
async function processBulkInput(text) {
  const lines = text.split("\n");
  let addedCount = 0;
  let updatedCount = 0;
  let failedLines = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Oxirgi bo'shliq bo'yicha ajratamiz (nomda bo'shliq bo'lishi ehtimoli uchun)
    const lastSpaceIndex = line.lastIndexOf(" ");
    if (lastSpaceIndex === -1) {
      failedLines.push(line);
      continue;
    }

    const name = line.substring(0, lastSpaceIndex).trim();
    const qtyStr = line.substring(lastSpaceIndex + 1).trim();
    const qty = parseInt(qtyStr);

    if (!name || isNaN(qty) || qty < 0) {
      failedLines.push(line);
      continue;
    }

    const res = await upsertProduct(name, qty);
    if (res.error) {
      failedLines.push(line);
    } else if (res.updated) {
      updatedCount++;
    } else {
      addedCount++;
    }
  }

  return { addedCount, updatedCount, failedLines };
}

/* ── COMMAND HANDLERS ── */
bot.start(async (ctx) => {
  await clearState(ctx.from.id);
  ctx.reply(
    `${sep}\n📦  *OMBOR SKLAD BOT*\n${sep}\n\n` +
    `Salom, *${ctx.from.first_name}*! 👋\n\n` +
    `Bot yordamida qutilar qoldig'ini (` + "`100x`" + ` formatda) kuzatib borishingiz mumkin.`,
    { parse_mode: "Markdown", ...MENU }
  );
});

const helpText =
  `${sep}\nℹ️  *YORDAM VA BUYRUQLAR*\n${sep}\n\n` +
  `➕ *Qo'shish* — Yangi tovar qo'shish yoki ommaviy (bulk) kiritish.\n` +
  `✏️ *Tahrirlash* — Tovar miqdorini o'zgartirish.\n` +
  `📦 *Mahsulotlar* — Jamiki tovarlar ro'yxati (Tugma shaklida).\n` +
  `🔍 *Qidirish* — Tovarni qidirish.\n\n` +
  `*Ommaviy kiritish namunasi:* (Nomi va soni orasida joy tashlang)\n` +
  "`salom 12`\n`buzoro 17`\n\n`Buyruqlar: `/add, /edit, /delete, /list";

bot.command("help", async (ctx) => { await clearState(ctx.from.id); ctx.reply(helpText, { parse_mode: "Markdown", ...MENU }); });
bot.hears("ℹ️ Yordam", async (ctx) => { await clearState(ctx.from.id); ctx.reply(helpText, { parse_mode: "Markdown", ...MENU }); });

/* ── RO'YXAT (LIST) ── */
bot.command("list", (ctx) => sendListAsKeyboard(ctx));
bot.hears("📦 Mahsulotlar", async (ctx) => { await clearState(ctx.from.id); sendListAsKeyboard(ctx); });

/* ── VIEW / INLINE HANDLERS ── */
bot.action(/^view:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const item = await Product.findOne({ name: ctx.match[1] });
  if (!item) return ctx.reply("❌ Mahsulot topilmadi.");
  ctx.reply(productCard(item), { parse_mode: "Markdown", ...productActions(item.name) });
});

bot.action(/^edit:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const name = ctx.match[1];
  await setState(ctx.from.id, "inline_qty", { name });
  ctx.reply(`✏️ *${name.toUpperCase()}* — yangi quti sonini yozing (Masalan: 45):`, { parse_mode: "Markdown", ...CANCEL_KB });
});

bot.action(/^del:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const name = ctx.match[1];
  ctx.reply(
    `⚠️ *${name.toUpperCase()}* tovarini ombordan butunlay o'chiramizmi?`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("✅ Ha, o'chirilsin", `confirmDel:${name}`),
        Markup.button.callback("❌ Yo'q", `view:${name}`)],
      ])
    }
  );
});

bot.action(/^confirmDel:(.+)$/, async (ctx) => {
  const name = ctx.match[1];
  await Product.deleteOne({ name });
  await ctx.answerCbQuery("O'chirildi ✅");
  ctx.reply(`🗑 📦 *${name.toUpperCase()}* muvaffaqiyatli o'chirildi.`, MENU);
});

/* ── BEKOR QILISH ── */
bot.hears("❌ Bekor qilish", async (ctx) => {
  await clearState(ctx.from.id);
  ctx.reply("✅ Jarayon bekor qilindi.", MENU);
});
bot.command("cancel", async (ctx) => {
  await clearState(uid);
  ctx.reply("✅ Jarayon bekor qilindi.", MENU);
});

/* ── QO'SHISH (ADD / BULK ADD) ── */
bot.hears("➕ Qo'shish", async (ctx) => {
  await setState(ctx.from.id, "add_bulk");
  ctx.reply("➕ Mahsulot nomi va miqdorini kiriting.\n\n*Bir nechta qo'shish uchun har birini yangi qatordan yozing.*\n_Namuna:_\n`Asprin 50`\n`Analgin 120`", { parse_mode: "Markdown", ...CANCEL_KB });
});

bot.command("add", async (ctx) => {
  const text = ctx.message.text.replace("/add", "").trim();
  if (!text) return ctx.reply("❌ Misol: `/add dermazol 10` yoki qatorma-qator bulk yozing.", { parse_mode: "Markdown" });

  const { addedCount, updatedCount, failedLines } = await processBulkInput(text);
  let msg = `📋 *Natija:*\n✅ Yangi qo'shildi: ${addedCount} ta\n♻️ Yangilandi: ${updatedCount} ta`;
  if (failedLines.length > 0) msg += `\n⚠️ Xato format: \n${failedLines.join("\n")}`;
  ctx.reply(msg, { parse_mode: "Markdown", ...MENU });
});

/* ── TAHRIRLASH (EDIT) ── */
bot.hears("✏️ Tahrirlash", async (ctx) => {
  await setState(ctx.from.id, "edit_name");
  ctx.reply("✏️ Miqdorini o'zgartirmoqchi bo'lgan mahsulot *nomini* kiriting:", { parse_mode: "Markdown", ...CANCEL_KB });
});

bot.command("edit", async (ctx) => {
  const [, name, n] = ctx.message.text.trim().split(/\s+/);
  if (!name || !n) return ctx.reply("❌ Misol: `/edit dermazol 20`", { parse_mode: "Markdown" });
  const qty = parseInt(n);
  if (isNaN(qty) || qty < 0) return ctx.reply("❌ Soni noto'g'ri");

  const item = await Product.findOne({ name: name.toLowerCase() });
  if (!item) return ctx.reply(`❌ *${name}* topilmadi.`, { parse_mode: "Markdown" });

  await Product.updateOne({ name: name.toLowerCase() }, { quantity: qty });
  ctx.reply(`♻️ *${name}* yangilandi — *${qty}x* quti`, { parse_mode: "Markdown", ...MENU });
});

/* ── QIDIRISH (SEARCH) ── */
bot.hears("🔍 Qidirish", async (ctx) => {
  await setState(ctx.from.id, "search");
  ctx.reply("🔍 Qidirilayotgan tovar nomini yozing:", CANCEL_KB);
});

bot.command("delete", async (ctx) => {
  const [, name] = ctx.message.text.trim().split(/\s+/);
  if (!name) return ctx.reply("❌ Misol: `/delete dermazol`", { parse_mode: "Markdown" });
  const item = await Product.findOne({ name: name.toLowerCase() });
  if (!item) return ctx.reply(`❌ *${name}* topilmadi.`, { parse_mode: "Markdown" });
  await Product.deleteOne({ name: name.toLowerCase() });
  ctx.reply(`🗑 *${name}* o'chirildi.`, { parse_mode: "Markdown", ...MENU });
});

/* ── GLOBAL TEXT HANDLER ── */
bot.on("text", async (ctx) => {
  let text = ctx.message.text.trim();
  if (text.startsWith("/") || KB.includes(text)) return;

  // Agar pastki keyboard tugmalaridan maxsus formatli tovar bosilsa (Masalan: "🟢 dermazol")
  if (text.includes("🔴") || text.includes("🟡") || text.includes("🟢")) {
    text = text.replace(/🔴|🟡|🟢/, "").trim();
  }

  const uid = ctx.from.id;
  const state = await getState(uid);

  // 1. STATE YO'Q HOLATDA (Shunchaki tovar nomini yozganda qidiruv)
  if (!state) {
    const data = await Product.find({ name: new RegExp(text.toLowerCase(), "i") }).sort({ name: 1 });
    if (!data?.length) return; // Agar baza topilmasa, indamaydi yoki xabar bermaydi (Siz so'ragandek)

    if (data.length === 1) {
      return ctx.reply(productCard(data[0]), { parse_mode: "Markdown", ...productActions(data[0].name) });
    }

    const buttons = data.map(i => [Markup.button.callback(`${sq(i.quantity)}  ${i.name}`, `view:${i.name}`)]);
    return ctx.reply(`🔍 O'xshash *${data.length}* ta natija topildi:`, { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) });
  }

  const { step, name } = state;

  // 2. BULK / ODDIY QO'SHISH REJIMIDA
  if (step === "add_bulk") {
    await clearState(uid);
    const { addedCount, updatedCount, failedLines } = await processBulkInput(text);
    let msg = `📋 *Kiritish yakunlandi:*\n✅ Yangi qo'shildi: ${addedCount} ta\n♻️ Miqdori yangilandi: ${updatedCount} ta`;
    if (failedLines.length > 0) msg += `\n⚠️ Quyidagi qatorlar tushunarsiz formatda:\n${failedLines.join("\n")}`;
    return ctx.reply(msg, { parse_mode: "Markdown", ...MENU });
  }

  // 3. EDIT ISMINI KIRITGANDA
  if (step === "edit_name") {
    const item = await Product.findOne({ name: text.toLowerCase() });
    if (!item) return ctx.reply(`❌ *${text}* topilmadi. Qaytadan kiriting yoki bekor qiling:`, { parse_mode: "Markdown" });
    await setState(uid, "edit_qty", { name: text.toLowerCase() });
    return ctx.reply(`✏️ *${text.toUpperCase()}* — yangi quti sonini (x) yozing:`, { parse_mode: "Markdown", ...CANCEL_KB });
  }

  // 4. EDIT REJIMIDA SON KIRITISH
  if (step === "edit_qty" || step === "inline_qty") {
    const qty = parseInt(text);
    if (isNaN(qty) || qty < 0) return ctx.reply("❌ Noto'g'ri son kiritildi. Qaytadan urinib ko'ring:");
    await clearState(uid);
    await Product.updateOne({ name }, { quantity: qty });
    const item = await Product.findOne({ name });
    return ctx.reply(`♻️ *${name.toUpperCase()}* yangilandi!\n\n` + productCard(item), { parse_mode: "Markdown", ...MENU });
  }

  // 5. QIDIRUV REJIMIDA
  if (step === "search") {
    await clearState(uid);
    const data = await Product.find({ name: new RegExp(text.toLowerCase(), "i") }).sort({ name: 1 });
    if (!data?.length) return ctx.reply(`❌ *${text}* ombordan topilmadi.`, MENU);

    if (data.length === 1) {
      return ctx.reply(productCard(data[0]), { parse_mode: "Markdown", ...productActions(data[0].name), ...MENU });
    }
    const buttons = data.map(i => [Markup.button.callback(`${sq(i.quantity)}  ${i.name}`, `view:${i.name}`)]);
    return ctx.reply(`🔍 Skladdan *${data.length}* ta natija topildi:`, { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons), ...MENU });
  }

  await clearState(uid);
  ctx.reply("⚠️ Noma'lum reja. Asosiy menyuga qaytildi.", MENU);
});