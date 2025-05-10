import { FlickeringGrid } from "@/components/magicui/flickering-grid";
// Import shadcn/ui components (Button, Card, Accordion, etc.)
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background font-sans">
      {/* Flickering grid background */}
      <div className="absolute inset-0 -z-10">
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          flickerChance={0.3}
          color="rgb(147, 51, 234)"
          maxOpacity={0.1}
          className="w-full h-full"
        />
      </div>

      {/* NavBar */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="font-bold text-xl tracking-tight">YourApp</div>
        <ul className="hidden md:flex gap-8 text-sm text-muted-foreground">
          <li>
            <a href="#features" className="hover:text-primary">
              Features
            </a>
          </li>
          <li>
            <a href="#how" className="hover:text-primary">
              How It Works
            </a>
          </li>
          <li>
            <a href="#choose" className="hover:text-primary">
              Why Choose Us
            </a>
          </li>
          <li>
            <a href="#reviews" className="hover:text-primary">
              Reviews
            </a>
          </li>
          <li>
            <a href="#faq" className="hover:text-primary">
              FAQs
            </a>
          </li>
        </ul>
        <Button className="hidden md:inline-block">Get Started</Button>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-between gap-12 max-w-7xl mx-auto px-8 py-16">
        <div className="flex-1 space-y-6">
          <div className="inline-block bg-muted px-3 py-1 rounded-full text-xs font-medium mb-2">
            Achievement &bull; Rated Hot App of 2025
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            High Converting Heading Comes Here
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Use a clear headline, value prop, and app store buttons—give them a
            reason to scroll or download right away.
          </p>
          <div className="flex gap-4 mb-2">
            <Button size="lg">Download App</Button>
            <Button size="lg" variant="outline">
              Download App
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">200K+ Downloads</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[320px] h-[320px] bg-muted rounded-2xl flex items-center justify-center text-2xl text-muted-foreground">
            [App Preview]
          </div>
        </div>
      </section>

      {/* Logos/Partners Bar */}
      <section className="max-w-5xl mx-auto px-8 py-8 flex flex-wrap items-center justify-center gap-8 border-b border-muted">
        <span className="text-muted-foreground text-xs">
          WE ARE PARTNERED WITH MORE THAN 50+ COMPANIES AROUND THE GLOBE.
        </span>
        <div className="flex gap-8 flex-wrap items-center justify-center">
          <div className="w-24 h-8 bg-muted rounded" />
          <div className="w-20 h-8 bg-muted rounded" />
          <div className="w-16 h-8 bg-muted rounded" />
          <div className="w-24 h-8 bg-muted rounded" />
          <div className="w-20 h-8 bg-muted rounded" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold mb-10 text-center">
          Features Section
        </h2>
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-xl mb-2">
                Highlighted Feature 1
              </h3>
              <p className="text-muted-foreground mb-4">
                Main feature card with supporting visuals and copy to show how
                your app solves real problems.
              </p>
              <div className="w-full h-32 bg-muted rounded" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-xl mb-2">
                Highlighted Feature 2
              </h3>
              <p className="text-muted-foreground mb-4">
                Another feature card with a different focus or visual.
              </p>
              <div className="w-full h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-2">
                Highlighted Feature 3
              </h3>
              <p className="text-muted-foreground mb-4">
                Quickly show how your app solves real problems.
              </p>
              <div className="w-full h-20 bg-muted rounded" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-2">
                Highlighted Feature 4
              </h3>
              <p className="text-muted-foreground mb-4">
                Another supporting feature.
              </p>
              <div className="w-full h-20 bg-muted rounded" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-2">
                Highlighted Feature 5
              </h3>
              <p className="text-muted-foreground mb-4">
                And another one for good measure.
              </p>
              <div className="w-full h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="choose" className="max-w-7xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold mb-10 text-center">Why Choose Us</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardContent className="p-6 flex flex-col items-center">
              <div className="w-12 h-12 bg-muted rounded-full mb-4" />
              <h4 className="font-semibold mb-2">Title</h4>
              <p className="text-muted-foreground text-center">
                Brief benefit-led text to explain why users should pick your
                app.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center">
              <div className="w-12 h-12 bg-muted rounded-full mb-4" />
              <h4 className="font-semibold mb-2">Title</h4>
              <p className="text-muted-foreground text-center">
                Another reason to choose your app over others.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex flex-col items-center">
              <div className="w-12 h-12 bg-muted rounded-full mb-4" />
              <h4 className="font-semibold mb-2">Title</h4>
              <p className="text-muted-foreground text-center">
                A third compelling reason for your value prop.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Review Section */}
      <section id="reviews" className="max-w-7xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold mb-10 text-center">
          What Our Users Say
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div>
                    <div className="font-semibold">Name</div>
                    <div className="text-xs text-muted-foreground">Country</div>
                  </div>
                </div>
                <div className="mb-2">★★★★★</div>
                <p className="text-muted-foreground">
                  Testimonial with a short blurb to build authenticity and
                  trust.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-4xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold mb-10 text-center">
          Frequently Asked Questions
        </h2>
        <Accordion type="single" collapsible className="w-full">
          {[1, 2, 3, 4].map((i) => (
            <AccordionItem value={`item-${i}`} key={i}>
              <AccordionTrigger>Question {i}</AccordionTrigger>
              <AccordionContent>
                Answer to question {i} goes here. Use this space to address
                common concerns.
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-8 py-20 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4">
          <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
          <p className="text-muted-foreground mb-4">
            Reinforce the download offer, repeat your app's value, and include
            the app buttons again for one final push.
          </p>
          <div className="flex gap-4">
            <Button size="lg">Download App</Button>
            <Button size="lg" variant="outline">
              Download App
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-[220px] h-[220px] bg-muted rounded-2xl flex items-center justify-center text-lg text-muted-foreground">
            [Visual]
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-muted py-8 text-center text-muted-foreground text-sm">
        <div className="mb-2">© 2025 Company Name. All Rights Reserved.</div>
        <div className="flex gap-4 justify-center">
          <a href="#" className="hover:underline">
            LinkedIn
          </a>
          <a href="#" className="hover:underline">
            Instagram
          </a>
          <a href="#" className="hover:underline">
            Facebook
          </a>
          <a href="#" className="hover:underline">
            Twitter
          </a>
        </div>
      </footer>
    </div>
  );
}
