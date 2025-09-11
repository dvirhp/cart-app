const OpenAI = require("openai");
const Tesseract = require("tesseract.js");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // OpenAI client setup

// Remove code fences from model output
function stripCodeFences(text) {
  if (!text) return "";
  return text.trim().replace(/```json/gi, "").replace(/```/g, "").trim();
}

// Ensure items are returned as an array
function toItemsArray(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.items)) return parsed.items;
  return [];
}

// Apply Cloudinary transformations (jpg, quality, sharpen, contrast, resize)
function transformCloudinaryUrl(url) {
  try {
    return url.replace(
      "/upload/",
      "/upload/f_jpg,q_auto:best,e_sharpen:100,e_contrast:40,w_1600/"
    );
  } catch {
    return url;
  }
}

// OCR with Tesseract (Hebrew + English)
async function ocrLocal(filePath) {
  try {
    const { data } = await Tesseract.recognize(filePath, "heb+eng", {
      // logger: (m) => console.log(m),
    });
    return (data && data.text) || "";
  } catch (e) {
    console.error("⚠️ OCR error:", e.message);
    return "";
  }
}

// Ask LLM to parse receipt into structured JSON
async function askModel({ imageUrl, ocrText, model = "gpt-4o-mini" }) {
  const SYSTEM = "אתה עוזר מומחה בקריאת קבלות מסופרמרקט בישראל."; // System role
  const trimmedOcr = (ocrText || "").slice(0, 6000); // Limit OCR text length

  const USER_PROMPT = `
אתה מקבל קבלה. החזר **רק JSON תקני**:
{
  "items": [
    { "name": "שם המוצר", "quantity": מספר, "price": מספר, "barcode": "string או null" }
  ]
}

חוקים:
- התעלם משורות שאינן מוצר: סה"כ, תשלום, קופאי, אשראי, כותרות, מספרי תורים, שעות, תאריכים.
- מאחד "מבצע"/"החזר" (ערכים שליליים) אל שורת המוצר המתאימה ומחזיר מחיר סופי ששולם בפועל למוצר.
- כמות: אם יש "X2" / "2 יח'", הכנס quantity=2.
- price תמיד מספר חיובי (ללא מינוס). אם יש הנחה – קח את המחיר לאחר הנחה.
- נסה לזהות ברקוד (רצף ספרות 7–14, במיוחד 729... בישראל). אם לא ברור – null.
- אם שם מוצר חלקי/מבולגן – טהר/תקנן לשם טבעי וקצר (ללא מילים כמו "מחיר", "מבצע", "החזר", "קופה").
- החזר אך ורק JSON תקני, ללא טקסט נוסף.

טקסט OCR (לסיוע, ייתכן רעשים):
<<<OCR_START
${trimmedOcr}
OCR_END>>>
`.trim();

  const content = [{ type: "text", text: USER_PROMPT }];
  if (imageUrl) content.push({ type: "image_url", image_url: { url: imageUrl } }); // Attach image if provided

  const resp = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content }
    ],
    response_format: { type: "json_object" }, // Force JSON structure
    max_tokens: 1200
  });

  const raw = resp.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(stripCodeFences(raw)); // Parse AI output
  } catch (e) {
    console.log("📜 RAW AI (failed to parse, will retry if needed):", raw);
    return { items: [] };
  }
}

// Normalize items: clean name, enforce valid quantity, positive price, valid barcode
function normalizeItems(items) {
  return items
    .map((it) => {
      const name = String(it?.name || "").trim();
      let quantity = parseInt(it?.quantity, 10);
      if (!Number.isFinite(quantity) || quantity < 1) quantity = 1;

      let price = Number(it?.price);
      if (!Number.isFinite(price) || price < 0) price = 0;

      let barcode = it?.barcode;
      if (barcode !== null && barcode !== undefined) {
        barcode = String(barcode).replace(/\D/g, "");
        if (!barcode || barcode.length < 5) barcode = null;
      } else {
        barcode = null;
      }

      return { name, quantity, price, barcode };
    })
    .filter((it) => it.name);
}

/**
 * Main entry point:
 * - Try with image + OCR (gpt-4o-mini)
 * - Fallback: OCR only
 * - Last resort: gpt-4o (if accessible)
 */
async function parseReceiptAi(imageUrl, opts = {}) {
  const transformedUrl = transformCloudinaryUrl(imageUrl);
  const ocrText = opts.localPath ? await ocrLocal(opts.localPath) : "";

  // Attempt 1: image + OCR
  let out = await askModel({ imageUrl: transformedUrl, ocrText, model: "gpt-4o-mini" });
  let items = normalizeItems(toItemsArray(out));

  // Attempt 2: OCR only
  if (items.length === 0 && ocrText) {
    out = await askModel({ imageUrl: null, ocrText, model: "gpt-4o-mini" });
    items = normalizeItems(toItemsArray(out));
  }

  // Attempt 3: stronger model (if available)
  if (items.length === 0) {
    try {
      out = await askModel({ imageUrl: transformedUrl, ocrText, model: "gpt-4o" });
      items = normalizeItems(toItemsArray(out));
    } catch (e) {
      // Ignore if gpt-4o is unavailable
    }
  }

  return { items };
}

module.exports = { parseReceiptAi }; // Export function
