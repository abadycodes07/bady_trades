import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, PlusCircle, Database } from 'lucide-react';

export default function JournalingPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Journaling</h1>
      <p className="text-muted-foreground mb-8">
        Import your trades automatically, upload files, or enter them manually to start analyzing.
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover-effect cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary"/> Broker Integration</CardTitle>
            <CardDescription>Connect your broker account for automated trade imports.</CardDescription>
          </CardHeader>
          <CardContent>
             {/* Add broker selection/connection UI here */}
            <Button className="w-full hover-effect">Connect Broker</Button>
          </CardContent>
        </Card>

        <Card className="hover-effect cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary"/> File Upload</CardTitle>
            <CardDescription>Upload trade history files from your broker (CSV, etc.).</CardDescription>
          </CardHeader>
          <CardContent>
             {/* Add file upload UI here */}
             <Button variant="outline" className="w-full hover-effect">Upload File</Button>
          </CardContent>
        </Card>

        <Card className="hover-effect cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5 text-primary"/> Manual Entry</CardTitle>
            <CardDescription>Enter individual trade details manually.</CardDescription>
          </CardHeader>
          <CardContent>
             {/* Link or open modal for manual trade entry form */}
             <Button variant="outline" className="w-full hover-effect">Add Trade Manually</Button>
          </CardContent>
        </Card>
      </div>

       {/* Section to display recently imported/added trades maybe? */}
       <div className="mt-12">
           <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
           <Card>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground">No recent trades imported or added.</p>
                    {/* Or display a list/table of recent trades */}
                </CardContent>
           </Card>
       </div>
    </div>
  );
}
