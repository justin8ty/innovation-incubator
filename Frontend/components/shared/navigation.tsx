"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Brain,
  User,
  Rocket,
  Building2,
  Users,
  Menu,
  X,
  BookOpen,
  Trophy,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"

const navLinks = [
  { href: "/", label: "Home", icon: Brain },
  { href: "/campaigns", label: "Campaigns", icon: BookOpen },
  { href: "/milestones", label: "Milestones", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/innovator", label: "Upload Profile", icon: User },
  { href: "/startup", label: "Startup", icon: Rocket },
  { href: "/company", label: "Campaign Ops", icon: Building2 },
  { href: "/mentor", label: "Mentor", icon: Users },
]

export function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-foreground">Nexus</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            )
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/search"
            aria-label="Search"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 transition-all duration-200",
              pathname === "/search"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}
          >
            <Search className="w-4 h-4" />
          </Link>
          <Button variant="outline" size="sm" className="text-muted-foreground border-border/50 h-8 text-xs">
            Sign In
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-foreground"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              )
            })}
            <div className="pt-4 border-t border-border/50 space-y-2">
              <Link
                href="/search"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all",
                  pathname === "/search"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Search className="w-5 h-5" />
                Search
              </Link>
              <Button variant="outline" size="sm" className="w-full justify-start text-muted-foreground">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
