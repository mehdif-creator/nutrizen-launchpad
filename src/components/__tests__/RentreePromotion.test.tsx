import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnnouncementBar } from '@/components/landing/AnnouncementBar';
import { RentreePromotion } from '@/components/landing/RentreePromotion';
import { isRentreeOfferActive } from '@/config/landingOffer';

describe('Offre de rentrée', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-10T10:00:00+02:00'));
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('affiche le code et la date sans inventer une remise de 50 %', () => {
    render(<RentreePromotion />);
    expect(screen.getByRole('button', { name: 'Copier le code RENTREE50' })).toBeVisible();
    expect(screen.getByText('30 septembre 2026 inclus')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Voir les offres' })).toHaveAttribute('href', '#tarifs');
    expect(screen.queryByText(/50\s*%/)).not.toBeInTheDocument();
  });

  it('copie le code et confirme uniquement après succès', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<RentreePromotion />);
    fireEvent.click(screen.getByRole('button', { name: 'Copier le code RENTREE50' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Code copié !'));
    expect(writeText).toHaveBeenCalledWith('RENTREE50');
  });

  it('propose la saisie manuelle si la copie est bloquée', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    render(<RentreePromotion />);
    fireEvent.click(screen.getByRole('button', { name: 'Copier le code RENTREE50' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('saisissez RENTREE50 au paiement'));
    expect(screen.queryByText('Code copié !')).not.toBeInTheDocument();
  });

  it('reste visible même si l’ancien bandeau a été fermé', () => {
    localStorage.setItem('nutrizen_announcement_dismissed', '1');
    render(<AnnouncementBar />);
    expect(screen.getByRole('complementary', { name: 'Offre de rentrée' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Fermer' })).not.toBeInTheDocument();
  });

  it('ne ferme que l’annonce de l’essai, pas la promotion', () => {
    render(<AnnouncementBar />);
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    expect(screen.getByRole('button', { name: 'Copier le code RENTREE50' })).toBeVisible();
    expect(localStorage.getItem('nutrizen_announcement_dismissed')).toBe('1');
  });

  it('reste active jusqu’à la dernière milliseconde du 30 septembre, heure de Paris', () => {
    expect(isRentreeOfferActive(Date.parse('2026-09-30T23:59:59.999+02:00'))).toBe(true);
    expect(isRentreeOfferActive(Date.parse('2026-10-01T00:00:00+02:00'))).toBe(false);
  });

  it('ne montre plus le bandeau ni le rappel tarifaire après expiration', () => {
    vi.mocked(Date.now).mockReturnValue(Date.parse('2026-10-01T00:00:00+02:00'));
    render(<><RentreePromotion /><RentreePromotion placement="pricing" /></>);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('masque les offres à minuit même si la page reste ouverte', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-30T23:59:59+02:00'));
    render(<RentreePromotion />);
    expect(screen.getByRole('complementary')).toBeVisible();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});