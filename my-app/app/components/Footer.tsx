import Image from "next/image";
import { Heart, PersonStanding } from "lucide-react";
import { AtSign } from "lucide-react";

export default function Footer() {
  return (
    <>
      <div className="bg-black mt-40 text-white font-secondary mx-4 rounded-t-2xl">
        <div className="grid md:grid-cols-2 place-items-center ">
          <div className="p-4 m-4">
            <h1 className="flex justify-between items-center">
              Community <PersonStanding />
            </h1>
            <hr className="border-t border-gray-400 my-4 w-75" />
            <div className="flex flex-col text-gray-400">
              <a href="">Instagram</a>
              <a href="">Linkedin</a>
            </div>
          </div>
          <div className="p-4 m-4">
            <h1 className="font-primary flex justify-between items-center tracking-widest">
              IMAGES
              <Image
                src="/assets/images/logo.jpg"
                width={30}
                height={20}
                alt="IMAGES"
                className="rounded-full"
              />
            </h1>
            <hr className="border-t border-gray-400 my-4 w-75" />
            <div className="flex flex-col text-gray-400">
              <a href="mailto:">someone@email.com</a>
              <a href="">+91 123 456 789</a>
            </div>
          </div>
        </div>
        <hr className="border-t border-gray-400 my-4 w-auto mx-10" />
        <div className="flex flex-col items-center md:flex-row justify-between mx-15 text-sm py-5">
          <h1 className="flex items-center gap-x-2">
            <AtSign width={15} height={15}/>
            2026 IMAGES, Chandigarh. All Rights Reserved
          </h1>
          <h1 className="flex gap-x-2 items-center">Made with <Heart fill="red" color="none" height={20} width={20}/> by developers at IMAGES</h1>
        </div>

      </div>
    </>
  );
}
