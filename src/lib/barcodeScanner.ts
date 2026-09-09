/** Read product codes using the native camera, never WebView getUserMedia. */
export async function scanNativeBarcode(): Promise<string | null> {
  const {
    CapacitorBarcodeScanner,
    CapacitorBarcodeScannerTypeHint,
    CapacitorBarcodeScannerCameraDirection,
    CapacitorBarcodeScannerAndroidScanningLibrary,
  } = await import('@capacitor/barcode-scanner');

  try {
    const result = await CapacitorBarcodeScanner.scanBarcode({
      // API 3.1.2 accepts ONE hint, not an array or a formats option.
      // ALL includes EAN_13, EAN_8, UPC_A and UPC_E in a single scan;
      // this version cannot prioritize a subset of formats.
      hint: CapacitorBarcodeScannerTypeHint.ALL,
      cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
      scanInstructions: 'Placez le code-barres du produit dans le cadre',
      scanButton: false,
      cancelButtonAccessibilityLabel: 'Annuler le scan',
      torchButtonOnAccessibilityLabel: 'Éteindre la lampe',
      torchButtonOffAccessibilityLabel: 'Allumer la lampe',
      // No ZXing on native: ML Kit on Android; Apple Vision on iOS.
      android: { scanningLibrary: CapacitorBarcodeScannerAndroidScanningLibrary.MLKIT },
    });
    return result.ScanResult?.trim() || null;
  } catch (error) {
    const details = error as { code?: string; message?: string } | null;
    if (details?.code === 'OS-PLUG-BARC-0006' || /cancelled|canceled|annul/i.test(details?.message ?? '')) {
      return null;
    }
    throw error;
  }
}

export function cameraErrorMessage(error: unknown): string {
  const details = error as { code?: string; name?: string; message?: string } | null;
  if (
    details?.code === 'OS-PLUG-BARC-0007' ||
    details?.name === 'NotAllowedError' ||
    /permission|denied|access.*provided/i.test(details?.message ?? '')
  ) {
    return 'Accès à la caméra refusé. Autorisez la caméra dans les réglages de NutriZen, puis réessayez.';
  }
  if (details?.name === 'NotFoundError') return 'Aucune caméra disponible sur cet appareil.';
  if (details?.name === 'NotReadableError') {
    return 'La caméra est utilisée par une autre application. Fermez-la, puis réessayez.';
  }
  if (details?.code === 'UNIMPLEMENTED' || /not implemented/i.test(details?.message ?? '')) {
    return 'Le scanner nécessite une mise à jour de l’application NutriZen.';
  }
  return 'Impossible de démarrer la caméra. Vérifiez son autorisation et réessayez.';
}