async function handleRequest(request) {
	if (request.method === 'GET') {
		const text = await getArticlesText()
		const articles = parseArticles(text)
		const rss = makeRSS(articles)
		return success(rss)
	} else {
		return badRequest()
	}
}

const getArticlesText = async () => {	
	const articlesUrl = "http://paulgraham.com/articles.html"
	const res = await fetch(articlesUrl, {headers: {accept: 'text/html,application/xhtml+xml,application/xml'}})
	if (res.ok) {
		const body = await res.text()
		return body.split('</table><br><table')[1]
	} else {
		return undefined
	}
}

const parseArticles = (blogPosts) => {
	const baseURL = "http://paulgraham.com"
	const regex = /<a href=\".*?<\/a>/g
	let parsedArticles = new Array()
	blogPosts.match(regex).forEach((e) => {
		const urlEnd = e.indexOf('">', 9)
		const titleEnd = e.indexOf('</a>')
		if (urlEnd > 0 && titleEnd > 0) {
			const urlText = e.slice(9, urlEnd)
			const url = new URL(urlText, baseURL)
			const title = e.slice(urlEnd + 2, titleEnd)
			if (url && url.toString() && title && title.length > 0) {
				parsedArticles.push({url: url.toString(), title: title})
			}
		}
	})
	return parsedArticles
}

const makeRSS = (articles) => {
	let rss = rssStart()
	articles.forEach((article) => {
		rss += `
	<item>
		<link>${article.url}</link>
		<title>${article.title}</title>
	</item>`
	})
	rss += rssEnd()
	return rss
}

const rssStart = () => {
	return `
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
	<title>Paul Graham: Essays</title>
	<link>http://www.paulgraham.com/</link>
	<description>Unauthorized scraped RSS feed</description>`
}

const rssEnd = () => {
	return `
</channel></rss>
	`
}

const success = (rss) => {
	return new Response(
		rss,
		{ headers: {"content-type": "application/rss+xml; charset=UTF-8"}, },
	);
}

const badRequest = () => {
	return new Response(
		JSON.stringify({ error: "BAD REQUEST" }),
		{
			status: 400,
			headers: {"content-type": "application/json; charset=UTF-8"},
		},
	);
}

addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event.request));
});
	