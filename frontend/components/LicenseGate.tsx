import React, { useState } from 'react';
import { activateLicense } from '../services/license';

const LANDING_URL = 'https://ventas-9w25.onrender.com';

interface Props {
  onActivated: () => void;
}

export const LicenseGate: React.FC<Props> = ({ onActivated }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error_not_found' | 'error_device' | 'error_generic'>('idle');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    const result = await activateLicense(email.trim());
    if (result.ok) {
      onActivated();
    } else {
      setStatus(
        result.reason === 'not_found'    ? 'error_not_found' :
        result.reason === 'other_device' ? 'error_device'    : 'error_generic'
      );
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0f0f0f',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 24, zIndex: 9999,
    }}>
      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎸</div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0 }}>AcordesPro</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: '6px 0 0' }}>Activá tu licencia para continuar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleActivate} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email con el que compraste"
            value={email}
            onChange={e => { setEmail(e.target.value); setStatus('idle'); }}
            required
            style={{
              width: '100%', padding: '14px 16px', borderRadius: 14,
              background: '#1c1c1c', border: '1px solid #2d2d2d',
              color: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box',
            }}
          />

          {/* Mensajes de error */}
          {status === 'error_not_found' && (
            <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ color: '#fca5a5', fontSize: 13, margin: 0, fontWeight: 600 }}>Licencia no encontrada</p>
              <p style={{ color: '#9ca3af', fontSize: 12, margin: '4px 0 8px' }}>
                Ese email no tiene una licencia activa.
              </p>
              <a href={LANDING_URL} target="_blank" rel="noopener noreferrer"
                style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>
                Comprar AcordesPro →
              </a>
            </div>
          )}
          {status === 'error_device' && (
            <div style={{ background: '#1a0a0a', border: '1px solid #7f1d1d', borderRadius: 10, padding: '10px 14px' }}>
              <p style={{ color: '#fca5a5', fontSize: 13, margin: 0, fontWeight: 600 }}>Activada en otro dispositivo</p>
              <p style={{ color: '#9ca3af', fontSize: 12, margin: '4px 0 0' }}>
                Esta licencia ya está vinculada a otro celular. Escribinos por WhatsApp si necesitás transferirla.
              </p>
            </div>
          )}
          {status === 'error_generic' && (
            <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', margin: 0 }}>
              Error de conexión. Verificá tu internet e intentá de nuevo.
            </p>
          )}

          <button type="submit" disabled={status === 'loading'}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14,
              background: status === 'loading' ? '#059669' : '#10b981',
              border: 'none', color: '#fff', fontSize: 16, fontWeight: 700,
              cursor: status === 'loading' ? 'default' : 'pointer',
              opacity: status === 'loading' ? 0.7 : 1,
              transition: 'opacity .15s',
            }}>
            {status === 'loading' ? 'Verificando...' : 'Activar'}
          </button>
        </form>

        <p style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', margin: 0 }}>
          La licencia se vincula a este dispositivo de forma permanente.<br/>
          Para soporte escribí al{' '}
          <a href="https://wa.me/59167435522" style={{ color: '#10b981' }}>WhatsApp</a>.
        </p>
      </div>
    </div>
  );
};
