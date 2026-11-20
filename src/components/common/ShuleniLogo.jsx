import logoMark from "../../assets/shuleni-logo-mark.svg";

export default function ShuleniLogo({ className = "", tone = "dark" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={logoMark} alt="" className="h-11 w-auto" />
      <p className={`text-xl font-extrabold leading-5 tracking-tight ${tone === "light" ? "text-white" : "text-[#12999E]"}`}>
        Shuleni
        <br />
        Online
      </p>
    </div>
  );
}
