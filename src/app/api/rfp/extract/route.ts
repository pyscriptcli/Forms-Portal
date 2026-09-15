import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { promises as fs } from "fs";
import path from "path";
import {
  extractTextFromPdf,
  parseQuotationTextHeuristic,
  extractWithDeepSeek,
  ExtractedQuotationData,
} from "@/lib/quotationParser";

export const maxDuration = 60;

async function isAutofillEnabled(): Promise<boolean> {
  try {
    const flagsPath = path.join(process.cwd(), "src", "lib", "featureFlags.json");
    const raw = await fs.readFile(flagsPath, "utf8");
    const flags = JSON.parse(raw);
    return flags.rfpAutofillEnabled !== false;
  } catch {
    return true; // default on if file unreadable
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAutofillEnabled())) {
    return NextResponse.json(
      { success: false, message: "RFP Autofill feature is currently disabled." },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No quotation document provided" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 4.5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "File exceeds 4.5MB upload limit. Please upload a compressed document or image." },
        { status: 413 }
      );
    }
    const base64Data = buffer.toString("base64");

    // Strictly normalize MIME type
    let mimeType = file.type || "";
    const ext = file.name.toLowerCase().split(".").pop() || "";
    const isPdf = ext === "pdf" || mimeType.includes("pdf");

    if (isPdf) {
      mimeType = "application/pdf";
    } else if (ext === "png" || mimeType.includes("png")) {
      mimeType = "image/png";
    } else if (ext === "webp" || mimeType.includes("webp")) {
      mimeType = "image/webp";
    } else {
      mimeType = "image/jpeg";
    }

    // =========================================================================
    // TIER 1: Free Local Parser (Zero cost, runs in ~30ms, no API keys needed)
    // =========================================================================
    let extractedText = "";
    let heuristicResult: { success: boolean; confidence: number; data: ExtractedQuotationData } | null = null;

    if (isPdf) {
      try {
        extractedText = await extractTextFromPdf(buffer);
        if (extractedText && extractedText.trim().length > 20) {
          heuristicResult = parseQuotationTextHeuristic(extractedText);
          // If free heuristic parser found good quality line items and a total amount, return immediately!
          if (heuristicResult.success && heuristicResult.confidence >= 0.65) {
            return NextResponse.json({
              success: true,
              source: "free_parser",
              confidence: heuristicResult.confidence,
              data: heuristicResult.data,
            });
          }
        }
      } catch (err) {
        console.warn("Tier 1 free parser error (proceeding to fallback):", err);
      }
    }

    // =========================================================================
    // TIER 2: DeepSeek Vision / Chat Fallback (using DEEPSEEK_API / DEEPSEEK_API_KEY)
    // =========================================================================
    const deepseekKey = process.env.DEEPSEEK_API || process.env.DEEPSEEK_API_KEY;

    if (deepseekKey && deepseekKey !== "mock" && !deepseekKey.startsWith("your_")) {
      // Only invoke DeepSeek if extracted text exists or if mimeType is a standard image
      if (extractedText || mimeType.startsWith("image/")) {
        try {
          const dsResult = await extractWithDeepSeek({
            base64Data,
            mimeType,
            extractedText: extractedText || undefined,
            apiKey: deepseekKey,
          });

          if (dsResult && dsResult.items.length > 0) {
            return NextResponse.json({
              success: true,
              source: "deepseek_vision",
              data: dsResult,
            });
          }
        } catch (deepseekErr: any) {
          console.warn("Tier 2 DeepSeek error (proceeding to Gemini):", deepseekErr.message || deepseekErr);
        }
      }
    }

    // =========================================================================
    // TIER 3: Gemini Vision Fallback (using GEMINI_API_KEY / GOOGLE_GENAI_API_KEY)
    // =========================================================================
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

    if (geminiKey && geminiKey !== "mock" && !geminiKey.startsWith("your_")) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const systemPrompt = `You are an expert financial and procurement document intelligence model.
Your task is to analyze the attached supplier quotation, price quote, invoice, pro-forma invoice, billing statement, or official receipt and extract all relevant procurement fields needed to populate a Request for Payment (RFP) into strict JSON format.

Output JSON structure:
{
  "payee": "Full company/vendor/supplier name issuing the quotation",
  "date": "Document issue date in YYYY-MM-DD format (or today if not indicated)",
  "department": "Department if specified or inferable (e.g., IT, Sales, Marketing, HR, Admin), else ''",
  "purpose": "Brief description of the purchase or quotation project reference",
  "bank": "Bank name (e.g., BDO, BPI, Metrobank, UnionBank) if wire/bank details appear on document, else ''",
  "accountName": "Account holder name if wire/bank details appear, else ''",
  "accountNumber": "Account number if wire/bank details appear, else ''",
  "paymentMethod": "online",
  "urgency": "not_urgent",
  "items": [
    {
      "description": "Accurate description and specification of the item or service",
      "qty": 1,
      "unit": "pcs / lot / unit / set / box / license / mo / hr",
      "unitPrice": 0.00,
      "amount": 0.00
    }
  ],
  "totalAmount": 0.00
}

Strict Rules:
- Parse all item rows accurately. If multiple line items exist, extract all of them.
- Ensure 'amount' equals qty * unitPrice for each item, or matches the line total on the quotation.
- 'totalAmount' must accurately match the grand total payable indicated on the document.
- Return ONLY valid raw JSON with no Markdown backticks or extra commentary.`;

        let response: any = null;
        let delay = 1000;
        const maxRetries = 2;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      inlineData: {
                        data: base64Data,
                        mimeType,
                      },
                    },
                    {
                      text: "Extract all supplier quotation line items, vendor name, bank info, and total amount into strict JSON according to the schema.",
                    },
                  ],
                },
              ],
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
              },
            });
            break;
          } catch (geminiErr: any) {
            if (attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, delay));
              delay *= 1.5;
            } else {
              throw geminiErr;
            }
          }
        }

        let rawText = (response?.text || "{}").trim();
        if (rawText.startsWith("```json")) {
          rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (rawText.startsWith("```")) {
          rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const rawJson = JSON.parse(rawText);

        const extractedData = {
          payee: rawJson.payee || rawJson.vendor || rawJson.supplier || rawJson.vendor_name || "",
          date: rawJson.date || new Date().toISOString().split("T")[0],
          department: rawJson.department || rawJson.dept || "",
          purpose: rawJson.purpose || rawJson.description || "",
          bank: rawJson.bank || rawJson.bank_name || "",
          accountName: rawJson.accountName || rawJson.account_name || "",
          accountNumber: rawJson.accountNumber || rawJson.account_no || "",
          paymentMethod: (rawJson.paymentMethod || "online") as any,
          urgency: (rawJson.urgency || "not_urgent") as any,
          items: [] as any[],
          totalAmount: 0,
          source: "gemini_vision" as const,
        };

        const rawItems = rawJson.items || rawJson.line_items || [];
        if (Array.isArray(rawItems)) {
          extractedData.items = rawItems.map((item: any, i: number) => {
            const qty = Number(item.qty ?? item.quantity) || 1;
            const unitPrice = Number(item.unitPrice ?? item.unit_price ?? item.price) || 0;
            const amount = Number(item.amount ?? item.total) || qty * unitPrice;
            const description = item.description || item.item || `Item #${i + 1}`;
            const unit = item.unit || "pcs";
            return {
              id: `gemini-${Date.now()}-${i}`,
              description,
              qty,
              unit,
              unitPrice,
              amount,
            };
          });

          extractedData.totalAmount =
            Number(rawJson.totalAmount ?? rawJson.total) ||
            extractedData.items.reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
        }

        return NextResponse.json({
          success: true,
          source: "gemini_vision",
          data: extractedData,
        });
      } catch (geminiErr: any) {
        console.warn("Tier 3 Gemini error:", geminiErr.message || geminiErr);
      }
    }

    // =========================================================================
    // TIER 4: Partial Free Parser Fallback
    // If AI keys failed or timed out, but we had any partial heuristic data from PDF
    // =========================================================================
    if (heuristicResult && (heuristicResult.data.payee || heuristicResult.data.items.length > 0)) {
      return NextResponse.json({
        success: true,
        source: "free_parser_partial",
        confidence: heuristicResult.confidence,
        data: heuristicResult.data,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Could not automatically extract quotation data. Please configure DEEPSEEK_API or GEMINI_API_KEY in your environment, or ensure the PDF contains extractable text.",
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Quotation extraction pipeline error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to process quotation document.",
      },
      { status: 500 }
    );
  }
}
