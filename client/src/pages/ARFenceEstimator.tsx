import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ARFenceEstimator() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">AR Fence Estimator</h1>
      <p className="text-muted-foreground mb-6">
        Coming Soon: Visualize fences in augmented reality before construction.
      </p>

      <Card className="w-full overflow-hidden">
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-center text-xl">🚧 Coming Soon 🚧</CardTitle>
          <CardDescription className="text-center">
            This feature is currently in development
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="mb-6">
            <div className="w-24 h-24 rounded-full bg-primary/20 mx-auto flex items-center justify-center mb-4">
              <i className="ri-augmented-reality-line text-4xl text-primary"></i>
            </div>
            <h3 className="text-xl font-semibold mb-2">AR Fence Estimator</h3>
            <p className="text-muted-foreground mb-4">
              Our team is working hard to bring you this exciting new feature. With AR Fence Estimator, you'll be able to:
            </p>
            <ul className="text-left space-y-2 mb-6 max-w-md mx-auto">
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Visualize different fence styles in real-time using your mobile device</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>See accurate representations of fence materials and colors</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Share AR visualizations with clients to help them make decisions</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-primary">✓</span>
                <span>Take measurements directly through the AR interface</span>
              </li>
            </ul>
          </div>
          
          <Button disabled className="mb-2">Get Notified When Available</Button>
          <p className="text-sm text-muted-foreground">
            Expected launch: Summer 2023
          </p>
        </CardContent>
      </Card>
    </div>
  );
}