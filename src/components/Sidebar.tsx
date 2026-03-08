"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Compare" },
  { href: "/prompt", label: "Prompt" },
  { href: "/glossary", label: "Glossary" },
  { href: "/examples", label: "Examples" },
  { href: "/export", label: "Export" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="font-semibold text-gray-900">Air Doctor</h1>
        <p className="text-xs text-gray-500">Translation lab</p>
      </div>
      <nav className="p-2 flex-1">
        <ul className="space-y-0.5">
          {NAV.map(({ href, label }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`block px-3 py-2 rounded-md text-sm font-medium ${
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
