import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import { WhatWeDo } from "./components/WhatWeDo";
import Highlights from "./components/Highlights";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <WhatWeDo />
      <Highlights />
      <Footer />
    </>
  );
}
