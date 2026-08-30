export default function Hero() {
  return (
    <>
      <div className="mx-4 h-screen rounded-2xl relative custom-hero-bg mt-[-55]">
        <div className="relative top-1/3 md:top-1/3 z-10 flex flex-col items-center">
          <div className="font-secondary">Welcome to IMAGES</div>
          <div className="mt-5 font-primary-italic font-extrabold text-4xl px-20 text-center md:text-9xl ">
            Exploring in <br /> you .... You !!
          </div>
          <button className="mt-5 md:mt-10 bg-gray-200/40 border border-gray-100/30 px-4 py-2 rounded-lg shadow-2xl font-secondary font-bold backdrop-blur-md hover:bg-white transition-colors">
            Who We Are
          </button>
        </div>
      </div>
    </>
  );
}
