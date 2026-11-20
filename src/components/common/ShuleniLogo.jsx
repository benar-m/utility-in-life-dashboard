import logoMark from "../../assets/shuleni-logo-mark.svg";

const TEXT_TONES = {
  dark: "text-[#12999E]", // on white
  navy: "text-shuleni-navy", // on turquoise
  light: "text-white", // on navy
};

export default function ShuleniLogo({ className = "", tone = "dark" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={logoMark} alt="" className="h-11 w-auto" />
      <p className={`text-xl font-extrabold leading-5 tracking-tight ${TEXT_TONES[tone]}`}>
        Shuleni
        <br />
        Online
      </p>
    </div>
  );
}
