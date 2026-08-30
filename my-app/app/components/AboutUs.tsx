import { HeartHandshake } from "lucide-react";
import { Megaphone } from "lucide-react";
import { UserStar } from "lucide-react";
import { PartyPopper } from "lucide-react";

export default function About() {
  return (
    <>
      <div className="flex flex-col text-center m-4 p-4 justify-center">
        <h1 className="text-sky-500 font-secondary font-bold mt-10">ABOUT US</h1>
        <h1 className="text-4xl font-primary-italic my-5 mt-0 mb-20">What do we do ?</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 mb-10 gap-y-8 place-items-center font-secondary">
          <div className="row-span-1 flex gap-x-5">
            <HeartHandshake color="red"/>
            <p>NGO Events</p>
          </div>
          <div className="row-span-1 flex gap-x-5">
            <Megaphone color="blue" />
            <p>General Body Meetings</p>
          </div>
          <div className="row-span-1 flex gap-x-5">
            <UserStar color="gold"/>
            <p>Mock Interviews</p>
          </div>
          <div className="row-span-1 flex gap-x-5">
            <PartyPopper color="green"/>
            <p>Lots of Fun!!</p>
          </div>
        </div>

        <p className="text-justify lg:mx-20 text-slate-600 font-secondary">
          At IMAGES, we believe in learning beyond the classroom and building
          connections that last a lifetime. Through a blend of professional
          development, meaningful engagement, and plenty of fun, we create
          opportunities for students to grow, connect, and thrive. Backed by a
          vast and active alumni network, IMAGES helps students build valuable
          connections, gain exposure to diverse opportunities, and pave the way
          towards internships, placements, and beyond.
        </p>
      </div>
    </>
  );
}
