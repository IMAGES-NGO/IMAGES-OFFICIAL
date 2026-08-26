import Image from "next/image";

export default function Footer() {
  return (
    <footer className="flex items-center justify-between border-t border-zinc-100 px-8 py-8 text-sm text-zinc-500 sm:px-16 dark:border-zinc-900">
      <span>© {new Date().getFullYear()} IMAGES, Inc.</span>
      <div className="flex items-center gap-2">
        <span>Built with Next.js</span>
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={60}
          height={12}
        />
      </div>
    </footer>
  );
}