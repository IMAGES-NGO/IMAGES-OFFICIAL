"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

/* ─── Data Types ─── */
interface SlideItem {
  src: string;
  alt: string;
  caption: string;
  description?: string;
  category?: string;
  eventId?: string;
  date?: string;
}

/* ─── Default slides (editable) ─── */
const DEFAULT_SLIDES: SlideItem[] = [
  {
    src: "/assets/images/AsraVisit.jpg",
    alt: "Asra Orphanage Visit",
    caption: "Jyoti Sarup Kanya Asra Visit",
    description:
      "A heartfelt day spent with the children at Jyoti Sarup Kanya Asra.",
    category: "Visit",
  },
  {
    src: "/assets/images/Sonorous.jpeg",
    alt: "Sonorous General Body Meeting",
    caption: "Sonorous GBM 2026",
    description:
      "Our flagship general body meeting bringing the community together.",
    category: "GBM",
  },
  {
    src: "/assets/images/BlindInstitute.jpeg",
    alt: "Institute for the Blind",
    caption: "Visit to the Institute for the Blind",
    description:
      "An inspiring visit to connect with and support the visually impaired.",
    category: "Visit",
  },
  {
    src: "/assets/images/KartarAsra.jpeg",
    alt: "Old Age Home Visit",
    caption: "Kartar Asra Trust Old Age Home Visit",
    description:
      "Spending quality time with the elderly at Kartar Asra Trust.",
    category: "Visit",
  },
];

export default function Highlights() {
  const sectionRef = useRef<HTMLElement>(null);
  const [slides, setSlides] = useState<SlideItem[]>(DEFAULT_SLIDES);
  const [current, setCurrent] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const touchStartX = useRef(0);

  const hasMultiple = slides.length > 1;
  const slide = slides[current] || DEFAULT_SLIDES[0];

  /* ─── Fetch latest events from API ─── */
  useEffect(() => {
    let ignore = false;

    async function fetchLatestEvents() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        if (res.ok && data.events && data.events.length > 0) {
          const eventsWithImages = data.events.filter(
            (evt: { images?: string[] }) => evt.images && evt.images.length > 0
          );

          const latest5 = eventsWithImages.slice(0, 5);

          if (latest5.length > 0 && !ignore) {
            const mappedSlides: SlideItem[] = latest5.map(
              (evt: {
                id: string;
                title: string;
                images: string[];
                eventType: string;
              }) => ({
                src: evt.images[0],
                alt: evt.title,
                caption: evt.title,
                category: evt.eventType,
                eventId: evt.id,
              })
            );
            setSlides(mappedSlides);
            setCurrent(0);
          }
        }
      } catch (err) {
        console.warn(
          "Could not load latest events for highlights, using defaults:",
          err
        );
      }
    }

    fetchLatestEvents();
    return () => {
      ignore = true;
    };
  }, []);

  /* ─── Auto-advance carousel ─── */
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  /* ─── Reset image states on slide change ─── */
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [current]);

  /* ─── Navigation ─── */
  const previousSlide = useCallback(() => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  /* ─── Keyboard navigation ─── */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!hasMultiple) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        previousSlide();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextSlide();
      }
    },
    [hasMultiple, previousSlide, nextSlide]
  );

  /* ─── Touch / swipe ─── */
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!hasMultiple) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 50) {
      if (delta > 0) nextSlide();
      else previousSlide();
    }
  };

  /* ─── Scroll reveal ─── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    const elements = sectionRef.current?.querySelectorAll(".scroll-reveal");
    elements?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="highlights"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-zinc-50/50"
    >
      <div className="max-w-[var(--content-width)] mx-auto px-6">
        {/* ─── Heading ─── */}
        <div className="scroll-reveal text-center" style={{ animationDelay: "0ms" }}>
          <span className="inline-block bg-sky-50 border border-sky-100 text-sky-600 font-bold uppercase text-xs tracking-widest px-3 py-1 rounded-full font-secondary">
            HIGHLIGHTS
          </span>
          <h2 className="font-primary-italic text-4xl sm:text-5xl lg:text-6xl text-zinc-900 mt-4">
            Meet. Connect. Learn. Make an Impact.
          </h2>
        </div>

        {/* ─── Carousel ─── */}
        <div
          className="scroll-reveal mx-auto w-full max-w-5xl mt-12 lg:mt-16"
          style={{ animationDelay: "80ms" }}
          role="region"
          aria-label="Event highlights carousel"
          aria-roledescription="carousel"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Image box */}
          <div className="group relative overflow-hidden rounded-2xl shadow-[var(--shadow-carousel)]">
            <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full bg-gradient-to-br from-sky-100 via-sky-50 to-zinc-100">
              {/* Gradient fallback (always behind image) */}

              {/* Image */}
              {!imageError && (
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority={current === 0}
                  className={`object-cover transition-all duration-700 ease-out group-hover:scale-[1.03] ${
                    imageLoaded ? "" : "img-blur-up"
                  } ${imageLoaded ? "img-blur-up loaded" : "img-blur-up"}`}
                  sizes="(max-width: 768px) 100vw, 1024px"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />

              {/* Category pill */}
              {slide.category && (
                <span className="absolute top-4 left-4 sm:top-5 sm:left-5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-white uppercase tracking-wider border border-white/20 font-secondary">
                  {slide.category}
                </span>
              )}

              {/* Content overlay (bottom) */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                <h3
                  key={`caption-${current}`}
                  className="font-secondary font-bold text-xl sm:text-2xl text-white animate-[fadeIn_0.4s_ease-out]"
                >
                  {slide.caption}
                </h3>
                {slide.description && (
                  <p className="font-secondary text-sm text-white/80 mt-1 max-w-lg">
                    {slide.description}
                  </p>
                )}
                {slide.date && (
                  <p className="font-secondary text-xs text-white/60 mt-2">
                    {slide.date}
                  </p>
                )}
              </div>

              {/* Navigation arrows (only if multiple slides) */}
              {hasMultiple && (
                <>
                  <button
                    onClick={previousSlide}
                    aria-label="Previous highlight"
                    className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white transition-all duration-200 hover:bg-white/30 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={nextSlide}
                    aria-label="Next highlight"
                    className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white transition-all duration-200 hover:bg-white/30 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}

              {/* Progress indicator dots (only if multiple slides) */}
              {hasMultiple && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrent(index)}
                      aria-label={`Go to highlight ${index + 1}`}
                      className={`rounded-full transition-all duration-300 ${
                        current === index
                          ? "w-6 h-1.5 bg-white"
                          : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Slide counter (only if multiple) */}
          {hasMultiple && (
            <p className="text-xs text-zinc-400 text-center mt-3 font-secondary">
              {current + 1} of {slides.length}
            </p>
          )}
        </div>

        {/* ─── Browse button ─── */}
        <div
          className="scroll-reveal mt-8 text-center"
          style={{ animationDelay: "160ms" }}
        >
          <Link
            href="/events"
            className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-900 text-white font-secondary font-semibold text-sm transition-all duration-200 hover:bg-sky-600 hover:scale-[1.02] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
          >
            Browse All Initiatives & Drives
            <ArrowRight
              size={16}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
        </div>

        {/* ─── Closing line ─── */}
        <div
          className="scroll-reveal mt-12 lg:mt-16 text-center"
          style={{ animationDelay: "240ms" }}
        >
          <p className="font-secondary text-zinc-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            From exciting GBMs and interactive student workshops to inspiring
            NGO visits, every IMAGES experience is a blend of purpose, people,
            and unforgettable memories.
          </p>
        </div>
      </div>
    </section>
  );
}
