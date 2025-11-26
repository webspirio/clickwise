import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { AnimatedLogo } from "@/components/AnimatedLogo"

export function Header() {
    return (
        <div className="glass border-b-0 px-6 py-4 flex items-center justify-between z-10 relative">
            <div className="flex items-center gap-4">
                <AnimatedLogo className="h-12 w-12" />
                <div>
                    <h1 className="text-xl font-bold">Clickwise</h1>
                    <p className="text-sm text-muted-foreground">WordPress Event Tracking Plugin</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <ModeToggle />
                <Button variant="outline" asChild>
                    <a href="https://clickwise.com/docs" target="_blank" rel="noreferrer">Documentation</a>
                </Button>
                <Button asChild>
                    <a href="https://webspirio.com/contact" target="_blank" rel="noreferrer">Get Support</a>
                </Button>
            </div>
        </div>
    )
}
