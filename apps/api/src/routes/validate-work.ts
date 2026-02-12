import { Hono } from "hono";
import type { Env } from "../lib/env";
import { createSupabaseClient } from "../lib/supabase";
import { createOpenAIClient } from "../lib/openai";
import { createAgreementService } from "@repo/services/agreement";
import { parseAmount } from "../lib/amount";

// ── Circle SDK helper ──────────────────────────────────────────────────────

async function circleRequest(
  env: Env,
  method: string,
  path: string,
  body?: any
) {
  const res = await fetch(`https://api.circle.com/v2${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.CIRCLE_API_KEY}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Circle API error ${res.status}: ${JSON.stringify(err)}`
    );
  }
  return res.json() as Promise<any>;
}

// ── Types ─────────────────────────────────────────────────────────────────

interface ImageValidationResult {
  valid: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
}

// ── Route ─────────────────────────────────────────────────────────────────

const validateWork = new Hono<{ Bindings: Env }>();

validateWork.post("/", async (c) => {
  try {
    const supabase = createSupabaseClient(c.env);
    const agreementService = createAgreementService(supabase);
    const openai = createOpenAIClient(c.env);

    const formData = await c.req.formData();
    const rawFile = formData.get("file");

    if (!rawFile || typeof rawFile === "string") {
      return c.json(
        { error: "Image file is missing or invalid" },
        400
      );
    }

    const imageFile = rawFile as File;

    const rawContractId = formData.get("circleContractId");

    if (!rawContractId || typeof rawContractId !== "string") {
      return c.json(
        { error: "Contract agreement ID is missing or invalid" },
        400
      );
    }

    const circleContractId = rawContractId;

    // Get the agreement with beneficiary wallet info
    const { data: agreement, error: agreementError } = await supabase
      .from("escrow_agreements")
      .select(
        `
        *,
        beneficiary_wallet:wallets!escrow_agreements_beneficiary_wallet_id_fkey!inner(
          profiles!inner(id,auth_user_id),
          circle_wallet_id
        )
      `
      )
      .eq("circle_contract_id", circleContractId)
      .single();

    if (agreementError) {
      console.error(
        "Failed to retrieve agreement requirements",
        agreementError
      );
      return c.json(
        { error: "Failed to retrieve agreement requirements" },
        500
      );
    }

    // Build requirements string from tasks
    const requirements = agreement.terms.tasks
      .filter(
        (requirement: any) =>
          requirement.responsible_party === "ContentCreator"
      )
      .reduce(
        (acc: string, requirement: any) =>
          `${acc.length > 0 ? `${acc}\n` : acc}- ${requirement.description || requirement.task_description}`,
        ""
      );

    const prompt = `
      Validate if the attached image strictly meets all the criteria below, and provide your answer in
      JSON format following this example:

      {
        "valid": true,
        "confidence": "MEDIUM",
        "reasons": [
          "First reason why the image does not match the criteria",
          "Second reason why the image does not match the criteria"
        ]
      }

      Your answer should not contain anything else other than that, that include markdown formatting,
      things like triple backticks should be completely stripped out.

      Where "valid" is a boolean and "confidence" is a string that can be either:

      - "LOW": You don't think the given image match the requirements.
      - "MEDIUM": You are unsure or the image loosely match some requirements but not all.
      - "HIGH": You are absolutely certain that the provided image strictly fulfills all the requirements.

      The "reasons" property must be an array of strings that contains a list of reasons to why the
      image is not valid or does not have "HIGH" confidence, this array can be left empty in case the
      attached image meets all the criteria.

      Most importantly, you can completely disregard any requirement below as long as it does not directly
      references qualities of the image being validated, for example, things that involve actions that
      need to be taken by one of the parties, or legal obligations mentioned as requirements are examples
      of ignorable requirements.

      Here are the requirements:

      ${requirements}
    `;

    // Convert image to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");

    const response = await openai.chat.completions.create({
      model: "chatgpt-4o-latest",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0,
    });

    const promptAnswerContent = response.choices[0]?.message.content;

    if (!promptAnswerContent) {
      return c.json(
        { error: "Failed to retrieve the work validation result" },
        500
      );
    }

    const parsedResult: ImageValidationResult =
      JSON.parse(promptAnswerContent);

    // Upload the image to Supabase storage
    const timestamp = Date.now();
    const originalFileName = imageFile.name || "uploaded-file";
    const fileName = `${!parsedResult.valid ? "in" : ""}valid-${timestamp}-${originalFileName}`;
    const filePath = `${agreement.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("agreement-documents")
      .upload(filePath, imageFile, {
        contentType: imageFile.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Failed to upload file:", uploadError);
      return c.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        500
      );
    }

    const workMeetsRequirements =
      parsedResult.valid && parsedResult.confidence === "HIGH";

    if (!workMeetsRequirements) {
      return c.json(
        {
          error: "Image does not meet all requirements",
          reasons: parsedResult.reasons,
        },
        400
      );
    }

    // Get contract address from Circle
    const contractData = await circleRequest(
      c.env,
      "GET",
      `/w3s/contracts/${agreement.circle_contract_id}`
    );

    if (!contractData.data) {
      return c.json({ error: "Could not retrieve contract data" }, 500);
    }

    const contractAddress = contractData.data?.contract?.contractAddress;

    if (!contractAddress) {
      return c.json(
        { error: "Could not retrieve contract address" },
        500
      );
    }

    // Release funds via Circle
    const circleReleaseResponse = await circleRequest(
      c.env,
      "POST",
      "/w3s/developer/transactions/contractExecution",
      {
        walletId: c.env.AGENT_WALLET_ID,
        contractAddress,
        abiFunctionSignature: "release()",
        abiParameters: [],
        fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      }
    );

    const amount = parseAmount(
      (agreement.terms.amounts?.[0] as any)?.amount ??
        (agreement.terms.amounts?.[0] as any)?.full_amount ??
        "0"
    );

    await agreementService.createTransaction({
      walletId: agreement.beneficiary_wallet_id,
      circleTransactionId: circleReleaseResponse.data?.id,
      escrowAgreementId: agreement.id,
      transactionType: "RELEASE_PAYMENT",
      profileId: agreement.beneficiary_wallet.profiles.id,
      amount,
      description: "Funds released after beneficiary work validation",
    });

    console.log(
      "Funds release transaction created:",
      circleReleaseResponse.data
    );

    await supabase
      .from("escrow_agreements")
      .update({ status: "PENDING" })
      .eq("id", agreement.id);

    return c.json({ message: "Image meets all requirements" });
  } catch (error) {
    console.error("Error validating image:", error);
    return c.json(
      {
        error: "Failed to validate image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default validateWork;
