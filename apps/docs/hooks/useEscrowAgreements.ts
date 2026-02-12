"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createBrowserClient } from "../lib/supabase/client";
import { createEscrowService } from "@repo/services/escrow";
import type {
  EscrowAgreementWithDetails,
  EscrowListProps,
} from "@repo/types/escrow";

export function useEscrowAgreements({ profileId }: EscrowListProps) {
  const [agreements, setAgreements] = useState<
    EscrowAgreementWithDetails[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createBrowserClient(), []);
  const escrowService = useMemo(
    () => createEscrowService(supabase),
    [supabase]
  );

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const loadAgreements = useCallback(async () => {
    let retries = 0;
    try {
      setLoading(true);
      while (retries < MAX_RETRIES) {
        try {
          const data = await escrowService.getAgreements(profileId);
          setAgreements(data);
          setError(null);
          break;
        } catch (err) {
          if (retries === MAX_RETRIES - 1) throw err;
          retries++;
          await sleep(RETRY_DELAY * retries);
        }
      }
    } catch (err) {
      console.error("Error loading agreements:", err);
      if (err instanceof TypeError) {
        setError("Network error. Please check your connection.");
      } else {
        setError(
          err instanceof Error ? err.message : "Failed to load agreements"
        );
      }
    } finally {
      setLoading(false);
    }
  }, [escrowService, profileId]);

  useEffect(() => {
    loadAgreements();
  }, [profileId, loadAgreements]);

  return {
    agreements,
    loading,
    error,
    refresh: loadAgreements,
  };
}
