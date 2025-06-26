import wikipedia

def search_wikipedia(query):
    query = query.replace("wikipedia", "")
    query = query.replace("search", "")
    if query == "":
        return "Please provide a search term."
    try:
        results = wikipedia.summary(query)
        return results
    except Exception as e:
        return f"An error occurred: {e}"

print(search_wikipedia("Python"))