"use client";
import { useEffect, useRef, useState } from "react";
import type { SimOptions, monteCarlo } from "../domain/simulator";
import type { Brand, CostParameters } from "../domain/types";
export function useMonteCarlo(
  brands: Brand[],
  parameters: CostParameters,
  options: SimOptions,
) {
  const [result, setResult] = useState<ReturnType<typeof monteCarlo> | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState("");
  const worker = useRef<Worker | null>(null),
    key = JSON.stringify([brands, parameters, options]),
    current = useRef(key);
  current.current = key;
  const cancel = () => {
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
  };
  useEffect(() => {
    worker.current?.terminate();
    worker.current = null;
    setResult(null);
    setError("");
    setProgress(0);
    setBusy(false);
    return () => {
      worker.current?.terminate();
    };
  }, [key]);
  const start = () => {
    cancel();
    setResult(null);
    setError("");
    setBusy(true);
    setProgress(0);
    try {
      const task = new Worker(
          new URL("../workers/monte-carlo.ts", import.meta.url),
        ),
        runKey = key;
      worker.current = task;
      task.onmessage = (event) => {
        if (worker.current !== task || current.current !== runKey) return;
        const { result, error, progress } = event.data;
        if (progress !== undefined) setProgress(progress);
        if (result) {
          setResult(result);
          cancel();
        }
        if (error) {
          setError(error);
          cancel();
        }
      };
      task.onerror = () => {
        if (worker.current !== task) return;
        setError("Perhitungan gagal. Coba lagi atau kurangi volume.");
        cancel();
      };
      task.postMessage({ brands, parameters, options });
    } catch (e) {
      setError((e as Error).message);
      cancel();
    }
  };
  return { result, busy, progress, error, start, cancel };
}
