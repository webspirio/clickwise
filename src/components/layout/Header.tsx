import { Button } from "@/components/ui/button"

export function Header() {
    return (
        <div className="border-b bg-background px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                {/* Logo placeholder - can be replaced with SVG */}
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                    C
                </div>
                <div>
                    <h1 className="text-xl font-bold">Clickwise</h1>
                    <p className="text-sm text-muted-foreground">WordPress Event Tracking Plugin</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
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
