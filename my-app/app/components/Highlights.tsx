"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SlideItem {
  src: string;
  alt: string;
  caption: string;
  category?: string;
  eventId?: string;
}

const DEFAULT_SLIDES: SlideItem[] = [
  {
    src: "/assets/images/AsraVisit.jpg",
    alt: "Asra Orphanage Visit",
    caption: "Jyoti Sarup Kanya Asra Visit",
    category: "VISIT",
  },
  {
    src: "/assets/images/Sonorous.jpeg",
    alt: "Sonorous General Body Meeting",
    caption: "Sonorous GBM 2026",
    category: "GBM",
  },
  {
    src: "/assets/images/BlindInstitute.jpeg",
    alt: "Institute for the Blind",
    caption: "Visit to the Institute for the Blind",
    category: "VISIT",
  },
  {
    src: "/assets/images/KartarAsra.jpeg",
    alt: "Old Age Home Visit",
    caption: "Kartar Asra Trust Old Age Home Visit",
    category: "VISIT",
  },
];

export default function Highlights() {
  const [slides, setSlides] = useState<SlideItem[]>(DEFAULT_SLIDES);
  const [current, setCurrent] = useState(0);

  // Dynamically fetch latest 5 events from the database/API
  useEffect(() => {
    let ignore = false;

    async function fetchLatestEvents() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        if (res.ok && data.events && data.events.length > 0) {
          // Filter for events with at least one image (the cover image)
          const eventsWithImages = data.events.filter(
            (evt: { images?: string[] }) => evt.images && evt.images.length > 0
          );

          // Take the latest 5 events
          const latest5 = eventsWithImages.slice(0, 5);

          if (latest5.length > 0 && !ignore) {
            const mappedSlides: SlideItem[] = latest5.map(
              (evt: { id: string; title: string; images: string[]; eventType: string }) => ({
                src: evt.images[0], // cover image of the event
                alt: evt.title,
                caption: evt.title, // title of that event below that
                category: evt.eventType,
                eventId: evt.id,
              })
            );
            setSlides(mappedSlides);
            setCurrent(0);
          }
        }
      } catch (err) {
        console.warn("Could not load latest events for highlights, using defaults:", err);
      }
    }

    fetchLatestEvents();
    return () => {
      ignore = true;
    };
  }, []);

  // Automatic animation carousel loop
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 4500);

    return () => clearInterval(timer);
  }, [slides.length]);

  const previousSlide = () => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const slide = slides[current] || DEFAULT_SLIDES[0];

  return (
    <div className="mx-4 my-8 rounded-3xl relative border border-slate-100 bg-white" id="highlights">
      <div className="flex flex-col justify-center text-center items-center p-4">
        <div className="my-14 sm:my-16">
          <span className="font-secondary text-xs sm:text-sm text-sky-600 font-bold uppercase tracking-widest bg-sky-50 px-3 py-1 rounded-full border border-sky-100">
            HIGHLIGHTS
          </span>
          <h2 className="font-primary-italic text-3xl sm:text-5xl mt-3 text-zinc-900">
            Meet. Connect. Learn. Make an Impact.
          </h2>
        </div>

        <div className="mx-auto w-full max-w-3xl px-2 sm:px-4">
          {/* Carousel Box */}
          <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-zinc-900 shadow-2xl">
            <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full">
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 768px"
              />

              {/* Subtle gradient vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Event category pill inside image box */}
              {slide.category && (
                <span className="absolute top-4 left-4 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white uppercase tracking-wider">
                  {slide.category}
                </span>
              )}

              {/* Previous button */}
              <button
                onClick={previousSlide}
                aria-label="Previous image"
                className="absolute left-3 sm:left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/70 focus:outline-none"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              {/* Next button */}
              <button
                onClick={nextSlide}
                aria-label="Next image"
                className="absolute right-3 sm:right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/70 focus:outline-none"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>

              {/* Indicator Dots */}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrent(index)}
                    aria-label={`Go to slide ${index + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      current === index
                        ? "w-7 bg-white"
                        : "w-2 bg-white/50 hover:bg-white/80"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Title and metadata below the image box */}
          <div className="mt-5 text-center">
            <h3
              key={current}
              className="animate-[fadeIn_0.4s_ease-out] text-lg sm:text-xl font-bold text-zinc-900"
            >
              {slide.caption}
            </h3>

            <p className="mt-1 text-xs text-zinc-400">
              {current + 1} of {slides.length} highlights
            </p>

            <div className="mt-4">
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline transition"
              >
                <span>Browse all initiatives & drives</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div>
            <p className="font-secondary text-slate-400 my-16 text-sm max-w-xl mx-auto leading-relaxed">
              From exciting GBMs and interactive student workshops to inspiring NGO visits,
              every IMAGES experience is a blend of purpose, people, and unforgettable memories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
