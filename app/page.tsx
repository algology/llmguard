import { AnimatedGridPattern } from "@/components/magicui/animated-grid-pattern";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="relative min-h-screen bg-neutral-950 font-sans text-neutral-50 flex flex-col overflow-x-hidden">
      {/* Animated Grid Pattern - Applying demo's visual className and props */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <AnimatedGridPattern
          numSquares={15}
          maxOpacity={0.01}
          duration={3}
          repeatDelay={1}
          className={cn(
            "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
            "inset-x-0 inset-y-[-70%] h-[200%] skew-y-12 opacity-50"
          )}
        />
      </div>

      {/* --- End AnimatedGridPattern --- */}

      <nav className="sticky top-0 z-50 bg-neutral-950/70 backdrop-blur-lg border-b border-neutral-800/50">
        <div className="flex justify-between items-center px-6 md:px-10 py-4 max-w-6xl mx-auto">
          <Link
            href="/"
            className="font-bold text-2xl tracking-tight text-neutral-50 hover:text-primary transition-colors"
          >
            Safe.ai
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="#features"
              className="text-sm text-neutral-400 hover:text-primary transition-colors hidden sm:inline"
            >
              Features
            </Link>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Link href="/guard-ui">Open Scanner</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Must be above grid */}
      <section className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-4 py-24 md:py-36">
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "group rounded-full border border-white/10 bg-neutral-900/80 text-base text-neutral-300 transition-all ease-in hover:cursor-pointer hover:bg-neutral-800/80 mb-8"
            )}
          >
            <AnimatedShinyText className="inline-flex items-center justify-center px-4 py-1.5 transition ease-out hover:text-neutral-100 hover:duration-300 text-white">
              <span>✨ Meet Safe.ai Guard</span>
            </AnimatedShinyText>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400">
            Simplify AI Security
          </h1>
          <p className="max-w-xl text-lg text-neutral-300 mb-10">
            Enterprise-grade Data Loss Prevention for ChatGPT and other public
            LLMs. Deploy in minutes via browser extension or network proxy.
          </p>
          <Button
            asChild
            size="lg"
            className="text-lg px-8 py-6 bg-white hover:bg-white/90 text-black shadow-lg hover:shadow-white/50 transition-shadow"
          >
            <Link href="/guard-ui">Try Safe.ai Guard</Link>
          </Button>
        </div>
      </section>

      {/* Features Section - Must be above grid */}
      <section
        id="features"
        className="relative z-10 w-full max-w-5xl mx-auto px-6 py-16 md:py-24"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center tracking-tight text-neutral-100">
          Enterprise-Grade Protection
        </h2>
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {[
            {
              title: "Real-time DLP",
              description:
                "Instant detection and redaction of sensitive data before it reaches public LLMs.",
            },
            {
              title: "AI Pattern Detection",
              description:
                "Advanced machine learning identifies potential data exfiltration attempts.",
            },
            {
              title: "Seamless Deployment",
              description:
                "Browser extension or network proxy options for quick enterprise-wide rollout.",
            },
          ].map((feature) => (
            <Card
              key={feature.title}
              className="bg-black/30 border-neutral-700/60 backdrop-blur-md shadow-xl hover:border-primary/60 transition-all duration-300"
            >
              <CardHeader>
                <CardTitle className="text-xl text-neutral-100">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-neutral-300">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA Section - Must be above grid */}
      <section className="relative z-10 w-full max-w-3xl mx-auto px-6 py-16 md:py-24 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight text-neutral-100">
          See It In Action
        </h2>
        <p className="text-neutral-300 mb-8 max-w-lg mx-auto">
          Experience how Safe.ai prevents sensitive data leaks to ChatGPT and
          other public LLMs. Try our interactive demo with your own test data.
        </p>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="text-lg px-8 py-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-primary/50 transition-shadow shadow-md"
        >
          <Link href="/guard-ui">Launch Demo</Link>
        </Button>
      </section>

      {/* Footer - Must be above grid */}
      <footer className="relative z-10 py-8 text-center text-neutral-500 text-sm border-t border-neutral-800/50">
        © {currentYear} Safe.ai. All rights reserved.
      </footer>
    </div>
  );
}
