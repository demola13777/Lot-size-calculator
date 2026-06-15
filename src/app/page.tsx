import QuantumCalculator from "@/components/QuantumCalculator";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-4xl">
        <QuantumCalculator />
      </div>
    </main>
  );
}
