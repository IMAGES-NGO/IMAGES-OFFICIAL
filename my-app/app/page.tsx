import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import { WhatWeDo } from "./components/WhatWeDo";
import Highlights from "./components/Highlights";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <WhatWeDo />
      <div className="m-4 h-screen rounded-2xl relative border border-slate-100">
        <Highlights />
      </div>
    </>
  );
}
