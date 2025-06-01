
import React from 'react';
import { Link } from 'wouter';

export default function ChatFooter() {
  return (
    <>
      <div className="mervin-info-footer">
        Mervin AI utiliza tecnología avanzada para asistirte. La información proporcionada es solo orientativa.
      </div>
      <footer className="chat-footer">
        <div className="footer-content">
          <div className="text-left">
            <Link to="/legal-policy" className="text-sm hover:text-primary transition-colors">Legal Policy</Link>
          </div>
          <div className="text-center">
            <span className="font-medium">© {new Date().getFullYear()} Owl Fenc</span>
          </div>
          <div className="text-right">
            <Link to="/privacy-policy" className="text-sm hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
