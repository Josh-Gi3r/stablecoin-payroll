import { useEffect } from 'react';

export default function LandingPage() {
  useEffect(() => {
    // Fetch and render the HTML homepage
    fetch('/home.html')
      .then(res => res.text())
      .then(html => {
        const root = document.getElementById('root');
        if (root) {
          // Parse the HTML
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          
          // Extract styles and add them to the document head
          doc.head.querySelectorAll('style').forEach(style => {
            const newStyle = document.createElement('style');
            newStyle.textContent = style.textContent;
            document.head.appendChild(newStyle);
          });
          
          // Clear root and add body content
          root.innerHTML = '';
          doc.body.childNodes.forEach(node => {
            root.appendChild(node.cloneNode(true));
          });
          
          // Re-execute scripts in IIFE to avoid conflicts
          root.querySelectorAll('script').forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = `(function() { ${script.textContent} })()`;
            root.appendChild(newScript);
          });
        }
      });
  }, []);

  return null;
}
