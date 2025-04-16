import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PropertyDetails {
  owner: string;
  address: string;
  sqft: number;
  bedrooms: number;
  bathrooms: number;
  lotSize: string;
  yearBuilt: number;
  propertyType: string;
  verified: boolean;
}

export default function PropertyOwnershipVerifier() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);

  const handleSearch = async () => {
    if (!address.trim()) {
      setError("Please enter a valid address");
      return;
    }

    setLoading(true);
    setError(null);
    
    // This would be replaced with an actual API call in production
    // For demo purposes, we're simulating a response after a delay
    setTimeout(() => {
      try {
        // Mock data for demonstration purposes
        const mockPropertyDetails: PropertyDetails = {
          owner: "John Smith",
          address: address,
          sqft: 2250,
          bedrooms: 4,
          bathrooms: 2.5,
          lotSize: "0.25 acres",
          yearBuilt: 2005,
          propertyType: "Single Family Residence",
          verified: true
        };
        
        setPropertyDetails(mockPropertyDetails);
        setLoading(false);
      } catch (err) {
        setError("Error fetching property details. Please try again.");
        setPropertyDetails(null);
        setLoading(false);
      }
    }, 2000);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Property Ownership Verifier</h1>
      <p className="text-muted-foreground mb-6">
        Verify property ownership to avoid scams and ensure you're dealing with the legitimate owner.
      </p>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Verify Property Ownership</CardTitle>
            <CardDescription>
              Enter the property address to verify its ownership details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 sm:col-span-9">
                  <Label htmlFor="address">Property Address</Label>
                  <Input 
                    id="address" 
                    placeholder="Enter complete property address" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="col-span-12 sm:col-span-3 flex items-end">
                  <Button 
                    className="w-full" 
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    {loading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-2/4 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : propertyDetails ? (
        <Card>
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
            <CardDescription>
              Verified information about the property
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Current Ownership</h3>
                <p className="text-lg font-medium flex items-center">
                  {propertyDetails.owner}
                  {propertyDetails.verified && (
                    <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Verified Owner
                    </span>
                  )}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Property Type</h3>
                <p className="text-lg font-medium">{propertyDetails.propertyType}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Living Area</h3>
                <p className="text-lg font-medium">{propertyDetails.sqft.toLocaleString()} sqft</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Lot Size</h3>
                <p className="text-lg font-medium">{propertyDetails.lotSize}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Bedrooms / Bathrooms</h3>
                <p className="text-lg font-medium">{propertyDetails.bedrooms} bed / {propertyDetails.bathrooms} bath</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Year Built</h3>
                <p className="text-lg font-medium">{propertyDetails.yearBuilt}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-md font-semibold mb-2">What this means for your project:</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="mr-2 text-green-500">✓</span>
                  <span>The person requesting work is the verified property owner</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-green-500">✓</span>
                  <span>Property details match county records</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2 text-green-500">✓</span>
                  <span>No liens or financial issues detected that could affect payment</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}
      
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-3">Why Verify Property Ownership?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Prevent Fraud</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Ensure you're dealing with the legitimate property owner to avoid scams and payment issues.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Avoid Legal Problems</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Confirm proper authorization for construction work to avoid disputes and potential lawsuits.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Build Client Trust</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Show professionalism by verifying property details before beginning work on any project.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}