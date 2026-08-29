import Image from "next/image";
import Navbar from "./components/Navbar";

export default function Home() {
  return (
    <>
      <div className="bg-white h-screen w-full">
        <div className="m-4 h-screen rounded-2xl relative overflow-hidden">
          <Navbar />
            <Image
              src="/assets/images/bg-image.jpg"
              alt="background"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
    </>
  );
}
