import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { appWithTranslation } from 'next-i18next'
import Head from 'next/head'   // <--- importiere Head hier

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        {/* Wichtig für mobiles korrektes Scaling */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}

export default appWithTranslation(MyApp)
