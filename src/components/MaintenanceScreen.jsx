import React from 'react';
import { RefreshCw, Wrench } from 'lucide-react';

export default function MaintenanceScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, #1a1f3c 0%, #05070f 70%)',
        color: '#fff',
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <div
          style={{
            fontFamily: "Impact, 'Arial Narrow', sans-serif",
            fontSize: 'clamp(28px, 6vw, 46px)',
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: 'uppercase',
            textShadow:
              '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
            lineHeight: 1.15,
            marginBottom: 8,
          }}
        >
          I DECLARE
          <br />
          BANKRUPTCY!
        </div>

        <div style={{ fontSize: 13, color: '#8ba3d4', marginBottom: 28 }}>
          (mentira — é só uma atualização rapidinha, ninguém faliu)
        </div>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(99,160,255,0.12)',
            border: '1px solid rgba(99,160,255,0.35)',
            borderRadius: 12,
            padding: '14px 22px',
            marginBottom: 18,
          }}
        >
          <Wrench size={20} color="#63a0ff" />
          <span style={{ fontSize: 16, fontWeight: 700 }}>Site em atualização</span>
        </div>

        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 1.5 }}>
          Estamos publicando melhorias no Contabilizador de Comissões. Isso costuma
          levar só alguns minutos — volte a tentar daqui a pouco.
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: '#4f8fff',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} /> Tentar novamente
        </button>
      </div>
    </div>
  );
}
