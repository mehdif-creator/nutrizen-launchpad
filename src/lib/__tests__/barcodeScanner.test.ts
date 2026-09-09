import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cameraErrorMessage, scanNativeBarcode } from '../barcodeScanner';

const { scanBarcode } = vi.hoisted(() => ({ scanBarcode: vi.fn() }));
vi.mock('@capacitor/barcode-scanner', () => ({
  CapacitorBarcodeScanner: { scanBarcode },
  CapacitorBarcodeScannerTypeHint: { ALL: 17 },
  CapacitorBarcodeScannerCameraDirection: { BACK: 1 },
  CapacitorBarcodeScannerAndroidScanningLibrary: { ZXING: 'zxing' },
}));

describe('scanner natif', () => {
  beforeEach(() => vi.resetAllMocks());

  it('utilise la caméra arrière native et retourne le code produit', async () => {
    scanBarcode.mockResolvedValue({ ScanResult: ' 3017620422003 ', format: 9 });
    expect(await scanNativeBarcode()).toBe('3017620422003');
    expect(scanBarcode).toHaveBeenCalledWith(expect.objectContaining({
      hint: 17,
      cameraDirection: 1,
      android: { scanningLibrary: 'zxing' },
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