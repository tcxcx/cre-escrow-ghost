import { Hono } from "hono";
import type { Env } from "../lib/env";
import { createOpenAIClient } from "../lib/openai";

const ANALYSIS_PROMPT = `
  Analyze the following document and extract:

  - All monetary amounts (including their currency), what they are for, and where they appear
  - All tasks, deliverables, and obligations (including descriptions, due dates, responsible parties, and details)

  Your response should include only a JSON object with two properties, an "amounts" array and a "tasks" arrays, each related to their respective data, nothing else other than that should be included alongside your answer, example below:

  {
    "amounts": [
      {
        "amount": "$1.500",
        "currency": "USD",
        "for": "Full compensation for the services provided under this agreement",
        "location": "Section 2.1"
      }
    ],
    "tasks": [
      "Create and deliver one high-quality, professionally photographed image featuring SparkleFizzCo.'s flagship beverage, SparkleFizz Original Citrus.",
      "Deliver one primary image and two social media adaptations optimized for Instagram.",
      "Submit the final image for Brand's approval."
    ]
  }

  Be sure to strictly follow the data structure exemplified above, and to start all sentences with an uppercase letter.

  Below you will find the content for the document to be analyzed:
`;

const analyze = new Hono<{ Bindings: Env }>();

analyze.get("/", (c) => {
  return c.json({
    message: "Send a POST request with a PDF or DOCX file to analyze",
    supportedTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  });
});

analyze.post("/", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const supportedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!supportedTypes.includes(file.type)) {
      return c.json(
        { error: "Unsupported file type. Please upload a PDF or DOCX file." },
        400
      );
    }

    // Extract text from the file
    const buffer = await file.arrayBuffer();
    let textContent: string;

    if (file.type === "application/pdf") {
      // Use pdf-parse for PDF files
      const pdfParseModule: any = await import("pdf-parse");
      const parse = pdfParseModule.default ?? pdfParseModule;
      const data = await parse(Buffer.from(buffer));
      textContent = data.text;
    } else {
      // Use mammoth for DOCX files
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({
        buffer: Buffer.from(buffer),
      });
      textContent = result.value;
    }

    // Analyze with OpenAI
    const openai = createOpenAIClient(c.env);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `${ANALYSIS_PROMPT} ${textContent}`,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return c.json(result);
  } catch (error) {
    console.error("Error analyzing document:", error);
    return c.json(
      {
        error: "Failed to analyze document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default analyze;
