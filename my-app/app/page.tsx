export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-24 text-center sm:px-16">
      <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-black dark:text-white sm:text-5xl">
        Run your whole team from one place
      </h1>
      <p className="mt-5 max-w-lg text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        IMAGES gives you a community to enhance public speaking and participate in NGO events.
      </p>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <a href="#" className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
          Get started for free
        </a>
        <a href="#" className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-black transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900">
          Watch demo
        </a>
      </div>
    </div>
  );
}