import { Link } from "@tanstack/react-router";
import { usePersona, PERSONA_SUBTITLE } from "@/lib/persona";

interface LogoProps {
  to?: string;
  className?: string;
  showText?: boolean;
}

export function Logo({ to = "/", className = "", showText = true }: LogoProps) {
  const { persona } = usePersona();
  const subtitle = PERSONA_SUBTITLE[persona];
  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/logo.svg"
        alt="Northstar University"
        className="h-10 w-10 rounded-lg shadow-sm ring-1 ring-black/5 shrink-0"
      />
      {showText && (
        <span className="flex flex-col leading-tight">
          <span className="text-lg font-bold tracking-tight text-[#26306b] dark:text-blue-300">
            Northstar University
          </span>
          {subtitle && (
            <span className="text-sm font-bold uppercase tracking-wide text-blue-900 dark:text-blue-400">
              {subtitle}
            </span>
          )}
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;
