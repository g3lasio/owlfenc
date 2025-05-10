
import React from 'react';
import { Link } from 'wouter';

export default function ChatFooter() {
  return (
    <div className="chat-footer">
      <div className="footer-content flex justify-between items-center px-4 py-1 text-xs text-muted-foreground">
        <Link to="/legal-policy" className="hover:underline">Legal Policy</Link>
        <span>© {new Date().getFullYear()} Owl Fenc - Todos los derechos reservados</span>
        <Link to="/privacy-policy" className="hover:underline">Privacy Policy</Link>
      </div>
    </div>
  );
}
