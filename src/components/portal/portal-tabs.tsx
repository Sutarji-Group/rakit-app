'use client';

import { useState, type ReactNode } from 'react';
import { Tabs, type TabItem } from '@/components/ui';

export interface PortalTabPanel {
  value: string;
  label: string;
  count?: number;
  content: ReactNode;
}

/**
 * Tab isi portal.
 *
 * Isi tiap tab dirender di server dan dikirim sebagai prop, sehingga
 * perpindahan tab tidak memicu permintaan baru — penting di koneksi seluler
 * yang menjadi mayoritas trafik.
 */
export function PortalTabs({ panels }: { panels: PortalTabPanel[] }) {
  const [value, setValue] = useState(panels[0]?.value ?? '');
  const active = panels.find((panel) => panel.value === value) ?? panels[0];

  const items: TabItem[] = panels.map((panel) => ({
    value: panel.value,
    label: panel.label,
    count: panel.count,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Tabs items={items} value={value} onChange={setValue} />
      <div id="panel-portal" role="tabpanel" tabIndex={0} className="focus-visible:outline-none">
        {active?.content}
      </div>
    </div>
  );
}
