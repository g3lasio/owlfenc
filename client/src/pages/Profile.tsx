import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useProfile } from "@/hooks/use-profile";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Upload, FileText, Facebook, Instagram, Linkedin, Globe, Mail, Phone, CheckCircle, AlertCircle, Loader2, Building } from "lucide-react";
import { SubscriptionInfo } from "@/components/ui/subscription-info";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

type SocialMediaLinks = Record<string, string>;

// Using the same UserProfile type from the hook
import { UserProfile } from "@/hooks/use-profile";
type CompanyInfoType = UserProfile;

export default function Profile() {
  const { toast } = useToast();
  const { profile, isLoading: isLoadingProfile, error: profileError, updateProfile } = useProfile();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoType>(profile || {
    company: "",
    ownerName: "",
    role: "",
    email: "",
    phone: "",
    mobilePhone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    license: "",
    insurancePolicy: "",
    ein: "",
    businessType: "",
    yearEstablished: "",
    website: "",
    description: "",
    specialties: [],
    socialMedia: {},
    documents: {},
    logo: ""
  });

  const [newSpecialty, setNewSpecialty] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeDocumentSection, setActiveDocumentSection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Email verification state
  const [emailVerificationStatus, setEmailVerificationStatus] = useState<'unverified' | 'pending' | 'verified' | 'checking'>('unverified');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (profile) {
      setCompanyInfo(prev => ({
        ...prev,
        ...profile
      }));
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCompanyInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      console.log('💾 Saving profile data:', companyInfo);
      
      // Use the updateProfile method from the hook
      await updateProfile(companyInfo);
      
      // Also save to server endpoint
      const response = await apiRequest('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyInfo)
      });

      toast({
        title: "Profile Updated",
        description: "Your company profile has been saved successfully.",
      });
      
      console.log('✅ Profile saved successfully');
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'document') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 2MB.",
        variant: "destructive"
      });
      return;
    }

    if (type === 'logo') {
      // Convert to Base64 for storage
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = event.target?.result as string;
        setCompanyInfo(prev => ({
          ...prev,
          logo: base64String
        }));
        
        // Save immediately to both localStorage and server
        const updatedProfile = { ...companyInfo, logo: base64String };
        updateProfile(updatedProfile);
        
        toast({
          title: "Logo Updated",
          description: "Your company logo has been saved."
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const addSpecialty = () => {
    if (newSpecialty.trim() && !companyInfo.specialties?.includes(newSpecialty.trim())) {
      setCompanyInfo(prev => ({
        ...prev,
        specialties: [...(prev.specialties || []), newSpecialty.trim()]
      }));
      setNewSpecialty("");
    }
  };

  const removeSpecialty = (specialty: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      specialties: prev.specialties?.filter(s => s !== specialty) || []
    }));
  };

  const handleSocialMediaChange = (platform: string, url: string) => {
    setCompanyInfo(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: url
      }
    }));
  };

  const handleEmailVerification = async () => {
    if (!companyInfo.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first.",
        variant: "destructive"
      });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch('/api/contractor-email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: companyInfo.email,
          name: companyInfo.company || companyInfo.ownerName || 'Contractor'
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setEmailVerificationStatus('pending');
        toast({
          title: "Verification Email Sent",
          description: "Please check your email and click the verification link.",
          duration: 8000
        });
      } else {
        toast({
          title: "Verification Failed",
          description: result.message || "Unable to send verification email. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending verification:', error);
      toast({
        title: "Connection Error",
        description: "Unable to send verification email. Please check your connection.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
            <p className="text-muted-foreground">Manage your company information and settings</p>
          </div>
          <Button onClick={handleSave} disabled={loading} size="lg" className="w-full lg:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

        {/* Profile Banner Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Profile Photo Section */}
              <div className="flex-shrink-0 relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const imageUrl = URL.createObjectURL(file);
                      setCompanyInfo(prev => ({
                        ...prev,
                        profilePhoto: imageUrl
                      }));
                    }
                  }}
                  className="hidden"
                  id="profile-photo-input"
                />
                <label 
                  htmlFor="profile-photo-input" 
                  className="cursor-pointer group relative block w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 hover:border-primary/40 transition-all"
                >
                  {companyInfo.profilePhoto ? (
                    <img 
                      src={companyInfo.profilePhoto} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/20 text-primary flex items-center justify-center">
                      <span className="text-2xl font-medium">
                        {(companyInfo.company || companyInfo.ownerName || "C").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 group-hover:flex items-center justify-center hidden text-white">
                    <Upload className="w-6 h-6" />
                  </div>
                </label>
              </div>
              
              {/* Company Info */}
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-foreground">
                  {companyInfo.company || "Your Company"}
                </h2>
                <p className="text-muted-foreground">
                  {companyInfo.ownerName || "Owner Name"} • {companyInfo.role || "Contractor"}
                </p>
                <div className="mt-3">
                  <SubscriptionInfo />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 mb-8">
            <TabsTrigger value="info">General Information</TabsTrigger>
            <TabsTrigger value="legal">Documentation</TabsTrigger>
            <TabsTrigger value="specialties">Specialties & Social</TabsTrigger>
          </TabsList>

          {/* GENERAL INFORMATION TAB */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic company details that appear on estimates and contracts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Company Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name *</Label>
                    <Input
                      id="company"
                      name="company"
                      value={companyInfo.company}
                      onChange={handleChange}
                      placeholder="Your Fencing Company LLC"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Owner/Manager Name *</Label>
                    <Input
                      id="ownerName"
                      name="ownerName"
                      value={companyInfo.ownerName}
                      onChange={handleChange}
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role/Position</Label>
                    <Input
                      id="role"
                      name="role"
                      value={companyInfo.role}
                      onChange={handleChange}
                      placeholder="Owner, Manager, Contractor"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type</Label>
                    <Select
                      value={companyInfo.businessType}
                      onValueChange={(value) => setCompanyInfo(prev => ({...prev, businessType: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="llc">LLC</SelectItem>
                        <SelectItem value="corporation">Corporation</SelectItem>
                        <SelectItem value="partnership">Partnership</SelectItem>
                        <SelectItem value="sole-proprietorship">Sole Proprietorship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Contact Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email">Business Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={companyInfo.email}
                        onChange={handleChange}
                        placeholder="contact@yourcompany.com"
                      />
                      {/* Email Verification Status */}
                      {companyInfo.email && (
                        <div className="mt-2 p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {emailVerificationStatus === 'verified' && (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-green-600 font-medium">Email verified</span>
                                </>
                              )}
                              {emailVerificationStatus === 'pending' && (
                                <>
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                  <span className="text-sm text-yellow-600 font-medium">Verification pending</span>
                                </>
                              )}
                              {emailVerificationStatus === 'unverified' && (
                                <>
                                  <AlertCircle className="h-4 w-4 text-red-500" />
                                  <span className="text-sm text-red-600 font-medium">Email not verified</span>
                                </>
                              )}
                            </div>
                            
                            {emailVerificationStatus !== 'verified' && (
                              <Button 
                                onClick={handleEmailVerification}
                                disabled={isVerifying || !companyInfo.email}
                                size="sm"
                                variant="outline"
                              >
                                {isVerifying ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Mail className="h-3 w-3 mr-1" />
                                    Verify Email
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Office Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={companyInfo.phone}
                        onChange={handleChange}
                        placeholder="(123) 456-7890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobilePhone">Mobile Phone</Label>
                      <Input
                        id="mobilePhone"
                        name="mobilePhone"
                        type="tel"
                        value={companyInfo.mobilePhone}
                        onChange={handleChange}
                        placeholder="(123) 456-7890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        value={companyInfo.website}
                        onChange={handleChange}
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Address Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Business Address</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <AddressAutocomplete
                      value={companyInfo.address || ""}
                      onChange={(address) => setCompanyInfo(prev => ({...prev, address}))}
                      placeholder="Enter business address"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          name="city"
                          value={companyInfo.city}
                          onChange={handleChange}
                          placeholder="City"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          name="state"
                          value={companyInfo.state}
                          onChange={handleChange}
                          placeholder="State"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">ZIP Code</Label>
                        <Input
                          id="zipCode"
                          name="zipCode"
                          value={companyInfo.zipCode}
                          onChange={handleChange}
                          placeholder="12345"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Logo Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Company Logo</h3>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-40 h-40 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/50">
                      {companyInfo.logo ? (
                        <img src={companyInfo.logo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Building className="w-12 h-12 mb-2" />
                          <span>No logo uploaded</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Upload your company logo to appear on estimates, contracts, and client communications.
                      </p>
                      <div>
                        <input
                          type="file"
                          ref={logoInputRef}
                          accept="image/png,image/jpeg"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'logo')}
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Supported formats: PNG, JPEG. Max size: 2MB
                      </p>
                    </div>
                  </div>
                </div>

                {/* Company Description */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Company Description</h3>
                  <div className="space-y-2">
                    <Label htmlFor="description">About Your Company</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={companyInfo.description}
                      onChange={handleChange}
                      placeholder="Describe your company, services, and what makes you unique..."
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DOCUMENTATION TAB */}
          <TabsContent value="legal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Legal Documentation</CardTitle>
                <CardDescription>
                  Business licenses, insurance, and legal information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="license">Business License Number</Label>
                    <Input
                      id="license"
                      name="license"
                      value={companyInfo.license}
                      onChange={handleChange}
                      placeholder="ABC123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ein">EIN (Tax ID)</Label>
                    <Input
                      id="ein"
                      name="ein"
                      value={companyInfo.ein}
                      onChange={handleChange}
                      placeholder="12-3456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="insurancePolicy">Insurance Policy Number</Label>
                    <Input
                      id="insurancePolicy"
                      name="insurancePolicy"
                      value={companyInfo.insurancePolicy}
                      onChange={handleChange}
                      placeholder="POL123456789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearEstablished">Year Established</Label>
                    <Input
                      id="yearEstablished"
                      name="yearEstablished"
                      type="number"
                      value={companyInfo.yearEstablished}
                      onChange={handleChange}
                      placeholder="2020"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SPECIALTIES & SOCIAL TAB */}
          <TabsContent value="specialties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Specialties & Services</CardTitle>
                <CardDescription>
                  Add your company specialties and social media presence
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Specialties Section */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Service Specialties</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {companyInfo.specialties?.map((specialty, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {specialty}
                        <button
                          onClick={() => removeSpecialty(specialty)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      placeholder="Add a specialty (e.g., Residential Fencing)"
                      onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                    />
                    <Button onClick={addSpecialty} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Social Media Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-4">Social Media</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook</Label>
                      <div className="flex">
                        <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                          <Facebook className="h-4 w-4" />
                        </div>
                        <Input
                          id="facebook"
                          value={companyInfo.socialMedia?.facebook || ""}
                          onChange={(e) => handleSocialMediaChange('facebook', e.target.value)}
                          placeholder="https://facebook.com/yourcompany"
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram</Label>
                      <div className="flex">
                        <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                          <Instagram className="h-4 w-4" />
                        </div>
                        <Input
                          id="instagram"
                          value={companyInfo.socialMedia?.instagram || ""}
                          onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                          placeholder="https://instagram.com/yourcompany"
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn</Label>
                      <div className="flex">
                        <div className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted">
                          <Linkedin className="h-4 w-4" />
                        </div>
                        <Input
                          id="linkedin"
                          value={companyInfo.socialMedia?.linkedin || ""}
                          onChange={(e) => handleSocialMediaChange('linkedin', e.target.value)}
                          placeholder="https://linkedin.com/company/yourcompany"
                          className="rounded-l-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}