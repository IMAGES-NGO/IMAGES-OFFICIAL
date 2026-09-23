"use client";

import { useEffect, useRef } from "react";
import { HeartHandshake, Megaphone, BriefcaseBusiness, Sparkles } from "lucide-react";

const FEATURES = [
  {
    icon: HeartHandshake,
    title: "NGO Events",
    description: "Meaningful visits and drives that connect students with communities in need.",
  },
  {
    icon: Megaphone,
    title: "General Body Meetings",
    description: "Vibrant sessions to plan, discuss and bond as a community.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Mock Interviews",
    description: "Practice sessions with alumni and professionals to sharpen your edge.",
  },
  {
    icon: Sparkles,
    title: "Lots of Fun!",
    description: "Game nights, cultural fests, and memories that last a lifetime.",
  },
];

const STATS = [
  { value: "100+", label: "Active Members" },
  { value: "15+", label: "Events Hosted" },
  { value: "50+", label: "Alumni Network" },
];

export default function AboutUs() {
  const sectionRef = useRef<HTMLElement>(null);

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
      {
        threshold: 0.15,
        rootMargin: "0px 0px -60px 0px",
      }
    );

    const elements = sectionRef.current?.querySelectorAll(".scroll-reveal");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="features"
      ref={sectionRef}
      className="py-24 lg:py-32 max-w-[var(--content-width)] mx-auto px-6"
    >
      {/* Heading Block */}
      <div className="scroll-reveal text-center opacity-0 translate-y-8 [&.is-visible]:opacity-100 [&.is-visible]:translate-y-0 transition-all duration-700 ease-out">
        <span className="bg-sky-50 border border-sky-100 text-sky-600 font-bold uppercase text-xs tracking-widest px-3 py-1 rounded-full font-secondary inline-block">
          ABOUT US
        </span>
        <h2 className="font-primary-italic text-4xl sm:text-5xl lg:text-6xl text-zinc-900 mt-4">
          What do we do?
        </h2>
        <p className="font-secondary text-lg text-zinc-500 mt-3 max-w-xl mx-auto">
          Empowering students through purpose, community, and unforgettable experiences.
        </p>
      </div>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 lg:mt-20">
        {FEATURES.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="scroll-reveal opacity-0 translate-y-8 [&.is-visible]:opacity-100 [&.is-visible]:translate-y-0 transition-all duration-700 ease-out"
              style={{
                transitionDelay: `${index * 80}ms`,
                animationDelay: `${index * 80}ms`
              }}
            >
              <div
                tabIndex={0}
                className="group relative h-full bg-white border border-zinc-100 rounded-2xl p-6 lg:p-8 hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] hover:border-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 transition-all duration-[var(--transition-fast)]"
              >
                <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center mb-5 transition-colors duration-[var(--transition-fast)] group-hover:bg-sky-500">
                  <Icon size={22} strokeWidth={1.5} className="text-sky-500 transition-colors duration-200 group-hover:text-white" />
                </div>
                <h3 className="font-secondary font-bold text-zinc-900 text-lg">
                  {feature.title}
                </h3>
                <p className="font-secondary text-zinc-500 text-sm mt-2 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* About paragraph */}
      <div className="scroll-reveal opacity-0 translate-y-8 [&.is-visible]:opacity-100 [&.is-visible]:translate-y-0 transition-all duration-700 ease-out mt-16 lg:mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 max-w-4xl mx-auto">
          <p className="font-primary-italic text-2xl lg:text-3xl text-zinc-900 leading-snug">
            At IMAGES, we believe in <em className="text-sky-500 not-italic">learning beyond the classroom</em> and building connections that last a lifetime.
          </p>
          <div className="font-secondary text-zinc-600 leading-relaxed space-y-4">
            <p>
              Founded in 1991, IMAGES is a Non Profit Organization (NPO) and Non Government Organization (NGO) comprising students of PEC, University of Technology, Chandigarh. Our organization&apos;s motto is &quot;exploring in you...you!!&quot; which clearly emphasizes that the chief aim of the body is all round development of its members.
            </p>
            <p>
              The organization aims at multi-faceted development of its members through innovative and enterprising projects and regular meetings.
            </p>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="scroll-reveal opacity-0 translate-y-8 [&.is-visible]:opacity-100 [&.is-visible]:translate-y-0 transition-all duration-700 ease-out mt-12 lg:mt-16">
        <div className="flex flex-wrap justify-center gap-8 lg:gap-16 py-8 border-t border-zinc-100">
          {STATS.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="font-primary-italic text-3xl lg:text-4xl text-zinc-900">
                {stat.value}
              </div>
              <div className="font-secondary text-sm text-zinc-500 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
