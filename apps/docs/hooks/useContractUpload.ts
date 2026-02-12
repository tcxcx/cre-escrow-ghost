"use client";

import { useState } from "react";
import { createBrowserClient } from "../lib/supabase/client";
import { createFileService } from "@repo/services/file";
import { createAgreementService } from "@repo/services/agreement";
import { parseAmount } from "../lib/utils/amount";
import type {
  DocumentAnalysis,
  CreateAgreementProps,
  EscrowAgreement,
} from "@repo/types/agreement";

export function useContractUpload(props: CreateAgreementProps) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const supabase = createBrowserClient();
  const fileService = createFileService(supabase);
  const agreementService = createAgreementService(supabase);

  const analyzeDocument = async (
    file: File
  ): Promise<DocumentAnalysis> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/contracts/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to analyze document");
    }

    return response.json();
  };

  const handleFileUpload = async (file: File) => {
    setDone(false);

    if (!props.beneficiaryWalletId) {
      console.error(
        "Missing beneficiary. Please select a recipient before uploading."
      );
      return;
    }

    let tempPath: string | null = null;
    setUploading(true);

    try {
      fileService.validateFile(file);

      // Upload to temp location
      tempPath = await fileService.uploadToTemp(file, props.userId);

      // Analyze document
      const analysis = await analyzeDocument(file);

      if (!analysis.amounts?.length) {
        throw new Error("No amounts found in the document");
      }

      // Create transaction
      const firstAmount = analysis.amounts[0]!;
      const amount = parseAmount(firstAmount.full_amount || "0");
      const transaction = await agreementService.createTransaction({
        walletId: props.depositorWalletId!,
        profileId: props.userProfileId!,
        amount,
        description: firstAmount.payment_for || "Escrow agreement deposit",
      });

      // Create agreement
      const agreement = await agreementService.createAgreement({
        beneficiaryWalletId: props.beneficiaryWalletId,
        depositorWalletId: props.depositorWalletId!,
        transactionId: transaction.id,
        terms: {
          ...analysis,
          originalFileName: file.name,
        },
      });

      // Move file to final location
      const finalPath = await fileService.downloadAndUploadToFinal(
        tempPath,
        file,
        agreement.id
      );

      // Cleanup temp file
      await fileService.deleteTempFile(tempPath);

      // Get signed URL and update agreement
      const signedUrl = await fileService.getSignedUrl(finalPath);
      await agreementService.updateAgreementTerms(agreement.id, {
        ...analysis,
        documentUrl: signedUrl,
        originalFileName: file.name,
      });

      props.onAnalysisComplete?.(analysis, {
        ...agreement,
        terms: {
          ...analysis,
          documentUrl: signedUrl,
          originalFileName: file.name,
        },
      } as unknown as EscrowAgreement);

      return { analysis, agreement };
    } catch (error) {
      console.error("Process error:", error);

      if (tempPath) {
        try {
          await fileService.deleteTempFile(tempPath);
        } catch (deleteError) {
          console.error("Failed to delete temporary file:", deleteError);
        }
      }
    } finally {
      setUploading(false);
      setDone(true);
    }
  };

  return { handleFileUpload, analyzeDocument, uploading, done };
}
