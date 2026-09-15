export interface ExtractedLineItem {
  id: string;
  description: string;
  qty: number | "";
  unit: string;
  unitPrice: number | "";
  amount: number;
}

export interface ExtractedQuotationData {
  payee: string;
  date: string;
  department: string;
  purpose: string;
  bank: string;
  accountName: string;
  accountNumber: string;
  paymentMethod: "cash" | "check" | "online" | "";
  urgency: "urgent" | "not_urgent";
  items: ExtractedLineItem[];
  totalAmount: number;
  source?: "free_parser" | "deepseek_vision" | "gemini_vision";
}

/**
 * Extract raw text from PDF buffer using pdf-parse
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfModule = await import("pdf-parse");
    const PDFParse = (pdfModule as any).PDFParse || (pdfModule as any).default?.PDFParse || (pdfModule as any).default;

    if (typeof PDFParse === "function") {
      try {
        const instance = new PDFParse({ data: buffer });
        if (typeof instance.load === "function") {
          await instance.load();
        }
        if (typeof instance.getText === "function") {
          const res = await instance.getText();
          if (typeof instance.destroy === "function") {
            await instance.destroy().catch(() => {});
          }
          if (typeof res === "string") return res;
          if (res && typeof res.text === "string") return res.text;
        }
      } catch {
        if (typeof (pdfModule as any).default === "function") {
          const res = await (pdfModule as any).default(buffer);
          if (res && typeof res.text === "string") return res.text;
        }
      }
    } else if (typeof (pdfModule as any) === "function") {
      const res = await (pdfModule as any)(buffer);
      if (res && typeof res.text === "string") return res.text;
    }

    return "";
  } catch (err) {
    console.warn("Free PDF text extraction error:", err);
    return "";
  }
}

/**
 * Free Heuristic / Regex-based Parser for standard quotation text
 */
export function parseQuotationTextHeuristic(text: string): {
  success: boolean;
  confidence: number;
  data: ExtractedQuotationData;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let payee = "";
  let date = new Date().toISOString().split("T")[0];
  let purpose = "";
  let bank = "";
  let accountName = "";
  let accountNumber = "";
  let totalAmount = 0;
  const items: ExtractedLineItem[] = [];

  // 1. Detect Payee / Vendor from header lines
  const payeePrefixRegex = /^(?:from|vendor|supplier|company|billed\s+by|contractor|seller)\s*[:\-]\s*(.+)$/i;
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    const match = line.match(payeePrefixRegex);
    if (match && match[1]) {
      payee = match[1].trim();
      break;
    }
  }

  // If no prefix found, examine top 5 lines for likely company names
  if (!payee && lines.length > 0) {
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const candidate = lines[i];
      if (
        /inc|corp|co\.|ltd|enterprises|solutions|services|trading|technologies|marketing|group|builders/i.test(
          candidate
        ) &&
        !/invoice|quote|quotation|purchase|order|receipt|statement/i.test(candidate)
      ) {
        payee = candidate.replace(/^[^\w]+/, "").trim();
        break;
      }
    }
    if (!payee && lines[0] && lines[0].length < 60 && !/quotation|invoice|receipt/i.test(lines[0])) {
      payee = lines[0];
    }
  }

  // 2. Detect Date
  const dateRegex =
    /(?:date|dated|issued)\s*[:\-]?\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/i;
  for (const line of lines) {
    const match = line.match(dateRegex);
    if (match && match[1]) {
      const parsedDate = new Date(match[1]);
      if (!isNaN(parsedDate.getTime())) {
        date = parsedDate.toISOString().split("T")[0];
        break;
      }
    }
  }

  // 3. Detect Bank Details
  const bankRegex =
    /\b(bdo|bpi|metrobank|unionbank|security\s+bank|rcbc|landbank|pnb|eastwest|chinabank|gcash|maya)\b/i;
  for (const line of lines) {
    const match = line.match(bankRegex);
    if (match && !bank) {
      bank = match[1].toUpperCase();
    }

    const acctNoMatch = line.match(/(?:acct|account|acc)\s*(?:no|number|#)?\s*[:\-]?\s*([\d\-]{8,20})/i);
    if (acctNoMatch && !accountNumber) {
      accountNumber = acctNoMatch[1].replace(/[^\d\-]/g, "").trim();
    }

    const acctNameMatch = line.match(/(?:acct|account)\s*name\s*[:\-]?\s*([A-Za-z0-9\s.,&]+)/i);
    if (acctNameMatch && !accountName) {
      accountName = acctNameMatch[1].trim();
    }
  }

  // 4. Detect Grand Total
  const totalRegex =
    /(?:grand\s+total|total\s+amount\s+due|total\s+due|total\s+amount|total\s+payable|amount\s+due|total)\s*[:\-]?\s*(?:php|p|₱)?\s*([\d,]+\.?\d{0,2})/i;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const match = line.match(totalRegex);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(val) && val > 0) {
        totalAmount = val;
        break;
      }
    }
  }

  // 5. Detect Line Items
  const itemRowRegex =
    /^(.+?)\s+(\d+(?:\.\d+)?)\s*(pcs|pc|units|unit|sets|set|lot|box|boxes|license|lic|mo|month|hrs|hr)?\s+(?:php|p|₱)?\s*([\d,]+\.\d{2})\s+(?:php|p|₱)?\s*([\d,]+\.\d{2})$/i;

  for (const line of lines) {
    if (/(?:description|quantity|subtotal|vat|grand\s+total|tax)/i.test(line)) {
      continue;
    }

    const match = line.match(itemRowRegex);
    if (match) {
      const desc = match[1].replace(/^\d+[\.\)]\s*/, "").trim();
      const qty = parseFloat(match[2]) || 1;
      const unit = match[3] || "pcs";
      const unitPrice = parseFloat(match[4].replace(/,/g, "")) || 0;
      const amount = parseFloat(match[5].replace(/,/g, "")) || qty * unitPrice;

      if (desc.length > 2 && amount > 0) {
        items.push({
          id: `item-${Date.now()}-${items.length}`,
          description: desc,
          qty,
          unit,
          unitPrice,
          amount,
        });
      }
    }
  }

  if (items.length === 0) {
    const simpleItemRegex =
      /^(\d+)\s+([A-Za-z0-9\s\-.,/&()]+?)\s+(?:php|p|₱)?\s*([\d,]+\.\d{2})$/i;
    for (const line of lines) {
      if (/(?:total|subtotal|vat|tax|date|bank|account)/i.test(line)) continue;
      const match = line.match(simpleItemRegex);
      if (match) {
        const qty = parseFloat(match[1]) || 1;
        const desc = match[2].trim();
        const amount = parseFloat(match[3].replace(/,/g, "")) || 0;
        if (desc.length > 2 && amount > 0) {
          items.push({
            id: `item-${Date.now()}-${items.length}`,
            description: desc,
            qty,
            unit: "pcs",
            unitPrice: qty > 0 ? amount / qty : amount,
            amount,
          });
        }
      }
    }
  }

  const itemsSum = items.reduce((sum, it) => sum + (it.amount || 0), 0);
  if (totalAmount === 0 && itemsSum > 0) {
    totalAmount = itemsSum;
  }

  if (!purpose && items.length > 0) {
    purpose = `Payment for ${items[0].description}${items.length > 1 ? ` and ${items.length - 1} other item(s)` : ""}`;
  }

  let confidence = 0;
  if (payee) confidence += 0.25;
  if (items.length > 0) confidence += 0.4;
  if (totalAmount > 0) confidence += 0.25;
  if (bank || accountNumber) confidence += 0.1;

  const success = confidence >= 0.65 && items.length > 0 && totalAmount > 0;

  return {
    success,
    confidence,
    data: {
      payee,
      date,
      department: "",
      purpose,
      bank,
      accountName,
      accountNumber,
      paymentMethod: bank || accountNumber ? "online" : "cash",
      urgency: "not_urgent",
      items,
      totalAmount,
      source: "free_parser",
    },
  };
}

/**
 * DeepSeek Vision / Chat Fallback Parser
 * Uses process.env.DEEPSEEK_API || process.env.DEEPSEEK_API_KEY
 */
export async function extractWithDeepSeek({
  base64Data,
  mimeType,
  extractedText,
  apiKey,
}: {
  base64Data?: string;
  mimeType?: string;
  extractedText?: string;
  apiKey: string;
}): Promise<ExtractedQuotationData> {
  const systemPrompt = `You are a financial procurement document extraction AI.
Extract quotation/invoice/receipt details into strict JSON matching this exact structure:
{
  "payee": "Company or vendor name issuing quotation",
  "date": "YYYY-MM-DD",
  "department": "Department if indicated, else ''",
  "purpose": "Brief purpose/summary of purchase",
  "bank": "Bank name if indicated, else ''",
  "accountName": "Bank account name if indicated, else ''",
  "accountNumber": "Bank account number if indicated, else ''",
  "paymentMethod": "online",
  "urgency": "not_urgent",
  "items": [
    {
      "description": "Item description",
      "qty": 1,
      "unit": "pcs",
      "unitPrice": 0.00,
      "amount": 0.00
    }
  ],
  "totalAmount": 0.00
}

Return ONLY raw valid JSON, no markdown backticks, no other text.`;

  let messages: any[] = [];

  if (extractedText && extractedText.trim().length > 30) {
    messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Here is the raw text extracted from a supplier quotation document:\n\n${extractedText}\n\nExtract the procurement data into JSON.`,
      },
    ];
  } else if (base64Data && mimeType) {
    const dataUrl = `data:${mimeType};base64,${base64Data}`;
    messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Extract all quotation line items, vendor name, bank info, and total amount into strict JSON according to the schema.",
          },
          {
            type: "image_url",
            image_url: { url: dataUrl },
          },
        ],
      },
    ];
  } else {
    throw new Error("Neither document text nor image data provided to DeepSeek.");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: base64Data && !extractedText ? "deepseek-flash" : "deepseek-chat",
      messages,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`DeepSeek API error (${response.status}): ${errText}`);
  }

  const result = await response.json();
  const rawContent = result.choices?.[0]?.message?.content || "{}";

  let cleanJsonStr = rawContent.trim();
  if (cleanJsonStr.startsWith("```json")) {
    cleanJsonStr = cleanJsonStr.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleanJsonStr.startsWith("```")) {
    cleanJsonStr = cleanJsonStr.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleanJsonStr);

  const rawItems = parsed.items || parsed.line_items || [];
  const items: ExtractedLineItem[] = Array.isArray(rawItems)
    ? rawItems.map((it: any, idx: number) => {
        const qty = Number(it.qty ?? it.quantity) || 1;
        const unitPrice = Number(it.unitPrice ?? it.unit_price ?? it.price) || 0;
        const amount = Number(it.amount ?? it.total) || qty * unitPrice;
        return {
          id: `ds-${Date.now()}-${idx}`,
          description: it.description || it.item || `Item #${idx + 1}`,
          qty,
          unit: it.unit || "pcs",
          unitPrice,
          amount,
        };
      })
    : [];

  return {
    payee: parsed.payee || parsed.vendor || "",
    date: parsed.date || new Date().toISOString().split("T")[0],
    department: parsed.department || "",
    purpose: parsed.purpose || "",
    bank: parsed.bank || "",
    accountName: parsed.accountName || parsed.account_name || "",
    accountNumber: parsed.accountNumber || parsed.account_number || "",
    paymentMethod: parsed.paymentMethod || "online",
    urgency: parsed.urgency || "not_urgent",
    items,
    totalAmount:
      Number(parsed.totalAmount ?? parsed.total) ||
      items.reduce((sum, it) => sum + (it.amount || 0), 0),
    source: "deepseek_vision",
  };
}