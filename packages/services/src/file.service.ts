import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentAnalysis } from "@repo/types/agreement";
import { v4 as uuidv4 } from "uuid";

export const FILE_CONSTANTS = {
  VALID_TYPES: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ] as const,
  MAX_SIZE_5MB: 5 * 1024 * 1024,
  BUCKET_NAME: "agreement-documents",
};

export const createFileService = (supabase: SupabaseClient) => ({
  validateFile(file: File): void {
    if (!file) throw new Error("No file provided");

    if (
      !FILE_CONSTANTS.VALID_TYPES.includes(
        file.type as (typeof FILE_CONSTANTS.VALID_TYPES)[number]
      )
    ) {
      throw new Error("Only PDF and DOCX contracts are allowed");
    }

    if (file.size > FILE_CONSTANTS.MAX_SIZE_5MB) {
      throw new Error("Please upload a contract smaller than 5 MB");
    }
  },

  async uploadToTemp(file: File, userId: string): Promise<string> {
    const tempFolderId = uuidv4();
    const safeFileName = encodeURIComponent(file.name);
    const tempPath = `temp/${userId}/${tempFolderId}/${safeFileName}`;

    const { error } = await supabase.storage
      .from(FILE_CONSTANTS.BUCKET_NAME)
      .upload(tempPath, file);

    if (error) throw new Error(`Failed to upload file: ${error.message}`);
    return tempPath;
  },

  async downloadAndUploadToFinal(
    tempPath: string,
    file: File,
    agreementId: string
  ): Promise<string> {
    const { data, error: downloadError } = await supabase.storage
      .from(FILE_CONSTANTS.BUCKET_NAME)
      .download(tempPath);

    if (downloadError || !data) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    const safeFileName = encodeURIComponent(file.name);
    const finalPath = `${agreementId}/${safeFileName}`;
    const newFile = new File([data], file.name, { type: file.type });

    const { error: uploadError } = await supabase.storage
      .from(FILE_CONSTANTS.BUCKET_NAME)
      .upload(finalPath, newFile);

    if (uploadError) {
      throw new Error(
        `Failed to upload to final location: ${uploadError.message}`
      );
    }

    return finalPath;
  },

  async deleteTempFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(FILE_CONSTANTS.BUCKET_NAME)
      .remove([path]);
    if (error) {
      throw new Error(`Failed to delete temporary file: ${error.message}`);
    }
  },

  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from(FILE_CONSTANTS.BUCKET_NAME)
      .createSignedUrl(path, 7 * 24 * 60 * 60); // 7 days

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to get signed URL: ${error?.message}`);
    }

    return data.signedUrl;
  },
});
