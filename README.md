# L'Oréal Routine Builder

This project is a simple web app that helps users build a beauty routine with real L'Oréal family products.

Users can search and filter products, choose the items they want, and generate a routine guide based on their selections. 
The app also includes a chat-style assistant so users can ask follow-up questions about their routine.

## Technologies used

- HTML for structure
- CSS for layout and brand styling
- JavaScript for product selection, filtering, and routine generation
- Cloudflare Worker for secure OpenAI request handling
- OpenAI API key integration through the worker
- Local storage to keep selected products between visits

## Problems it solves

- Lets users find L'Oréal products quickly with search, category filters, and goal-based recommendations
- Helps users build a routine by selecting products and generating step-by-step guidance
- Supports follow-up questions in a chat-style experience so users can learn more about their routine
- Keeps the interface easy to use with keyboard support and clear product cards
- Handles missing product images gracefully so the page still looks polished
- Reflects L'Oréal’s premium style with consistent branding and clean layout
