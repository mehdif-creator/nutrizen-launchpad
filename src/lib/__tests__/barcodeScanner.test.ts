import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cameraErrorMessage, scanNativeBarcode } from '../barcodeScanner';

const { scanBarcode } = vi.hoisted(() => ({ scanBarcode: vi.fn() }));
// Keep the installed plugin's real exports/enums: old API guesses cannot pass.
vi.mock('@capacitor/barcode-scanner', async (importOriginal) => ({
  ...await importOriginal<typeof import('@capacitor/barcode-scanner')>(),
  CapacitorBarcodeScanner: { scanBarcode },
}));

describe('scanner natif', () => {
  beforeEach(() => vi.resetAllMocks());

  it('utilise ML Kit, la caméra arrière et ALL pour couvrir les quatre formats EAN/UPC', async () => {
    const { CapacitorBarcodeScannerTypeHint: hints } = await import('@capacitor/barcode-scanner');
    expect([hints.EAN_13, hints.EAN_8, hints.UPC_A, hints.UPC_E]).toEqual([9, 10, 14, 15]);
    scanBarcode.mockResolvedValue({ ScanResult: ' 3017620422003 ', format: 9 });
    expect(await scanNativeBarcode()).toBe('3017620422003');
    expect(scanBarcode).toHaveBeenCalledWith(expect.objectContaining({
      hint: 17,
      cameraDirection: 1,
       android: { scanningLibrary: 'mlkit' },
    }));
  });

  it('accepte une annulation sans erreur', async () => {
    scanBarcode.mockRejectedValue({ code: 'OS-PLUG-BARC-0006' });
    expect(await scanNativeBarcode()).toBeNull();
  });

  it('ignore un résultat vide', async () => {
    scanBarcode.mockResolvedValue({ ScanResult: '' });
    expect(await scanNativeBarcode()).toBeNull();
  });

  it('conserve les erreurs de permission pour les afficher', async () => {
    const error = { code: 'OS-PLUG-BARC-0007' };
    scanBarcode.mockRejectedValue(error);
    await expect(scanNativeBarcode()).rejects.toEqual(error);
    expect(cameraErrorMessage(error)).toContain('réglages de NutriZen');
  });

  it('explique si le plugin manque dans une ancienne application', () => {
    expect(cameraErrorMessage({ code: 'UNIMPLEMENTED' })).toContain('mise à jour');
  });

  it('distingue les erreurs caméra web', () => {
    expect(cameraErrorMessage({ name: 'NotAllowedError' })).toContain('refusé');
    expect(cameraErrorMessage({ name: 'NotFoundError' })).toContain('Aucune caméra');
    expect(cameraErrorMessage({ name: 'NotReadableError' })).toContain('autre application');
    expect(cameraErrorMessage(null)).toContain('réessayez');
  });
});