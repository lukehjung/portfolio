import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: 'Luke Portfolio',
  description: 'Luke Jung Portfolio',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="no-js">
      <head>
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link
          href="https://fonts.googleapis.com/css?family=Lato:300,400,700,900"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/libs/font-awesome/css/font-awesome.min.css" />
        <link href="/css/bootstrap.min.css" rel="stylesheet" />
        <link href="/css/styles.css" rel="stylesheet" />
      </head>
      <body>
        {children}
        {/* Keeping jQuery and legacy scripts for now to preserve existing functionality */}
        <Script src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js" strategy="beforeInteractive" />
        <Script src="/js/scripts.min.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}