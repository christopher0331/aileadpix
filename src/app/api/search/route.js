export async function POST(request) {
  try {
    const body = await request.json();
    const { searchTerm, location } = body;
    
    const API_KEY = "b17cd2e47c6dfbb5b3b04c524b935fdfea64452ce05f78bc85d9ad4b724b78b0";
    
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(location)}&api_key=${API_KEY}&engine=google&num=150`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("Search results:", data.organic_results?.length, "results found");
    
    return Response.json({ 
      success: true,
      results: data.organic_results || [],
      resultCount: data.organic_results?.length || 0
    });
  } catch (error) {
    console.error("Error in search API:", error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
