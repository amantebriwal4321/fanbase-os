import type { Person } from "@/server/view";

export function Facepile({ people }: { people: Person[] }) {
  const shown = people.slice(0, 5);
  const extra = people.length - shown.length;
  return (
    <ul className="mt-3 flex items-center" aria-label="Members">
      {shown.map((person, index) => (
        <li key={person.id} className={index === 0 ? "" : "-ml-2"} style={{ zIndex: shown.length - index }}>
          <span
            title={`${person.name}. ${person.note}`}
            className="grid h-9 w-9 place-items-center rounded-full border-2 border-card text-xs font-semibold"
            style={{ backgroundColor: `hsl(${person.hue} 42% 80%)` }}
          >
            <span className="sr-only">{person.name}. </span>
            {person.initials}
          </span>
        </li>
      ))}
      {extra > 0 ? <li className="ml-2 text-sm text-muted">+{extra}</li> : null}
    </ul>
  );
}
