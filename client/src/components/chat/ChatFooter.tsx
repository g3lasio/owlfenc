import React from 'react';
import { Link } from 'wouter';

export default function ChatFooter() {
  return (
    <div className="chat-footer">
      <div className="footer-gradient">
        <div className="footer-content">
          <Link to="/legal-policy" className="footer-link">Legal Policy</Link>
          <span className="footer-copyright">© {new Date().getFullYear()} Owl Fence Company. Todos los derechos reservados.</span>
          <Link to="/privacy-policy" className="footer-link">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}