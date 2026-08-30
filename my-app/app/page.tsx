import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/AboutUs";
import Highlights from "./components/Highlights";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <About />
      <Highlights />
      <Footer />
    </>
  );
}
