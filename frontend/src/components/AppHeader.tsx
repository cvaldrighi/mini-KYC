import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

export function AppHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-7 text-primary" />
          <span className="text-xl font-bold tracking-tight">mini-KYC</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
