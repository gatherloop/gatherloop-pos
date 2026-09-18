import NextDocument, {
  DocumentContext,
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document';
import { StyleSheet } from 'react-native';
import tamaguiConfig from '../../tamagui.config';

export default class Document extends NextDocument {
  static async getInitialProps({ renderPage }: DocumentContext) {
    const page = await renderPage();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore RN doesn't have this type
    const rnwStyle = StyleSheet.getSheet();

    return {
      ...page,
      styles: (
        <>
          <style
            id={rnwStyle.id}
            dangerouslySetInnerHTML={{ __html: rnwStyle.textContent }}
          />
          <style
            dangerouslySetInnerHTML={{
              __html: tamaguiConfig.getCSS({
                exclude:
                  process.env.NODE_ENV === 'production'
                    ? 'design-system'
                    : null,
              }),
            }}
          />
        </>
      ),
    };
  }
  render() {
    return (
      <Html lang="id">
        <Head>
          {/* #f8f8f8 matches OrderLayout header's $color2 background */}
          <meta id="theme-color" name="theme-color" content="#f8f8f8" />
          <meta name="color-scheme" content="light" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
