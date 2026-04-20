import type { Metadata } from 'next';
import ReelBitCalculator from '@/components/ReelBitCalculator';

export const metadata: Metadata = {
  title: 'Revenue Calculator — ReelBit',
  description: 'Model ReelBit\'s daily earnings across reelbit.fun and reelbit.casino with adjustable assumptions.',
};

export default function CalculatorPage() {
  return <ReelBitCalculator />;
}
