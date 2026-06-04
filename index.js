import { Telegraf, Markup } from "telegraf";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import express from "express";

const app = express();

/* ── INIT ── */
const { MONGO_URI, BOT_TOKEN } = process.env;
if (!MONGO_URI || !BOT_TOKEN)
  throw new Error("❌ .env: MONGO_URI / BOT_TOKEN kerak");

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("🍃 MongoDB-ga muvaffaqiyatli ulandi!");
    bot.launch().then(() => console.log("✅ Bot ishga tushdi!"));
  })
  .catch((err) => console.error("❌ MongoDB ulanishda xatolik:", err));

const bot = new Telegraf(BOT_TOKEN);

/* ── OWNERS (ADMINS) LIST ── */
const OWNERS = [6584963215, 1228723117];
const isAdmin = (uid) => OWNERS.includes(Number(uid));

/* ── MONGOOSE SCHEMAS & MODELS ── */
// `image` maydoni qo'shildi (ixtiyoriy rasm uchun file_id saqlaydi)
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  quantity: { type: Number, required: true, default: 0 },
  image: { type: String, default: null } 
});
const Product = mongoose.model("Product", productSchema);

const userStateSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  step: { type: String, required: true },
  data: { type: Object, default: {} }
});
const UserState = mongoose.model("UserState", userStateSchema);

const botUserSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  first_name: String,
  username: String,
  joined_at: { type: Date, default: Date.now }
});
const BotUser = mongoose.model("BotUser", botUserSchema);

/* ── CONSTANTS & KEYBOARDS ── */
const ADMIN_MENU = Markup.keyboard([
  ["➕ Qo'shish", "✏️ Tahrirlash"],
  ["📦 Mahsulotlar", "🔍 Qidirish"],
  ["ℹ️ Yordam", "⚙️ Admin Panel"],
]).resize();

const USER_MENU = Markup.keyboard([
  ["📦 Mahsulotlar", "🔍 Qidirish"],
  ["ℹ️ Yordam"]
]).resize();

const CANCEL_KB = Markup.keyboard([["❌ Bekor qilish"]]).resize();

const KB = ["➕ Qo'shish", "✏️ Tahrirlash", "📦 Mahsulotlar", "🔍 Qidirish", "ℹ️ Yordam", "❌ Bekor qilish", "⚙️ Admin Panel"];

const sq = (q) => q === 0 ? "🔴" : q < 5 ? "🟡" : "🟢";
const sep = "─────────────────────";

/* ── HELPERS ── */
function productCard(item) {
  return `${sep}\n📦  *${item.name.toUpperCase()}*\n${sep}\n\n` +
    `${sq(item.quantity)}  Quti ichida: *${item.quantity}x*`;
}

// Mahsulotni rasm bormi-yo'qligiga qarab yuborish funksiyasi
async function replyWithProduct(ctx, item, uid, keyboardExtra = {}) {
  const caption = productCard(item);
  const actions = productActions(item.name, uid);
  
  const finalOptions = {
    parse_mode: "Markdown",
    ...actions,
    ...keyboardExtra
  };

  if (item.image) {
    return ctx.replyWithPhoto(item.image, { caption, ...finalOptions });
  } else {
    return ctx.reply(caption, finalOptions);
  }
}

bot.action("close_card", async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.deleteMessage(); 
  } catch (error) {
    console.error("Xabarni o'chirishda xatolik:", error);
  }
});

function productActions(name, uid) {
  if (isAdmin(uid)) {
    return Markup.inlineKeyboard([
      [Markup.button.callback("✏️ Miqdorni o'zgartirish", `edit:${name}`),
      Markup.button.callback("🗑 O'chirish", `del:${name}`)],
      [Markup.button.callback("❌ Yopish", "close_card")]
    ]);
  } else {
    return Markup.inlineKeyboard([
      [Markup.button.callback("❌ Yopish", "close_card")]
    ]);
  }
}

async function sendListAsKeyboard(ctx) {
  const data = await Product.find().sort({ name: 1 });
  const currentMenu = isAdmin(ctx.from.id) ? ADMIN_MENU : USER_MENU;

  if (!data?.length) {
    return ctx.reply("📭 Omborda tovarlar mavjud emas.", currentMenu);
  }

  const buttons = [];
  for (let i = 0; i < data.length; i += 2) {
    const row = [`${sq(data[i].quantity)} ${data[i].name}`];
    if (data[i + 1]) {
      row.push(`${sq(data[i + 1].quantity)} ${data[i + 1].name}`);
    }
    buttons.push(row);
  }
  buttons.push(["❌ Bekor qilish"]); 

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
async function upsertProduct(name, quantity, imageFileId = null) {
  try {
    const cleanName = name.trim().toLowerCase();
    const ex = await Product.findOne({ name: cleanName });
    if (ex) {
      const updateData = { quantity };
      if (imageFileId) updateData.image = imageFileId; // Rasm kelsa, rasmini ham yangilaydi
      await Product.updateOne({ name: cleanName }, updateData);
      return { updated: true, name: cleanName };
    }
    await Product.create({ name: cleanName, quantity, image: imageFileId });
    return { updated: false, name: cleanName };
  } catch (error) {
    return { error };
  }
}

async function processBulkInput(text) {
  const lines = text.split("\n");
  let addedCount = 0;
  let updatedCount = 0;
  let failedLines = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

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
  const uid = ctx.from.id;
  await clearState(uid);

  await BotUser.findOneAndUpdate(
    { user_id: uid },
    { first_name: ctx.from.first_name, username: ctx.from.username },
    { upsert: true }
  );

  const currentMenu = isAdmin(uid) ? ADMIN_MENU : USER_MENU;
  ctx.reply(
    `${sep}\n📦  *OMBOR SKLAD BOT*\n${sep}\n\n` +
    `Salom, *${ctx.from.first_name}*! 👋\n\n` +
    (isAdmin(uid) ? "👑 Siz botda *Admin* huquqiga egasiz." : "Bot yordamida qutilar qoldig'ini kuzatib borishingiz mumkin."),
    { parse_mode: "Markdown", ...currentMenu }
  );
});

const helpText =
  `${sep}\nℹ️  *YORDAM VA BUYRUQLAR*\n${sep}\n\n` +
  `📦 *Mahsulotlar* — Jamiki tovarlar ro'yxati.\n` +
  `🔍 *Qidirish* — Tovarni qidirish.\n\n` +
  `⚠️ *Eslatma:* Mahsulot qo'shish (rasmli/rasmsiz), tahrirlash va o'chirish huquqlari faqat bot adminlariga berilgan.`;

bot.command("help", async (ctx) => { await clearState(ctx.from.id); ctx.reply(helpText, { parse_mode: "Markdown", ... (isAdmin(ctx.from.id) ? ADMIN_MENU : USER_MENU) }); });
bot.hears("ℹ️ Yordam", async (ctx) => { await clearState(ctx.from.id); ctx.reply(helpText, { parse_mode: "Markdown", ... (isAdmin(ctx.from.id) ? ADMIN_MENU : USER_MENU) }); });

/* ── ADMIN PANEL FUNKSIYALARI ── */
const showAdminPanel = async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("⛔️ Kechirasiz, bu bo'lim faqat adminlar uchun.");
  ctx.reply(
    `⚙️ *ADMIN PANEL*\n${sep}\n\nKerakli amalni tanlang:`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("👥 Foydalanuvchilar ro'yxati", "admin_users")],
        [Markup.button.callback("📢 Hammaga xabar yuborish", "admin_broadcast")]
      ])
    }
  );
};

bot.command("admin", showAdminPanel);
bot.hears("⚙️ Admin Panel", showAdminPanel);

bot.action("admin_users", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery("⛔️ Ruxsat yo'q");
  await ctx.answerCbQuery();

  const users = await BotUser.find().sort({ joined_at: -1 });
  let msg = `👥 *BOT FOYDALANUVCHILARI* (${users.length} ta):\n${sep}\n`;
  
  users.forEach((u, idx) => {
    const userLink = u.username ? `@${u.username}` : "yo'q";
    msg += `${idx + 1}. ID: \`${u.user_id}\` - *${u.first_name}* (${userLink})\n`;
  });

  ctx.reply(msg, { parse_mode: "Markdown" });
});

bot.action("admin_broadcast", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery("⛔️ Ruxsat yo'q");
  await ctx.answerCbQuery();
  await setState(ctx.from.id, "broadcast_msg");
  ctx.reply("📢 Barcha foydalanuvchilarga yuboriladigan *xabarni (matnni)* kiriting:", { parse_mode: "Markdown", ...CANCEL_KB });
});

/* ── RO'YXAT (LIST) ── */
bot.command("list", (ctx) => sendListAsKeyboard(ctx));
bot.hears("📦 Mahsulotlar", async (ctx) => { await clearState(ctx.from.id); sendListAsKeyboard(ctx); });

/* ── VIEW / INLINE HANDLERS ── */
bot.action(/^view:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const item = await Product.findOne({ name: ctx.match[1] });
  if (!item) return ctx.reply("❌ Mahsulot topilmadi.");
  await replyWithProduct(ctx, item, ctx.from.id);
});

bot.action(/^edit:(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery("⛔️ Sizga ruxsat berilmagan", { show_alert: true });
  await ctx.answerCbQuery();
  const name = ctx.match[1];
  await setState(ctx.from.id, "inline_qty", { name });
  ctx.reply(`✏️ *${name.toUpperCase()}* — yangi quti sonini yozing (Masalan: 45):`, { parse_mode: "Markdown", ...CANCEL_KB });
});

bot.action(/^del:(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery("⛔️ Sizga ruxsat berilmagan", { show_alert: true });
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
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery("⛔️ Ruxsat yo'q");
  const name = ctx.match[1];
  await Product.deleteOne({ name });
  await ctx.answerCbQuery("O'chirildi ✅");
  ctx.reply(`🗑 📦 *${name.toUpperCase()}* muvaffaqiyatli o'chirildi.`, ADMIN_MENU);
});

bot.catch((err, ctx) => {
  console.error("Bot xatosi:", err);
});

/* ── BEKOR QILISH ── */
bot.hears("❌ Bekor qilish", async (ctx) => {
  await clearState(ctx.from.id);
  ctx.reply("✅ Jarayon bekor qilindi.", isAdmin(ctx.from.id) ? ADMIN_MENU : USER_MENU);
});
bot.command("cancel", async (ctx) => {
  await clearState(ctx.from.id);
  ctx.reply("✅ Jarayon bekor qilindi.", isAdmin(ctx.from.id) ? ADMIN_MENU : USER_MENU);
});

/* ── QO'SHISH (ADD MODIFIED FOR PHOTO) ── */
bot.hears("➕ Qo'shish", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("⛔️ Bu buyruq faqat adminlar uchun.");
  await setState(ctx.from.id, "add_choose_type");
  
  ctx.reply("Yangi mahsulot kiritish turini tanlang:", {
    ...Markup.inlineKeyboard([
      [Markup.button.callback("📸 Rasmli mahsulot qo'shish", "add_with_photo")],
      [Markup.button.callback("📝 Matnli ommaviy (Bulk) qo'shish", "add_bulk_text")]
    ])
  });
});

bot.action("add_bulk_text", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery("⛔️ Ruxsat yo'q");
  await ctx.answerCbQuery();
  await setState(ctx.from.id, "add_bulk");
  ctx.reply("➕ Mahsulot nomi va miqdorini kiriting.\n\n*Bir nechta qo'shish uchun har birini yangi qatordan yozing.*\n_Namuna:_\n`Asprin 50`\n`Analgin 120`", { parse_mode: "Markdown", ...CANCEL_KB });
});

bot.action("add_with_photo", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery("⛔️ Ruxsat yo'q");
  await ctx.answerCbQuery();
  await setState(ctx.from.id, "add_photo_name");
  ctx.reply("📸 Mahsulot *nomini* kiriting:", { parse_mode: "Markdown", ...CANCEL_KB });
});

/* ── GLOBAL PHOTO & TEXT HANDLERS ── */

// Rasmlarni qabul qiluvchi handler (Faqat "add_photo_file" bosqichida ishlaydi)
bot.on("photo", async (ctx) => {
  const uid = ctx.from.id;
  if (!isAdmin(uid)) return;

  const state = await getState(uid);
  if (!state || state.step !== "add_photo_file") return;

  const { pName, pQty } = state;
  // Eng yuqori sifatli rasmning file_id sini olamiz
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

  await clearState(uid);
  const res = await upsertProduct(pName, pQty, fileId);

  let msg = res.updated ? `♻️ *${pName.toUpperCase()}* miqdori va rasmi yangilandi!` : `✅ Yangi rasmli mahsulot qo'shildi: *${pName.toUpperCase()}*`;
  ctx.reply(msg, { parse_mode: "Markdown", ...ADMIN_MENU });
});

// Matnli handler
bot.on("text", async (ctx) => {
  let text = ctx.message.text.trim();
  if (text.startsWith("/") || KB.includes(text)) return;

  if (text.includes("🔴") || text.includes("🟡") || text.includes("🟢")) {
    text = text.replace(/🔴|🟡|🟢/, "").trim();
  }

  const uid = ctx.from.id;
  const state = await getState(uid);
  const currentMenu = isAdmin(uid) ? ADMIN_MENU : USER_MENU;

  // 1. STATE YO'Q HOLATDA (Tezkor qidiruv)
  if (!state) {
    const data = await Product.find({ name: new RegExp(text.toLowerCase(), "i") }).sort({ name: 1 });
    if (!data?.length) return; 

    if (data.length === 1) {
      return replyWithProduct(ctx, data[0], uid);
    }

    const buttons = data.map(i => [Markup.button.callback(`${sq(i.quantity)}  ${i.name}`, `view:${i.name}`)]);
    return ctx.reply(`🔍 O'xshash *${data.length}* ta natija topildi:`, { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons) });
  }

  const { step, name, pName, pQty } = state;

  // Rasmli qo'shish stagi: Nom kiritilgandan so'ng miqdorni so'rash
  if (step === "add_photo_name" && isAdmin(uid)) {
    await setState(uid, "add_photo_qty", { pName: text.toLowerCase() });
    return ctx.reply(`✏️ *${text.toUpperCase()}* uchun miqdorini (quti sonini) yozing:`, { parse_mode: "Markdown", ...CANCEL_KB });
  }

  // Rasmli qo'shish stagi: Miqdor kiritilgandan so'ng rasm so'rash
  if (step === "add_photo_qty" && isAdmin(uid)) {
    const qty = parseInt(text);
    if (isNaN(qty) || qty < 0) return ctx.reply("❌ Noto'g'ri son kiritildi. Qaytadan miqdorini yozing:");
    
    await setState(uid, "add_photo_file", { pName, pQty: qty });
    return ctx.reply("📸 Endi ushbu mahsulotning *rasmini* botga yuboring (Rasm sifatida):", CANCEL_KB);
  }

  // 2. ADMIN REKLAMA / BROADCST TARQATISH STAGI
  if (step === "broadcast_msg" && isAdmin(uid)) {
    await clearState(uid);
    const users = await BotUser.find();
    let count = 0;

    ctx.reply("⏳ Xabar yuborish boshlandi...");
    for (let u of users) {
      try {
        await ctx.telegram.sendMessage(u.user_id, text);
        count++;
      } catch (e) {}
    }
    return ctx.reply(`📢 Xabar jami *${count}* ta faol foydalanuvchiga yuborildi.`, ADMIN_MENU);
  }

  // 3. BULK REJIMIDA (FAQAT ADMIN)
  if (step === "add_bulk") {
    if (!isAdmin(uid)) return;
    await clearState(uid);
    const { addedCount, updatedCount, failedLines } = await processBulkInput(text);
    let msg = `📋 *Kiritish yakunlandi:*\n✅ Yangi qo'shildi: ${addedCount} ta\n♻️ Miqdori yangilandi: ${updatedCount} ta`;
    if (failedLines.length > 0) msg += `\n⚠️ Quyidagi qatorlar tushunarsiz formatda:\n${failedLines.join("\n")}`;
    return ctx.reply(msg, { parse_mode: "Markdown", ...ADMIN_MENU });
  }

  // 4. EDIT ISMINI KIRITGANDA (FAQAT ADMIN)
  if (step === "edit_name") {
    if (!isAdmin(uid)) return;
    const item = await Product.findOne({ name: text.toLowerCase() });
    if (!item) return ctx.reply(`❌ *${text}* topilmadi. Qaytadan kiriting yoki bekor qiling:`, { parse_mode: "Markdown" });
    await setState(uid, "edit_qty", { name: text.toLowerCase() });
    return ctx.reply(`✏️ *${text.toUpperCase()}* — yangi quti sonini (x) yozing:`, { parse_mode: "Markdown", ...CANCEL_KB });
  }

  // 5. EDIT REJIMIDA SON KIRITISH (FAQAT ADMIN)
  if (step === "edit_qty" || step === "inline_qty") {
    if (!isAdmin(uid)) return;
    const qty = parseInt(text);
    if (isNaN(qty) || qty < 0) return ctx.reply("❌ Noto'g'ri son kiritildi. Qaytadan urinib ko'ring:");
    await clearState(uid);
    await Product.updateOne({ name }, { quantity: qty });
    const item = await Product.findOne({ name });
    return replyWithProduct(ctx, item, uid, currentMenu);
  }

  // 6. QIDIRUV REJIMIDA (HAMMA UCHUN)
  if (step === "search") {
    await clearState(uid);
    const data = await Product.find({ name: new RegExp(text.toLowerCase(), "i") }).sort({ name: 1 });
    if (!data?.length) return ctx.reply(`❌ *${text}* ombordan topilmadi.`, currentMenu);

    if (data.length === 1) {
      return replyWithProduct(ctx, data[0], uid, currentMenu);
    }
    const buttons = data.map(i => [Markup.button.callback(`${sq(i.quantity)}  ${i.name}`, `view:${i.name}`)]);
    return ctx.reply(`🔍 Skladdan *${data.length}* ta natija topildi:`, { parse_mode: "Markdown", ...Markup.inlineKeyboard(buttons), ...currentMenu });
  }

  await clearState(uid);
  ctx.reply("⚠️ Noma'lum reja. Asosiy menyuga qaytildi.", currentMenu);
});

app.get("/", (req, res) => {
  res.send("Bot ishlayapti");
});

app.listen(process.env.PORT || 3000);
