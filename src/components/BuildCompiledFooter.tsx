import { format, formatDistance } from "date-fns";
import { useEffect, useState } from "react";

const parsedBuildDate = new Date(import.meta.env.VITE_BUILD_COMPILED_AT);
const buildCompiledAt = Number.isNaN(parsedBuildDate.getTime())
  ? new Date()
  : parsedBuildDate;

export function BuildCompiledFooter() {
  const [now, setNow] = useState<Date>(buildCompiledAt);

  useEffect(() => {
    setNow(new Date());
    const intervalId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const relativeBuildTime = formatDistance(buildCompiledAt, now, {
    addSuffix: true,
  });
  const absoluteBuildTime = format(buildCompiledAt, "PPpp");

  return (
    <footer className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 rounded-full border border-indigo-200 bg-white/95 px-4 py-2 text-[11px] text-indigo-900 shadow-lg backdrop-blur-sm">
      Build compiled {relativeBuildTime} ({absoluteBuildTime})
    </footer>
  );
}
