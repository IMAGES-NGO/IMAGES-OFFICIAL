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

export default function Highlights() {
  const sectionRef = useRef<HTMLElement>(null);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const touchStartX = useRef(0);

  const hasMultiple = slides.length > 1;
  const slide = slides[current];

  /* ─── Fetch latest events from API ─── */
  useEffect(() => {
    let ignore = false;

    async function fetchLatestEvents() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        if (res.ok && data.events && data.events.length > 0) {
          const eventsWithImages = data.events.filter(
            (evt: { images?: string[]; coverImage?: string | null }) => 
              evt.coverImage || (evt.images && evt.images.length > 0 && evt.images[0])
          );

          const latest5 = eventsWithImages.slice(0, 5);

          if (latest5.length > 0 && !ignore) {
            const mappedSlides: SlideItem[] = latest5.map(
              (evt: {
                id: string;
                title: string;
                images?: string[];
                coverImage?: string | null;
                eventType: string;
              }) => ({
                src: evt.coverImage || (evt.images && evt.images.length > 0 ? evt.images[0] : ""),
                alt: evt.title || "Event",
                caption: evt.title,
                category: evt.eventType,
                eventId: evt.id,
              })
            );
            setSlides(mappedSlides);
            setCurrent(0);
          } else if (!ignore) {
            // No events found, but we still want to show the component
            setSlides([]);
          }
        } else if (!ignore) {
          setSlides([]);
        }
      } catch (err) {
        console.warn(
          "Could not load latest events for highlights:",
          err
        );
        if (!ignore) setSlides([]);
      }
    }

    fetchLatestEvents();
    setIsLoaded(true);
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
    // Only set up intersection observer when we actually render the section
    if (!isLoaded || (slides.length === 0 && !isLoaded)) return;
    
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
  }, [isLoaded, slides.length]);

  if (!isLoaded) return null;

  const displaySlides = slides.length > 0 ? slides : [
    {
      src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=2000",
      alt: "Stay Tuned for Events",
      caption: "New Events Coming Soon!",
      category: "STAY TUNED",
    }
  ];

  const activeHasMultiple = displaySlides.length > 1;

  return (
    <section
      id="highlights"
      ref={sectionRef}
      className="relative py-24 lg:py-32 bg-zinc-50/50 overflow-hidden"
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
      </div>

      {/* ─── Carousel ─── */}
      <div
        className="scroll-reveal w-full mt-12 lg:mt-16 relative"
        style={{ animationDelay: "80ms" }}
        role="region"
        aria-label="Event highlights carousel"
        aria-roledescription="carousel"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Track container */}
        <div className="group relative overflow-hidden w-full h-[50vh] sm:h-[60vh] lg:h-[75vh] bg-zinc-900 rounded-3xl">
          <div 
            className="flex w-full h-full transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {displaySlides.map((s, index) => (
              <div key={index} className="relative w-full h-full shrink-0">
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  priority={index === 0}
                  className="object-cover"
                  sizes="100vw"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                
                {/* Content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12 lg:px-24">
                  {s.category && (
                    <span className="inline-block mb-3 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-bold text-white uppercase tracking-wider border border-white/20 font-secondary">
                      {s.category}
                    </span>
                  )}
                  <h3 className="font-secondary font-bold text-2xl sm:text-4xl lg:text-5xl text-white drop-shadow-md">
                    {s.caption}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          {/* Navigation arrows */}
          {activeHasMultiple && (
            <>
              <button
                onClick={previousSlide}
                aria-label="Previous highlight"
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white transition-all duration-200 hover:bg-black/40 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 z-10"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={nextSlide}
                aria-label="Next highlight"
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white transition-all duration-200 hover:bg-black/40 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 z-10"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {/* Progress indicator dots */}
          {activeHasMultiple && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {displaySlides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrent(index)}
                  aria-label={`Go to highlight ${index + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    current === index
                      ? "w-8 h-2 bg-white"
                      : "w-2 h-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[var(--content-width)] mx-auto px-6 mt-8">
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
