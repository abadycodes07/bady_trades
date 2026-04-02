
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function ModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  const toggleTheme = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  if (!mounted) {
     // Render a placeholder or null during SSR/hydration mismatch phase
     // Using a disabled switch placeholder maintains layout consistency
     return (
       <div className={cn("flex items-center space-x-2", className)}>
         <Switch id="theme-toggle-placeholder" disabled />
       </div>
     );
   }

  const isDarkMode = theme === "dark";

  return (
    <div className={cn("flex items-center space-x-2", className)}>
        <Sun className={cn("h-5 w-5 transition-colors", !isDarkMode ? "text-yellow-500" : "text-muted-foreground")} />
        <Switch
            id="theme-toggle"
            checked={isDarkMode}
            onCheckedChange={toggleTheme}
            aria-label="Toggle theme"
            className="hover-effect data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted" // Use primary for dark mode active
        />
        <Moon className={cn("h-5 w-5 transition-colors", isDarkMode ? "text-primary" : "text-muted-foreground")} />
      <span className="sr-only">Toggle theme</span>
    </div>
  )
}
