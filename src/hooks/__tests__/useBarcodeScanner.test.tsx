import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBarcodeScanner } from '../useBarcodeScanner';

const mocks = vi.hoisted(() => ({
  native: vi.fn(), scan: vi.fn(), decode: vi.fn(), reset: vi.fn(), reader: vi.fn(),
}));
vi.mock('@/lib/platform', () => ({ isNativePlatform: mocks.native }));
vi.mock('@/lib/barcodeScanner', () => ({
  scanNativeBarcode: mocks.scan,
  cameraErrorMessage: () => 'Caméra refusée',
}));
vi.mock('@zxing/library', () => ({
  BrowserMultiFormatReader: class {
    constructor() { mocks.reader(); }
    reset = mocks.reset;
    decodeFromConstraints = mocks.decode;
  },
}));

describe('useBarcodeScanner', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.native.mockReturnValue(true); });
  afterEach(cleanup);

  it('utilise le scanner natif sans démarrer ZXing', async () => {
    const onScan = vi.fn();
    mocks.scan.mockResolvedValue('3017620422003');
    const { result } = renderHook(() => useBarcodeScanner(onScan));
    await act(async () => { await result.current.startScanning(); });
    expect(onScan).toHaveBeenCalledExactlyOnceWith('3017620422003');
    expect(mocks.reader).not.toHaveBeenCalled();
    expect(mocks.decode).not.toHaveBeenCalled();
    expect(result.current.scanning).toBe(false);
  });

  it('ne lance aucune recherche en cas d’annulation', async () => {
    const onScan = vi.fn();
    mocks.scan.mockResolvedValue(null);
    const { result } = renderHook(() => useBarcodeScanner(onScan));
    await act(async () => { await result.current.startScanning(); });
    expect(onScan).not.toHaveBeenCalled();
    expect(result.current.cameraError).toBeNull();
    expect(mocks.reader).not.toHaveBeenCalled();
  });

  it('affiche les erreurs caméra puis permet de réessayer', async () => {
    mocks.scan.mockRejectedValueOnce(new Error('permission')).mockResolvedValueOnce('123');
    const onScan = vi.fn();
    const { result } = renderHook(() => useBarcodeScanner(onScan));
    await act(async () => { await result.current.startScanning(); });
    expect(result.current.cameraError).toBe('Caméra refusée');
    expect(result.current.scanning).toBe(false);
    expect(mocks.reader).not.toHaveBeenCalled();
    await act(async () => { await result.current.startScanning(); });
    expect(result.current.cameraError).toBeNull();
    expect(onScan).toHaveBeenCalledExactlyOnceWith('123');
  });

  it('ignore les doubles clics et les résultats après démontage', async () => {
    let resolve: (value: string) => void = () => { throw new Error('Scanner not started'); };
    mocks.scan.mockReturnValue(new Promise<string>((done) => { resolve = done; }));
    const onScan = vi.fn();
    const { result, unmount } = renderHook(() => useBarcodeScanner(onScan));
    let pending = Promise.resolve();
    act(() => {
      pending = result.current.startScanning();
      void result.current.startScanning();
    });
    expect(mocks.scan).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => { resolve('123'); await pending; });
    expect(onScan).not.toHaveBeenCalled();
  });

  it('attend la vidéo montée sur le web, décode une seule fois et libère la caméra', async () => {
    mocks.native.mockReturnValue(false);
    mocks.decode.mockImplementation(async (_constraints, video) => {
      expect(video).toBeInstanceOf(HTMLVideoElement);
      expect(document.body.contains(video)).toBe(true);
    });
    const onScan = vi.fn();
    function Harness() {
      const { videoRef, scanning, startScanning } = useBarcodeScanner(onScan);
      return <>
        <button onClick={startScanning}>Scanner</button>
        {scanning && <video ref={videoRef} />}
      </>;
    }
    render(<Harness />);
    fireEvent.click(screen.getByText('Scanner'));
    await waitFor(() => expect(mocks.decode).toHaveBeenCalledTimes(1));
    expect(mocks.scan).not.toHaveBeenCalled();
    expect(mocks.decode.mock.calls[0][0]).toEqual({
      audio: false, video: { facingMode: { ideal: 'environment' } },
    });
    const callback = mocks.decode.mock.calls[0][2];
    act(() => {
      callback({ getText: () => '123' });
      callback({ getText: () => '123' });
    });
    expect(onScan).toHaveBeenCalledExactlyOnceWith('123');
    expect(mocks.reset).toHaveBeenCalled();
  });
});