import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const m = vi.hoisted(() => ({ auth: { user: {email:'review@example.test'} as {email:string}|null, loading:false }, updateUser:vi.fn() }));
vi.mock('@/contexts/AuthContext',()=>({useAuth:()=>m.auth}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{updateUser:m.updateUser}}}));
import RecoveryPassword from '@/pages/auth/RecoveryPassword';
beforeEach(()=>{cleanup();vi.resetAllMocks();m.auth.user={email:'review@example.test'};m.auth.loading=false;m.updateUser.mockResolvedValue({error:null});});
const show=()=>render(<MemoryRouter><RecoveryPassword /></MemoryRouter>);
function fill(confirm='Unique-test-password-42'){fireEvent.change(screen.getByLabelText('Nouveau mot de passe'),{target:{value:'Unique-test-password-42'}});fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'),{target:{value:confirm}});fireEvent.click(screen.getByRole('button',{name:'Enregistrer le mot de passe'}));}
it('never presents a password change form without a session',()=>{m.auth.user=null;show();expect(screen.getByRole('alert')).toHaveTextContent('expiré');expect(screen.queryByLabelText('Nouveau mot de passe')).toBeNull();expect(m.updateUser).not.toHaveBeenCalled();});
it('rejects mismatching passwords before calling auth',()=>{show();fill('different-password-42');expect(screen.getByRole('alert')).toHaveTextContent('correspondent pas');expect(m.updateUser).not.toHaveBeenCalled();});
it('does not claim success on server rejection',async()=>{m.updateUser.mockResolvedValue({error:new Error('expired')});show();fill();await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('pas pu être enregistré'));expect(screen.queryByText('Votre mot de passe NutriZen a été enregistré.')).toBeNull();});
it('confirms only a successful authenticated password update',async()=>{show();fill();await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('a été enregistré'));expect(m.updateUser).toHaveBeenCalledExactlyOnceWith({password:'Unique-test-password-42'});expect(screen.queryByLabelText('Nouveau mot de passe')).toBeNull();});
