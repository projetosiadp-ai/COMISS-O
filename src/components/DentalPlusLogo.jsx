import React from 'react';

function DentalPlusLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1px', fontSize: '22px', fontWeight: '700', whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--logo-dental-color)' }}>Dental</span>
      <span style={{ color: 'var(--primary)' }}>Plus</span>
    </div>
  );
}

export default DentalPlusLogo;
