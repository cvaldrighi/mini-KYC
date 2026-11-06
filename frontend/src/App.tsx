export default function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center px-5 py-4 sm:px-10">
          <span className="text-xl font-bold tracking-tight">mini-KYC</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-10">
        <h1 className="text-3xl font-bold tracking-tight">Enviar documento</h1>
        <p className="mt-2 text-muted-foreground">
          JPEG, PNG ou PDF do RG ou da CNH, até 5 MB.
        </p>
      </main>
    </div>
  );
}
