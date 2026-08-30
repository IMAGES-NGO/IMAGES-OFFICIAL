import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import { WhatWeDo } from "./components/WhatWeDo";

export default function Home() {
  return (
    <>
      <div className="m-4 h-screen rounded-2xl relative custom-hero-bg">
          <Navbar />
          <Hero />
      </div>
        <WhatWeDo />
    </>
  );
}
