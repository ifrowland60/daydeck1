export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
        Daydeck
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
        Foundation setup is complete.
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
        This scaffold is ready for Phase 2 authentication work. The app now has a clean
        baseline, Supabase configuration hooks, and a folder structure aligned with the MVP
        build spec.
      </p>
      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-sm font-medium text-slate-900">Next implementation target</p>
        <p className="mt-2 text-sm text-slate-600">
          Build the combined auth experience at <code>/auth</code> and protect{" "}
          <code>/app</code>.
        </p>
      </div>
    </main>
  );
}
