import wiki from "wikipedia";

interface WikiResult {
  success: boolean;
  data?: {
    title: string;
    summary: string;
    url: string;
  };
  error?: string;
}

export const searchWikipedia = async (query: string): Promise<WikiResult> => {
    try {
        const searchResults = await wiki.search(query);
        if (!searchResults.results.length) {
            return {
                success: false,
                error: `No results found for "${query}"`
            };
        }
        
        const page = await wiki.page(searchResults.results[0].title);
        const summary = await page.summary();

        return {
            success: true,
            data: {
                title: page.title,
                summary: summary.extract,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
            }
        };
    } catch (error) {
        console.error('Wikipedia search error:', error);
        return {
            success: false,
            error: "An error occurred while searching Wikipedia."
        };
    }
};