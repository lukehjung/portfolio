import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: {
    default: 'Luke H. Jung — Portfolio',
    template: '%s | Luke H. Jung',
  },
  description: 'Luke H. Jung — engineer at Amazon Prime Video. Portfolio, esports tools, and side projects.',
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
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}