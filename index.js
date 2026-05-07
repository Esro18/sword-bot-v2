require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

const PREFIX = "!";
const BOT_NAME = "Sword System";

// IDs
const STAFF_ROLE = "1501660029441544353";
const INVOICE_CHANNEL = "1501661250415886557";
const CUSTOMER_ROLE = "1501661457572565092";
const CUSTOMER_VIP_ROLE = "1501661713311727819";
const LOG_CHANNEL = "1501662297876074566";

client.on("ready", () => {
  console.log("Sword System — Online");
  console.log(`Logged in as ${client.user.tag}`);
});

// =====================================================
// =============== messageCreate (الأوامر + الفواتير + الكاست) ===
// =====================================================

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  const isStaff = message.member.roles.cache.has(STAFF_ROLE);

  // ====================== !اوامر ======================

  if (cmd === "اوامر") {
  const emb = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle("📌 أوامر البوت")
    .setDescription(
      "🎙️ **!كاست @user <رسالة>**\n" +
      "إرسال رسالة لشخص.\n\n" +

      "🎙️ **!كاست <رسالة>**\n" +
      "إرسال رسالة للكل.\n\n" +

      "🎙️ **!كاست رتبة @role <رسالة>**\n" +
      "إرسال رسالة لرتبة.\n\n" +

      "🎙️ **!كاست ايمبد <عنوان | وصف>**\n" +
      "إيمبد للكل.\n\n" +

      "🎙️ **!كاست ايمبد رتبة @role <عنوان | وصف>**\n" +
      "إيمبد لرتبة.\n\n" +

      "🎙️ **!كاست ايمبد @user <عنوان | وصف>**\n" +
      "إيمبد لشخص.\n\n" +

      "📄 **!فاتورة**\n" +
      "إنشاء فاتورة تفاعلية.\n\n" +

      "✏️ **!تعديل رقم | مبلغ | سبب**\n" +
      "تعديل فاتورة."
    )
    .setFooter({ text: BOT_NAME })
    .setTimestamp();

  return message.reply({ embeds: [emb] });
}

  // =====================================================
  // ===================== نظام الفاتورة ==================
  // =====================================================

  if (cmd === "فاتورة") {
    if (!isStaff)
      return message.reply("❌ هذا الأمر للموظفين فقط.");

    const invoiceChannel = message.guild.channels.cache.get(INVOICE_CHANNEL);
    if (!invoiceChannel)
      return message.reply("❌ لم يتم العثور على روم الفواتير.");

    let answers = {};

    async function ask(question) {
      await message.channel.send(question);

      const collected = await message.channel.awaitMessages({
        filter: (m) => m.author.id === message.author.id,
        max: 1,
        time: 60000,
      });

      if (!collected.size) return null;

      return collected.first();
    }

    const orderMsg = await ask("اكتب الطلب:");
    if (!orderMsg) return message.reply("⏰ انتهى الوقت.");
    answers.order = orderMsg.content;

    const sectionMsg = await ask("اكتب القسم:");
    if (!sectionMsg) return message.reply("⏰ انتهى الوقت.");
    answers.section = sectionMsg.content;

    const amountMsg = await ask("اكتب المبلغ:");
    if (!amountMsg) return message.reply("⏰ انتهى الوقت.");
    answers.amount = amountMsg.content + " ﷼";

    const mentionMsg = await ask("منشن العميل:");
    if (!mentionMsg) return message.reply("⏰ انتهى الوقت.");

    const user = mentionMsg.mentions.users.first();
    if (!user) return message.reply("❌ لازم تمنشن العميل.");

    answers.user = user;

    const invoiceId = Date.now().toString().slice(-6);

    const emb = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(`فاتورة #${invoiceId}`)
      .addFields(
        { name: "العميل", value: `${user} \`${user.id}\`` },
        { name: "الطلب", value: answers.order },
        { name: "القسم", value: answers.section },
        { name: "المبلغ", value: answers.amount },
        { name: "حالة الدفع", value: "قيد الانتظار ⏳" },
        { name: "الموظف", value: `${message.author}` }
      )
      .setFooter({ text: BOT_NAME })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`invoice_paid_${invoiceId}`)
        .setLabel("تم الدفع")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`invoice_cancel_${invoiceId}`)
        .setLabel("إلغاء الفاتورة")
        .setStyle(ButtonStyle.Danger)
    );

    await invoiceChannel.send({
      content: `${user}`,
      embeds: [emb],
      components: [row],
    });

    try {
      await user.send({
        content: "📄 تم إنشاء فاتورة لك:",
        embeds: [emb],
      });
    } catch {}

    return message.reply(`✅ تم إنشاء الفاتورة #${invoiceId}.`);
  }

  // =====================================================
  // ===================== نظام الكاست البسيط =============
  // =====================================================

  if (cmd === "كاست") {
    if (!isStaff)
      return message.reply("❌ هذا الأمر للموظفين فقط.");

    // ===============================
    //   كاست إيمبد لشخص
    // ===============================
    if (args[0] === "ايمبد" && message.mentions.users.first()) {
      args.shift();

      const user = message.mentions.users.first();
      args.shift();

      const content = args.join(" ");
      if (!content.includes("|"))
        return message.reply("استخدم:\n!كاست ايمبد @user العنوان | الوصف");

      const [title, desc] = content.split("|").map(t => t.trim());

      const preview = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`${desc}\n\n--------------------\n\n<@${user.id}>`)
        .setColor("Gold");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirmEmbedUser_${user.id}_${title}_${desc}`)
          .setLabel("✔️ تأكيد")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("cancelCast")
          .setLabel("❌ إلغاء")
          .setStyle(ButtonStyle.Danger)
      );

      return message.reply({ embeds: [preview], components: [row] });
    }

    // ===============================
    //   كاست نصي لشخص
    // ===============================
    if (message.mentions.users.first() && args[0] !== "ايمبد") {
      const user = message.mentions.users.first();
      args.shift();
      const text = args.join(" ");

      const preview = `📢 **معاينة الكاست للشخص ${user}**\n\n${text}\n\n--------------------\n\n<@${user.id}>`;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirmUser_${user.id}`)
          .setLabel("✔️ تأكيد")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("cancelCast")
          .setLabel("❌ إلغاء")
          .setStyle(ButtonStyle.Danger)
      );

      return message.reply({ content: preview, components: [row] });
    }

    // ===============================
    //   كاست إيمبد للكل
    // ===============================
    if (args[0] === "ايمبد" && args[1] !== "رتبة") {
      args.shift();
      const content = args.join(" ");

      if (!content.includes("|"))
        return message.reply("استخدم:\n!كاست ايمبد العنوان | الوصف");

      const [title, desc] = content.split("|").map(t => t.trim());

      const preview = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`${desc}\n\n--------------------\n\n@everyone`)
        .setColor("Gold");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirmEmbedAll_${title}_${desc}`)
          .setLabel("✔️ تأكيد")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("cancelCast")
          .setLabel("❌ إلغاء")
          .setStyle(ButtonStyle.Danger)
      );

      return message.reply({ embeds: [preview], components: [row] });
    }

    // ===============================
    //   كاست إيمبد لرتبة
    // ===============================
    if (args[0] === "ايمبد" && args[1] === "رتبة") {
      args.shift();
      args.shift();

      const role = message.mentions.roles.first();
      if (!role) return message.reply("❌ لازم تمنشن رتبة");

      args.shift();
      const content = args.join(" ");

      if (!content.includes("|"))
        return message.reply("استخدم:\n!كاست ايمبد رتبة @role العنوان | الوصف");

      const [title, desc] = content.split("|").map(t => t.trim());

      const preview = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`${desc}\n\n--------------------\n\n<@&${role.id}>`)
        .setColor("Gold");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirmEmbedRole_${role.id}_${title}_${desc}`)
          .setLabel("✔️ تأكيد")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("cancelCast")
          .setLabel("❌ إلغاء")
          .setStyle(ButtonStyle.Danger)
      );

      return message.reply({ embeds: [preview], components: [row] });
    }

    // ===============================
    //   كاست نصي لرتبة
    // ===============================
    if (args[0] === "رتبة") {
      args.shift();
      const role = message.mentions.roles.first();
      if (!role) return message.reply("❌ لازم تمنشن رتبة");

      args.shift();
      const text = args.join(" ");

      const preview = `📢 **معاينة لرتبة ${role}**\n\n${text}\n\n--------------------\n\n<@&${role.id}>`;

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirmRole_${role.id}`)
          .setLabel("✔️ تأكيد")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("cancelCast")
          .setLabel("❌ إلغاء")
          .setStyle(ButtonStyle.Danger)
      );

      return message.reply({ content: preview, components: [row] });
    }

    // ===============================
    //   كاست نصي للكل
    // ===============================
    const text = args.join(" ");
    const preview = `📢 **معاينة للكل**\n\n${text}\n\n--------------------\n\n@everyone`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("confirmAll")
        .setLabel("✔️ تأكيد")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("cancelCast")
        .setLabel("❌ إلغاء")
        .setStyle(ButtonStyle.Danger)
    );

    return message.reply({ content: preview, components: [row] });
  }
});

// =====================================================
// ====================== دالة اللوق =====================
// =====================================================

async function sendLog(guild, embed) {
  try {
    const ch = guild.channels.cache.get(LOG_CHANNEL);
    if (ch) await ch.send({ embeds: [embed] });
  } catch (e) {
    console.log("Log error:", e.message);
  }
}

// =====================================================
// ================= نظام الرتب اليدوي ===================
// =====================================================

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const guild = newMember.guild;

  // ---------------------- Customer ----------------------
  if (
    !oldMember.roles.cache.has(CUSTOMER_ROLE) &&
    newMember.roles.cache.has(CUSTOMER_ROLE)
  ) {
    try {
      await newMember.send(
        "⭐ تهانينا!\n" +
        "لقد حصلت على رتبة **Customer**\n" +
        "• Sword System"
      );
    } catch {}

    const emb = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("تم إعطاء رتبة Customer")
      .setDescription(`للعضو: ${newMember}`)
      .setTimestamp();

    await sendLog(guild, emb);
  }

  // ------------------- Customer VIP ---------------------
  if (
    !oldMember.roles.cache.has(CUSTOMER_VIP_ROLE) &&
    newMember.roles.cache.has(CUSTOMER_VIP_ROLE)
  ) {
    try {
      await newMember.send(
        "🌟 تهانينا!\n" +
        "لقد حصلت على رتبة **Customer VIP**\n" +
        "• Sword System"
      );
    } catch {}

    const emb = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("تم إعطاء رتبة Customer VIP")
      .setDescription(`للعضو: ${newMember}`)
      .setTimestamp();

    await sendLog(guild, emb);
  }
});

// =====================================================
// =================== أزرار الفواتير ====================
// =====================================================

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const { customId, guild, user, message } = interaction;

  const member = guild.members.cache.get(user.id);

  // =====================================================
  // ===================== أزرار الكاست ===================
  // =====================================================

  if (customId === "cancelCast") {
    return interaction.update({
      content: "❌ تم إلغاء الكاست.",
      embeds: [],
      components: [],
    });
  }

  // ===================== كاست للكل =====================

  if (customId === "confirmAll") {
    const text = message.content
      .split("--------------------")[0]
      .replace("📢 **معاينة للكل**", "");

    await message.channel.send({
      content: `@everyone\n${text}`,
    });

    return interaction.update({
      content: "✅ تم إرسال الكاست.",
      embeds: [],
      components: [],
    });
  }

  // ===================== كاست رتبة =====================

  if (customId.startsWith("confirmRole_")) {
    const roleId = customId.split("_")[1];

    const text = message.content
      .split("--------------------")[0]
      .replace(/📢 \*\*معاينة لرتبة <@&\d+>\*\*/, "");

    await message.channel.send({
      content: `<@&${roleId}>\n${text}`,
    });

    return interaction.update({
      content: "✅ تم إرسال الكاست للرتبة.",
      embeds: [],
      components: [],
    });
  }

  // ===================== كاست شخص =====================

  if (customId.startsWith("confirmUser_")) {
    const userId = customId.split("_")[1];

    const text = message.content
      .split("--------------------")[0]
      .replace(/📢 \*\*معاينة الكاست للشخص <@\d+>\*\*/, "");

    const target = await guild.members.fetch(userId).catch(() => null);

    if (!target)
      return interaction.reply({
        content: "❌ لم يتم العثور على الشخص.",
        ephemeral: true,
      });

    try {
      await target.send(text);

      return interaction.update({
        content: "✅ تم إرسال الكاست للشخص.",
        embeds: [],
        components: [],
      });
    } catch {
      return interaction.reply({
        content: "❌ تعذر إرسال الرسالة للشخص.",
        ephemeral: true,
      });
    }
  }

  // ===================== إيمبد للكل =====================

  if (customId.startsWith("confirmEmbedAll_")) {
    const data = customId.replace("confirmEmbedAll_", "");
    const parts = data.split("_");

    const title = parts[0];
    const desc = parts.slice(1).join("_");

    const emb = new EmbedBuilder()
      .setTitle(title)
      .setDescription(desc)
      .setColor("Gold");

    await message.channel.send({
      content: "@everyone",
      embeds: [emb],
    });

    return interaction.update({
      content: "✅ تم إرسال الإيمبد للكل.",
      embeds: [],
      components: [],
    });
  }

  // ===================== إيمبد رتبة =====================

  if (customId.startsWith("confirmEmbedRole_")) {
    const data = customId.replace("confirmEmbedRole_", "");
    const parts = data.split("_");

    const roleId = parts[0];
    const title = parts[1];
    const desc = parts.slice(2).join("_");

    const emb = new EmbedBuilder()
      .setTitle(title)
      .setDescription(desc)
      .setColor("Gold");

    await message.channel.send({
      content: `<@&${roleId}>`,
      embeds: [emb],
    });

    return interaction.update({
      content: "✅ تم إرسال الإيمبد للرتبة.",
      embeds: [],
      components: [],
    });
  }

  // ===================== إيمبد شخص =====================

  if (customId.startsWith("confirmEmbedUser_")) {
    const data = customId.replace("confirmEmbedUser_", "");
    const parts = data.split("_");

    const userId = parts[0];
    const title = parts[1];
    const desc = parts.slice(2).join("_");

    const target = await guild.members.fetch(userId).catch(() => null);

    if (!target)
      return interaction.reply({
        content: "❌ لم يتم العثور على الشخص.",
        ephemeral: true,
      });

    const emb = new EmbedBuilder()
      .setTitle(title)
      .setDescription(desc)
      .setColor("Gold");

    try {
      await target.send({ embeds: [emb] });

      return interaction.update({
        content: "✅ تم إرسال الإيمبد للشخص.",
        embeds: [],
        components: [],
      });
    } catch {
      return interaction.reply({
        content: "❌ تعذر إرسال الإيمبد للشخص.",
        ephemeral: true,
      });
    }
  }

  // =====================================================
  // =================== أزرار الفواتير ===================
  // =====================================================

  if (!member.roles.cache.has(STAFF_ROLE))
    return interaction.reply({
      content: "❌ هذا الزر للموظفين فقط.",
      ephemeral: true,
    });

  const emb = message.embeds[0];
  if (!emb) return;

  const invoiceId = emb.title.match(/#(\d+)/)?.[1] || "???";

  const clientId = emb.fields[0].value.match(/\`(\d+)\`/)?.[1];
  const targetUser = await guild.members.fetch(clientId).catch(() => null);

  // ======================= تم الدفع =====================

  if (customId.startsWith("invoice_paid_")) {
    const newEmbed = EmbedBuilder.from(emb)
      .setColor(0x57f287)
      .setTitle(`فاتورة #${invoiceId} (تم الدفع)`)
      .setFields(
        { name: "العميل", value: emb.fields[0].value },
        { name: "الطلب", value: emb.fields[1].value },
        { name: "القسم", value: emb.fields[2].value },
        { name: "المبلغ", value: emb.fields[3].value },
        { name: "حالة الدفع", value: "تم الدفع ✅" },
        { name: "الموظف", value: `${member}` }
      )
      .setTimestamp();

    await message.edit({
      embeds: [newEmbed],
      components: [],
    });

    try {
      await targetUser.send({
        content: "📄 تم تحديث حالة فاتورتك:",
        embeds: [newEmbed],
      });
    } catch {}

    return interaction.reply({
      content: "✅ تم تأكيد الدفع.",
      ephemeral: true,
    });
  }

  // ===================== إلغاء الفاتورة =================

  if (customId.startsWith("invoice_cancel_")) {
    const newEmbed = EmbedBuilder.from(emb)
      .setColor(0xed4245)
      .setTitle(`فاتورة #${invoiceId} (تم الإلغاء)`)
      .setFields(
        { name: "العميل", value: emb.fields[0].value },
        { name: "الطلب", value: emb.fields[1].value },
        { name: "القسم", value: emb.fields[2].value },
        { name: "المبلغ", value: emb.fields[3].value },
        { name: "حالة الدفع", value: "تم الإلغاء ❌" },
        { name: "الموظف", value: `${member}` }
      )
      .setTimestamp();

    await message.edit({
      embeds: [newEmbed],
      components: [],
    });

    try {
      await targetUser.send({
        content: "📄 تم تحديث حالة فاتورتك:",
        embeds: [newEmbed],
      });
    } catch {}

    return interaction.reply({
      content: "❌ تم إلغاء الفاتورة.",
      ephemeral: true,
    });
  }
});
/* =====================================================
   ===================== تسجيل الدخول ====================
   ===================================================== */

client.login(process.env.TOKEN);

/* =====================================================
   ====================== النهاية ========================
   ===================================================== */

// تم بناء هذا النظام بالكامل بواسطة:
// Sword System — Discord Bot
// جميع الحقوق محفوظة لدى Esro Store ❤️