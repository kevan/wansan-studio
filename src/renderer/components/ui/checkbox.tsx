import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/utils/cn"

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <div className="relative flex items-center justify-center">
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "peer h-4 w-4 shrink-0 appearance-none rounded border border-zinc-300 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 checked:bg-indigo-600 checked:border-indigo-600",
        className
      )}
      {...props}
    />
    <Check className="absolute h-3 w-3 hidden peer-checked:block text-white pointer-events-none stroke-[3]" />
  </div>
))
Checkbox.displayName = "Checkbox"

export { Checkbox }
