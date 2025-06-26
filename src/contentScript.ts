// This content script runs in the context of web pages
// It can access and manipulate the DOM of the page it's injected into

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.action === 'extractPageContent') {
    try {
      const pageContent = extractPageContent();
      console.log('Extracted page content:', pageContent);
      sendResponse({ content: pageContent });
    } catch (error) {
      console.error('Error extracting page content:', error);
      sendResponse({ error: 'Failed to extract page content' });
    }
  } else if (message.action === 'extractPdfContent') {
    sendResponse({ status: 'PDF extraction not supported in content script' });
  } else if (message.action === 'extractVideoInfo') {
    try {
      const videoInfo = extractVideoInfo();
      console.log('Extracted video info:', videoInfo);
      sendResponse({ info: videoInfo });
    } catch (error) {
      console.error('Error extracting video info:', error);
      sendResponse({ error: 'Failed to extract video information' });
    }
  }
  
  return true; // Required to use sendResponse asynchronously
});

// Function to extract page content
function extractPageContent() {
  try {
    // Get the page title
    const title = document.title;
    
    // Get meta description
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                           document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    
    // Get main content with improved selection and error handling
    let mainContent = '';
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#content',
      '.content',
      'body'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent) {
        mainContent = element.textContent;
        break;
      }
    }
    
    // Get headings with their hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({
      level: h.tagName.toLowerCase(),
      text: h.textContent?.trim() || ''
    }));
    
    // Get important links (filter out navigation/footer links)
    const mainContentElement = document.querySelector('main') || document.querySelector('article');
    const links = Array.from(mainContentElement ? mainContentElement.querySelectorAll('a') : document.querySelectorAll('a'))
      .map(a => ({
        text: a.textContent?.trim() || '',
        href: a.href,
        isImportant: !a.closest('nav') && !a.closest('footer')
      }))
      .filter(link => link.isImportant)
      .slice(0, 100);
    
    // Get key images (excluding tiny images and icons)
    const images = Array.from(document.querySelectorAll('img'))
      .map(img => ({
        alt: img.alt,
        src: img.src,
        width: img.width,
        height: img.height
      }))
      .filter(img => img.width > 100 && img.height > 100)
      .slice(0, 20);
    
    const result = {
      url: window.location.href,
      title,
      metaDescription,
      mainContent: mainContent.substring(0, 10000000), // Limit content size
      headings,
      links,
      images
    };

    console.log('Extracted content:', result);
    return result;
  } catch (error) {
    console.error('Error in extractPageContent:', error);
    throw error;
  }
}

// Function to extract video information (for YouTube and similar sites)
function extractVideoInfo() {
  // Check if we're on YouTube
  const isYouTube = window.location.hostname.includes('youtube.com');
  
  if (isYouTube) {
    // Get video title
    const videoTitle = document.querySelector('h1.title')?.textContent || 
                      document.querySelector('h1')?.textContent || 
                      'Unknown Video Title';
    
    // Get video description
    const videoDescription = document.querySelector('div#description')?.textContent || 
                            'No description available';
    
    // Get channel name
    const channelName = document.querySelector('[class*="owner-name"]')?.textContent || 
                       'Unknown Channel';
    
    // Get video duration if available
    const videoDuration = document.querySelector('.ytp-time-duration')?.textContent || 
                         'Unknown Duration';
    
    return {
      platform: 'YouTube',
      title: videoTitle.trim(),
      channel: channelName.trim(),
      description: videoDescription.trim().substring(0, 1000), // Limit description size
      duration: videoDuration,
      url: window.location.href
    };
  }
  
  // Generic video detection for other sites
  const videoElements = document.querySelectorAll('video');
  if (videoElements.length > 0) {
    return {
      platform: 'Generic',
      title: document.title,
      videoCount: videoElements.length,
      url: window.location.href
    };
  }
  
  return {
    platform: 'Unknown',
    title: document.title,
    message: 'No video detected on this page',
    url: window.location.href
  };
}
