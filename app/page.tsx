import { homeHtml } from './home-content';
import NewsPreview from './news-preview';

export default function Home() {
  const index = homeHtml.indexOf('<section id="contact"');

  return (
    <>
      <div
        dangerouslySetInnerHTML={{
          __html: homeHtml.slice(0, index)
        }}
      />

      <NewsPreview />

      <div
        dangerouslySetInnerHTML={{
          __html: homeHtml.slice(index)
        }}
      />
    </>
  );
}
