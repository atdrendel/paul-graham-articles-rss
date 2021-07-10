import { toIMF } from "https://deno.land/std@0.100.0/datetime/mod.ts";

async function handleRequest(request) {
  if (request.method === "GET") {
    const text = await getArticlesText();
    const articles = parseArticles(text);
    const rss = makeRSS(articles);
    return success(rss);
  } else {
    return badRequest();
  }
}

const getArticlesText = async () => {
  const articlesUrl = "http://paulgraham.com/articles.html";
  const res = await fetch(articlesUrl, {
    headers: { accept: "text/html,application/xhtml+xml,application/xml" },
  });
  if (res.ok) {
    const body = await res.text();
    return body.split("</table><br><table")[1];
  } else {
    return undefined;
  }
};

const parseArticles = (blogPosts) => {
  const baseURL = "http://paulgraham.com";
  const regex = /<a href=\".*?<\/a>/g;
  let parsedArticles = new Array();
  blogPosts.match(regex).forEach((e) => {
    const urlEnd = e.indexOf('">', 9);
    const titleEnd = e.indexOf("</a>");
    if (urlEnd > 0 && titleEnd > 0) {
      const urlText = e.slice(9, urlEnd);
      const url = new URL(urlText, baseURL);
      const title = e.slice(urlEnd + 2, titleEnd);
      if (url && url.toString() && title && title.length > 0) {
        parsedArticles.push({ url: url.toString(), title: title });
      }
    }
  });
  return parsedArticles;
};

const makeRSS = (articles) => {
  let rss = rssStart();
  const count = articles.length;
  const date = getDate();
  for (let i = 0; i < count; i++) {
    const article = articles[i];
    rss += `
	<item>
		<link>${article.url}</link>
		<title>${article.title}</title>
		<pubDate>${pubDate(i, count, date)}</pubDate>
	</item>`;
  }
  rss += rssEnd();
  return rss;
};

const rssStart = () => {
  return `
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
	<title>Paul Graham: Essays</title>
	<link>http://www.paulgraham.com/</link>
	<description>Unauthorized scraped RSS feed</description>`;
};

const rssEnd = () => {
  return `
</channel></rss>
	`;
};

const getDate = () => {
  const now = toIMF(new Date());
  return now.slice(0, 16);
};

const pubDate = (index, count, date) => {
  let offset = Math.max(0, count - index - 1);

  const hour = ((offset / 3600) > 0) ? Math.floor(offset / 3600) : 0;
  const hourStr = hour.toString().padStart(2, "0");

  offset = offset - (hour * 3600);
  const minute = ((offset / 60) > 0) ? Math.floor(offset / 60) : 0;
  const minuteStr = minute.toString().padStart(2, "0");

  offset = offset - (minute * 60);
  const second = offset;
  const secondStr = second.toString().padStart(2, "0");

  return `${date} ${hourStr}:${minuteStr}:${secondStr} GMT`;
};

const success = (rss) => {
  return new Response(
    rss,
    { headers: { "content-type": "application/rss+xml; charset=UTF-8" } },
  );
};

const badRequest = () => {
  return new Response(
    JSON.stringify({ error: "BAD REQUEST" }),
    {
      status: 400,
      headers: { "content-type": "application/json; charset=UTF-8" },
    },
  );
};

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});
