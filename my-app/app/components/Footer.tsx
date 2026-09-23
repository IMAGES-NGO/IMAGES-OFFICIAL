import { Heart, Mail, MapPin } from "lucide-react";
import Link from "next/link";

const socialLinks = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/images_chandigarh?stkn=MTd4ZG9teHdnd3k0Zg==",
    path: "M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.6Zm8.9 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/images.chandigarh/",
    path: "M5 3.5A2.5 2.5 0 1 1 0 3.5a2.5 2.5 0 0 1 5 0ZM.5 8h4v13h-4V8Zm6.5 0h3.8v1.8h.1c.5-1 1.8-2.2 3.8-2.2 4.1 0 4.8 2.7 4.8 6.2V21h-4v-6.4c0-1.5 0-3.5-2.1-3.5s-2.4 1.6-2.4 3.4V21H7V8Z",
  },
];

export default function Footer() {
  return (
    <footer className="mx-4 mt-40 rounded-t-3xl bg-slate-950 px-6 py-12 text-white font-secondary md:px-12 md:py-16">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <p className="font-primary text-2xl tracking-[0.2em]">IMAGES</p>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
            A student-led community creating space to connect, learn, grow,
            and make a meaningful impact together.
          </p>
          <div className="mt-7 flex items-center gap-3">
            {socialLinks.map(({ label, href, path }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Visit IMAGES on ${label}`}
                className="rounded-full border border-slate-700 p-2.5 text-slate-300 transition-all hover:-translate-y-1 hover:border-white hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d={path} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Explore
          </h2>
          <nav className="mt-5 flex flex-col gap-3 text-sm text-slate-400">
            <Link className="transition-colors hover:text-white" href="/#features">
              About us
            </Link>
            <Link className="transition-colors hover:text-white" href="/highlights">
              Highlights
            </Link>
            <Link className="transition-colors hover:text-white" href="/events">
              Events
            </Link>
            <Link className="transition-colors hover:text-white" href="/login">
              Member login
            </Link>
          </nav>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Get in touch
          </h2>
          <div className="mt-5 space-y-4 text-sm text-slate-400">
            <a
              className="flex items-center gap-3 transition-colors hover:text-white"
              href="mailto:images.desk@gmail.com"
            >
              <Mail size={16} /> images.desk@gmail.com
            </a>
            <p className="flex items-center gap-3">
              <MapPin size={16} /> Chandigarh, India
            </p>
            <p className="leading-6">
              Have an idea or want to collaborate? We would love to hear from
              you.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-3 border-t border-slate-800 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
        <p>© 2026 IMAGES, Chandigarh. All rights reserved.</p>
        <p className="flex items-center gap-1.5">
          Made with <Heart size={13} fill="currentColor" /> by the IMAGES team
        </p>
      </div>
    </footer>
  );
}
