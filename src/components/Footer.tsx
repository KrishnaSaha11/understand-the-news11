export default function Footer() {
    return (
        <footer className="border-t bg-background py-8">
            <div className="container mx-auto px-4 text-center">
                <p className="text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} Understand the News. Powered by Gemini & NewsAPI.
                </p>
            </div>
        </footer>
    );
}
