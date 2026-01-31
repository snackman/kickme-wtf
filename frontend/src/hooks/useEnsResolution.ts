import { useEffect, useState } from "react";
import { isAddress } from "viem";
import { resolveEnsName, getCachedAddress } from "../lib/ensCache";

interface EnsState {
  address: string | null;
  isEns: boolean;
  isLoading: boolean;
  isValid: boolean;
  error: string | null;
}

export function useEnsResolution(input: string) {
  const [state, setState] = useState<EnsState>({
    address: null,
    isEns: false,
    isLoading: false,
    isValid: false,
    error: null,
  });

  useEffect(() => {
    if (!input || input.trim() === "") {
      setState({
        address: null,
        isEns: false,
        isLoading: false,
        isValid: false,
        error: null,
      });
      return;
    }

    const trimmedInput = input.trim();

    // Check if it's a valid Ethereum address
    if (isAddress(trimmedInput)) {
      setState({
        address: trimmedInput,
        isEns: false,
        isLoading: false,
        isValid: true,
        error: null,
      });
      return;
    }

    // Check if it looks like an ENS name
    if (trimmedInput.endsWith(".eth")) {
      // Check cache first
      const cached = getCachedAddress(trimmedInput);
      if (cached !== undefined) {
        setState({
          address: cached,
          isEns: true,
          isLoading: false,
          isValid: cached !== null,
          error: cached === null ? "ENS name not found" : null,
        });
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true, isEns: true, error: null }));

      let cancelled = false;

      const doResolve = async () => {
        try {
          // Add timeout
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 10000)
          );

          const address = await Promise.race([
            resolveEnsName(trimmedInput),
            timeoutPromise,
          ]);

          if (cancelled) return;

          if (address) {
            setState({
              address,
              isEns: true,
              isLoading: false,
              isValid: true,
              error: null,
            });
          } else {
            setState({
              address: null,
              isEns: true,
              isLoading: false,
              isValid: false,
              error: "ENS name not found",
            });
          }
        } catch (err) {
          if (cancelled) return;
          setState({
            address: null,
            isEns: true,
            isLoading: false,
            isValid: false,
            error: err instanceof Error && err.message === "Timeout"
              ? "ENS lookup timed out"
              : "Failed to resolve ENS name",
          });
        }
      };

      // Debounce the ENS lookup
      const timeoutId = setTimeout(doResolve, 500);
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }

    // Invalid input (not an address and not .eth)
    if (trimmedInput.length > 0) {
      setState({
        address: null,
        isEns: false,
        isLoading: false,
        isValid: false,
        error: null, // Don't show error while typing
      });
    }
  }, [input]);

  return state;
}
