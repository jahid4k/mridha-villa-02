'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/components/providers/LanguageProvider';

export default function PrintButton() {
  const { t } = useI18n();
  return (
    <Button variant="outline" leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
      {t('Print')}
    </Button>
  );
}
