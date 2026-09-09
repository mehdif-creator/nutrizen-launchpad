import { useCallback, useEffect, useRef, useState } from 'react';
import type { BrowserMultiFormatReader } from '@zxing/library';
import { isNativePlatform } from '@/lib/platform';
import { cameraErrorMessage, scanNativeBarcode } from '@/lib/barcodeScanner';

export function useBarcodeScanner(onScan: (barcode: string) => void | Promise<void>) {
  const native = isNativePlatform();
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const activeRef = useRef(false);
  const generationRef = useRef(0);
  const onScanRef = useRef(onScan);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const releaseCamera = useCallback(() => {
    readerRef.current?.reset();
    readerRef.current = null;
    const video = videoRef.current;
    const stream = video?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    if (video) video.srcObject = null;
  }, []);

  const stopScanning = useCallback(() => {
    activeRef.current = false;
    generationRef.current += 1;
    releaseCamera();
    setScanning(false);
  }, [releaseCamera]);

  const startScanning = useCallback(async () => {
    // Synchronous guard also prevents two native activities from a double tap.
    if (activeRef.current) return;
    activeRef.current = true;
    const generation = ++generationRef.current;
    setCameraError(null);
    setScanning(true);
    if (!native) return; // Web starts in the effect, after <video> is mounted.

    try {
      const barcode = await scanNativeBarcode();
      if (generation !== generationRef.current) return;
      stopScanning();
      if (barcode) void onScanRef.current(barcode);
    } catch (error) {
      if (generation !== generationRef.current) return;
      stopScanning();
      setCameraError(cameraErrorMessage(error));
    }
  }, [native, stopScanning]);

  useEffect(() => {
    if (!scanning || native) return;
    let disposed = false;
    let reader: BrowserMultiFormatReader | null = null;

    const start = async () => {
      try {
        const video = videoRef.current;
        if (!video) throw new Error('Camera view unavailable');
        const { BrowserMultiFormatReader } = await import('@zxing/library');
        if (disposed) return;
        reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        await reader.decodeFromConstraints({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        }, video, (result) => {
          if (!result || disposed || !activeRef.current) return;
          const barcode = result.getText();
          stopScanning();
          void onScanRef.current(barcode);
        });
        // getUserMedia may finish after navigation or Stop was clicked.
        if (disposed || !activeRef.current) reader.reset();
      } catch (error) {
        if (disposed || !activeRef.current) return;
        stopScanning();
        setCameraError(cameraErrorMessage(error));
      }
    };
    void start();
    return () => {
      disposed = true;
      reader?.reset();
      if (readerRef.current === reader) readerRef.current = null;
    };
  }, [scanning, native, stopScanning]);

  useEffect(() => () => {
    activeRef.current = false;
    generationRef.current += 1;
    releaseCamera();
  }, [releaseCamera]);

  return { native, videoRef, scanning, cameraError, startScanning, stopScanning };
}