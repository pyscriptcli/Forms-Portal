import Image from "next/image";

interface PrimeLogoProps {
  className?: string;
  variant?: "blue" | "white";
}

export function PrimeLogo({ className = "h-11", variant = "blue" }: PrimeLogoProps) {
  return (
    <div className={`flex items-center select-none ${className}`}>
      <Image
        src={variant === "white" ? "/prime-white-logo.png" : "/prime-blue-logo.png"}
        alt="PRIME Philippines"
        width={2400}
        height={780}
        unoptimized
        className="h-full w-auto max-w-full object-contain"
      />
    </div>
  );
}

