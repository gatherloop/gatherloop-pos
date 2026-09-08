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
      <Html lang="en">
        <Head>
          <meta id="theme-color" name="theme-color" />
          <meta name="color-scheme" content="light dark" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
