
import React from 'react';
import { Link } from 'wouter';

export default function ChatFooter() {
  return (
    <footer className="chat-footer">
      <div className="footer-content">
        <Link to="/legal-policy">Legal Policy</Link>
        <span>© {new Date().getFullYear()} Owl Fenc</span>
        <Link to="/privacy-policy">Privacy Policy</Link>
      </div>
    </footer>
  );
}
