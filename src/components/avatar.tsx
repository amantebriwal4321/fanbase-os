export function Avatar({ name, hue, size = 32 }: { name: string; hue: number; size?: number }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: `hsl(${hue} 42% 30%)`, width: size, height: size, fontSize: size < 30 ? 10 : 12 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-paper"
    >
      {initials}
    </span>
  );
}
