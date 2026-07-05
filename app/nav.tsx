import Link from "next/link";

const LINKS = [
  { href: "/", label: "词汇" },
  { href: "/writing", label: "写作" },
  { href: "/listening", label: "听力" },
  { href: "/reading", label: "阅读" },
  { href: "/speaking", label: "口语" },
  { href: "/stats", label: "统计" },
  { href: "/settings", label: "设置" },
];

export default function Nav() {
  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-4xl items-center gap-1 overflow-x-auto px-4 py-2 text-sm">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
