
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Import Button
import { X } from 'lucide-react'; // Import X icon
import { BadyTradesLogo } from '@/components/icons/badytrades-logo'; // Import the logo

export default function LoginPage() {
  return (
    // Changed to fixed position overlay
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md relative border-border/50 shadow-xl bg-card/90">
        <Link href="/" passHref legacyBehavior>
           <Button variant="ghost" size="icon" className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
               <X className="h-5 w-5" />
               <span className="sr-only">Close</span>
           </Button>
        </Link>
        <CardHeader className="text-center pt-8"> {/* Added padding top */}
           {/* Add the logo here, linking to the external landing page */}
           <Link href="https://similar-list-469638.framer.app/" passHref legacyBehavior>
             <a className="flex justify-center mb-4 hover:opacity-80 transition-opacity">
               <BadyTradesLogo className="h-8" />
             </a>
           </Link>
          <CardTitle className="text-2xl font-bold">Welcome Back!</CardTitle>
          <CardDescription>Login to access your BadyTrades dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-8"> {/* Added padding bottom */}
          <LoginForm />
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
