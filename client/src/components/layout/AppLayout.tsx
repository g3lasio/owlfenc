import { useState, useEffect } from "react";
import Header from "./Header";
import MobileMenu from "./MobileMenu";
import { Routes, Route, BrowserRouter } from "react-router-dom"; // Added BrowserRouter and corrected import

interface AppLayoutProps {
  children: React.ReactNode;
}

// Placeholder Profile component
const Profile = () => {
  return (
    <div>
      <h1>Company Profile</h1>
      <p>This is the company profile page.</p>
    </div>
  );
};


export default function AppLayout({ children }: AppLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(prevState => !prevState);
  };

  useEffect(() => {
    console.log('Menu state updated:', isMobileMenuOpen);
    if (isMobileMenuOpen) {
      document.body.classList.add('menu-open');
    } else {
      document.body.classList.remove('menu-open');
    }
  }, [isMobileMenuOpen]);

  return (
    <BrowserRouter> {/* Added BrowserRouter */}
      <div className="flex h-screen">
        <main className="flex-1 flex flex-col overflow-hidden">
          <Header toggleMobileMenu={toggleMobileMenu} isMobileMenuOpen={isMobileMenuOpen} />
          <Routes>
            <Route path="/settings/profile" element={<Profile />} />
            <Route path="*" element={children} /> {/* Added a catch-all route for other paths */}
          </Routes>
        </main>

        <MobileMenu 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)} 
        />
      </div>
    </BrowserRouter>
  );
}