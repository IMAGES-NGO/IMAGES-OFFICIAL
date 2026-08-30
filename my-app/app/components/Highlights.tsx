"use client";

import { useState } from "react";
import Image from "next/image";

const slides = [
  {
    src: "/assets/images/AsraVisit.jpg",
    alt: "Asra Orphanage Visit",
    caption: "Jyoti Sarup Kanya Asra Visit",
  },
  {
    src: "/assets/images/Sonorous.jpeg",
    alt: "Sonorous General Body Meeting",
    caption: "Sonorous GBM 2026",
  },
  {
    src: "/assets/images/BlindInstitute.jpeg",
    alt: "Institute for the Blind",
    caption: "Visit to the Institute for the Blind",
  },
  {
    src: "/assets/images/KartarAsra.jpeg",
    alt: "Old Age Home Visit",
    caption: "Kartar Asra Trust Old Age Home Visit",
  },
];

export default function Highlights() {
  const [current, setCurrent] = useState(0);

  const previousSlide = () => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const nextSlide = () => {
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const slide = slides[current];

  return (
    <>
      <div className="m-4 h-screen rounded-2xl relative border border-slate-100" id="highlights">
        <div className="flex flex-col justify-center text-center items-center p-4">
          <div className="my-20">
            <h1 className="font-secondary">HIGHLIGHTS</h1>
            <h1 className="font-primary-italic text-4xl">
              Meet. Connect. Learn. Make an Impact.
            </h1>
          </div>

          <div className="mx-auto w-full max-w-3xl px-4">
            {/* Carousel */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md">
              <div className="relative aspect-[16/9] w-full">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  priority
                  className="object-cover transition-transform duration-700 ease-out"
                  sizes="(max-width: 768px) 100vw, 768px"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

                {/* Previous button */}
                <button
                  onClick={previousSlide}
                  aria-label="Previous image"
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                {/* Next button */}
                <button
                  onClick={nextSlide}
                  aria-label="Next image"
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/30 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

                {/* Dots */}
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

            {/* Caption below carousel */}
            <div className="mt-5 text-center">
              <p
                key={current}
                className="animate-[fadeIn_0.4s_ease-out] text-lg font-medium text-sky-500"
              >
                {slide.caption}
              </p>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {current + 1} / {slides.length}
              </p>
            </div>

            <div>
              <p className="font-secondary text-slate-400 my-20">
                From exciting GBMs and fun activities to insightful NGO visits,
                every IMAGES experience is a blend of purpose, people, and
                unforgettable memories..
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
