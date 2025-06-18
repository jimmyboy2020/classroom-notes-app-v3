import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ 
  Component, 
  pageProps: { session, ...pageProps } 
}: AppProps) {
  useEffect(() => {
    // Import Bootstrap JS on the client side
    import('bootstrap/dist/js/bootstrap');
  }, []);
  
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </>
  );
}