DESIGN A COMPLETE RESPONSIVE FRONTEND FOR THIS PRODUCT

PRODUCT NAME:
DocuMind AI

PRODUCT TYPE:
Private Multi-Source Knowledge Base and RAG-powered AI Assistant.

IMPORTANT:
Create the complete frontend UI/UX for the product described below.

This is a production-level SaaS product, not a concept/demo.

DO NOT invent features that are not described in this prompt.
DO NOT add unnecessary AI features, analytics, social features, payment pages, team collaboration, agents, image generation, web search, or unrelated functionality.

The interface must be clean, minimal, professional, modern, and highly usable.

==================================================
1. PRODUCT PURPOSE
==================================================

DocuMind AI allows users to create private knowledge bases from their own documents and YouTube videos.

Users can:

1. Create a Knowledge Base.
2. Upload multiple documents.
3. Add YouTube videos one by one.
4. Let the system process and index the content.
5. Ask natural-language questions about the content.
6. Receive AI-generated answers based on retrieved information.
7. View source citations supporting the answer.

The core experience is:

ADD SOURCES
→ PROCESS
→ ASK QUESTIONS
→ RETRIEVE INFORMATION
→ GENERATE ANSWER
→ VERIFY SOURCES

The product should feel like a serious knowledge workspace, NOT another ChatGPT clone.

==================================================
2. TARGET USERS
==================================================

Primary users:

- Students
- Researchers
- Developers
- Technical professionals
- People who work with large collections of documents

Example:

A student creates a Knowledge Base called:

"Generative AI Course"

and adds:

- RAG Introduction.pdf
- Advanced RAG.pdf
- Vector Databases.pdf
- Course Notes.docx
- YouTube lectures

The student can then ask:

"What is the difference between BM25 and vector search?"

The system returns an answer with relevant sources.

==================================================
3. DESIGN PHILOSOPHY
==================================================

The interface must prioritize simplicity.

The user should immediately understand:

1. Where their knowledge bases are.
2. How to add sources.
3. Where to ask questions.
4. Where the answer came from.

DO NOT expose advanced RAG terminology everywhere.

Normal users should NOT be overwhelmed by:

- embeddings
- vector databases
- BM25
- MMR
- RRF
- MultiQuery
- SelfQuery
- chunking

Those belong inside dedicated Advanced sections.

Use progressive disclosure.

The normal user experience should be:

Knowledge Base
→ Sources
→ Chat
→ Answer
→ Citations

Advanced users can access:

RAG Playground
Retrieval Inspector
Evaluation

==================================================
4. VISUAL STYLE
==================================================

Create a premium, professional SaaS interface.

Style:

- Minimal
- Clean
- Modern
- Professional
- Trustworthy
- Spacious
- Technical but approachable

COLOR DIRECTION:

Use a light-first design.

Primary:
- White
- Very light neutral backgrounds
- Black / dark neutral text

Accent:
- One restrained blue/indigo accent may be used sparingly for interactive elements.

Use neutral gray tones for secondary UI.

Avoid:

- Neon colors
- Heavy gradients
- Excessive purple
- Excessive blue
- Glassmorphism everywhere
- Huge glowing AI graphics
- Excessive shadows
- Excessive rounded cards
- Decorative elements that do not serve a purpose

Use subtle borders and restrained shadows.

==================================================
5. TYPOGRAPHY
==================================================

Use a modern professional sans-serif typeface.

Suggested:

Inter or similar.

Create a clear hierarchy:

- Large page headings
- Medium section headings
- Clear body text
- Small metadata text

Make typography highly readable.

==================================================
6. COMPONENT STYLE
==================================================

Use a consistent design system.

Components should include:

- Buttons
- Inputs
- Search fields
- Dropdowns
- Tabs
- Cards
- Dialogs
- Drawers
- Toasts
- Tooltips
- Badges
- Progress indicators
- Status indicators
- Tables/lists
- Chat messages
- Source citation cards
- File upload components
- Empty states
- Loading states
- Error states

Use moderate border radius.

Avoid making every element look like a floating card.

==================================================
7. RESPONSIVE DESIGN
==================================================

THIS IS CRITICAL.

Design the entire product for:

1. Desktop
2. Tablet
3. Mobile

Use responsive layouts rather than simply shrinking the desktop design.

Suggested breakpoints:

Desktop:
1440px

Tablet:
1024px / 768px

Mobile:
390px / 375px

The mobile design must be intentionally designed.

Desktop:
- Persistent sidebar

Tablet:
- Compact/collapsible sidebar

Mobile:
- Sidebar becomes a drawer
- Navigation accessible through menu button
- Content becomes single-column
- Chat input remains easy to use
- Source cards stack vertically
- Tables become mobile-friendly lists/cards

All important interactions must remain usable on mobile.

==================================================
8. PUBLIC PAGES
==================================================

Create the following public pages.

------------------------------------------
PAGE 1 — LANDING PAGE
------------------------------------------

Route:

/

Purpose:

Explain DocuMind AI clearly and encourage users to create an account.

Hero:

Headline:

"Turn Your Knowledge Into an AI You Can Ask Anything"

Supporting text:

"Upload documents, add YouTube videos, and ask questions about your own knowledge using grounded Retrieval-Augmented Generation."

Primary CTA:

"Create Knowledge Base"

Secondary CTA:

"See How It Works"

Include a simple visual explanation:

Your Sources
↓
RAG Processing
↓
AI Answer
↓
Sources

Sections:

1. Hero
2. How It Works
3. Supported Sources
4. RAG-powered Q&A explanation
5. Source citations explanation
6. Simple final CTA
7. Footer

Do NOT add:
- pricing
- testimonials
- fake customer logos
- fake statistics
- unnecessary marketing sections

------------------------------------------
PAGE 2 — LOGIN
------------------------------------------

Route:

/login

Design:

Centered authentication card.

Fields:

Email
Password

Actions:

Log In
Forgot Password

Link:

Create an account

Keep it minimal.

------------------------------------------
PAGE 3 — SIGN UP
------------------------------------------

Route:

/signup

Fields:

Name
Email
Password
Confirm Password

CTA:

Create Account

Link:

Already have an account? Log in

==================================================
9. APPLICATION LAYOUT
==================================================

After login, use a consistent application shell.

Desktop:

LEFT SIDEBAR
+
MAIN CONTENT

Sidebar:

DOCUMIND AI logo

Workspace:

Dashboard
Knowledge Bases

Advanced:

RAG Playground
Retrieval Inspector
Evaluation

Bottom:

Settings

User profile

Logout

Do not make the sidebar visually heavy.

Mobile:

Use a top navigation bar with:

Menu
Logo
User/profile

Sidebar opens as a drawer.

==================================================
10. DASHBOARD
==================================================

Route:

/dashboard

Purpose:

Simple starting point for the user.

Header:

"Good evening, [Name]"

Subtext:

"Manage your knowledge bases and continue your research."

Primary button:

"+ Create Knowledge Base"

Main section:

"Your Knowledge Bases"

Show knowledge base cards/list.

Each item:

Knowledge Base name
Description
Source count
Last updated
Open button

Optional small summary:

Knowledge Bases
Sources

Do not fill the dashboard with unnecessary analytics.

Include an empty state:

"You haven't created a knowledge base yet."

CTA:

"Create Your First Knowledge Base"

==================================================
11. KNOWLEDGE BASES PAGE
==================================================

Route:

/knowledge-bases

Title:

"Knowledge Bases"

Primary CTA:

"+ Create Knowledge Base"

Include:

Search

Knowledge base list/grid.

Each knowledge base displays:

Name
Description
Number of sources
Last updated
Open

Actions:

Rename
Delete

Keep the layout clean.

==================================================
12. CREATE KNOWLEDGE BASE
==================================================

Use a modal/dialog rather than a large separate page.

Fields:

Knowledge Base Name
Description (optional)

CTA:

"Create Knowledge Base"

After creation, navigate to the new Knowledge Base.

==================================================
13. KNOWLEDGE BASE WORKSPACE
==================================================

Route:

/knowledge-bases/[id]

The workspace is the core product.

Header:

Knowledge Base name

Show:

Source count

Actions:

Add Source
Settings/options

Main navigation tabs:

CHAT
SOURCES

Chat should be the default.

==================================================
14. CHAT PAGE
==================================================

Route:

/knowledge-bases/[id]/chat

THIS IS THE MOST IMPORTANT SCREEN.

Make it extremely clean.

Layout:

Knowledge Base header

Conversation area

User message

AI response

Source citations

Question input at bottom

Example:

USER:

"What is the difference between BM25 and vector search?"

AI:

"BM25 is a sparse retrieval technique that relies on keyword matching, while vector search retrieves information based on semantic similarity..."

Then:

Sources

[ Advanced RAG.pdf ]
Page 23

[ Vector Database Notes.docx ]
Section: BM25

The source citation area should be visually connected to the answer but not intrusive.

Chat input:

"Ask anything about your knowledge..."

Include:

Send button

Optional attachment/source selector only if it is part of the knowledge-base workflow.

Do NOT add:

- voice assistant
- image generation
- web search
- AI personas
- unnecessary chat modes

==================================================
15. CHAT STATES
==================================================

Design these states:

1. Empty chat

Show:

"Ask anything about your knowledge"

Small explanation:

"Your answers are generated from the sources in this knowledge base."

2. Active conversation

Show user and AI messages.

3. AI thinking/loading

Use a subtle loading indicator.

4. Streaming response

Show response progressively.

5. No relevant information

Show:

"I couldn't find enough information in your sources to answer this question."

6. Error

Clear retry action.

==================================================
16. SOURCES PAGE
==================================================

Route:

/knowledge-bases/[id]/sources

Title:

"Sources"

Primary button:

"+ Add Source"

Search input:

"Search sources..."

Filters:

All
Documents
YouTube

Source list.

Each source should display:

Icon
Name
Type
Processing status
Added date
Actions

Examples:

RAG Introduction.pdf
PDF
Ready

Advanced RAG.docx
DOCX
Processing

RAG Lecture 01
YouTube
Ready

Statuses:

Pending
Processing
Ready
Failed

Use subtle status badges.

==================================================
17. ADD SOURCE INTERFACE
==================================================

When user clicks:

"+ Add Source"

Open a modal/drawer.

Title:

"Add Source"

Two clear options:

OPTION 1:

Upload Documents

Supported:

PDF
DOCX
TXT
Markdown
CSV
XLSX

Show drag-and-drop upload area.

OPTION 2:

Add YouTube Video

Input:

"Paste YouTube URL"

Button:

"Add Video"

Do NOT add image upload in V1.

==================================================
18. DOCUMENT UPLOAD STATE
==================================================

After upload:

Show files in a processing list.

Example:

RAG Introduction.pdf
Uploading...

Advanced RAG.pdf
Processing...

Vector Database.pdf
Ready

Progress indicator.

Show clear errors for failed files.

==================================================
19. SOURCE DETAILS PAGE
==================================================

Route:

/knowledge-bases/[id]/sources/[sourceId]

Show:

Source name
Source type
Processing status

For documents:

- File information
- Page count if available
- Chunk count
- Metadata
- Document preview

For YouTube:

- Video title
- Thumbnail
- URL
- Transcript information
- Duration if available
- Timestamp information

Actions:

Delete Source

Do not make this page overly technical.

==================================================
20. SETTINGS
==================================================

Route:

/settings

Create a clean settings page with sections/tabs:

ACCOUNT

- Name
- Email
- Password

AI

- Model
- Temperature
- Max tokens

RETRIEVAL

- Default retrieval strategy
- Top K
- Similarity threshold
- MMR

USAGE

- Knowledge bases used
- Sources used
- Storage
- YouTube usage

Do not expose extremely technical parameters to normal users.

==================================================
21. ADVANCED SECTION
==================================================

Create a separate "Advanced" section in the sidebar.

These pages are intended for technical users and RAG experimentation.

Pages:

RAG Playground
Retrieval Inspector
Evaluation

Do not mix these interfaces into the normal Chat page.

==================================================
22. RAG PLAYGROUND
==================================================

Route:

/advanced/playground

Purpose:

Allow technical users to test retrieval strategies.

Header:

"RAG Playground"

Subtext:

"Experiment with retrieval strategies and inspect the results."

Controls:

Query input

Retriever:

Similarity Search
MMR
MultiQuery
BM25
Query Fusion

Top K

Similarity Threshold

Metadata filters

Button:

"Run Retrieval"

Results area:

Retrieved chunks.

Each result:

Source
Chunk text
Score/rank
Metadata

Keep this page technical but clean.

==================================================
23. RETRIEVAL INSPECTOR
==================================================

Route:

/advanced/inspector

Purpose:

Show how the RAG system processed a query.

Visualize:

Original Query
↓
Query Processing
↓
Retrieval
↓
Retrieved Chunks
↓
Fusion / Ranking
↓
Final Context
↓
LLM

Show:

- Query variations
- Retrieval strategy
- Retrieved sources
- Scores
- Metadata
- Final context

Use tabs or expandable sections.

Do not overwhelm the user.

==================================================
24. RAG EVALUATION
==================================================

Route:

/advanced/evaluation

Purpose:

Compare retrieval strategies.

Title:

"RAG Evaluation"

Controls:

Select Knowledge Base
Select evaluation dataset/query
Select retrieval strategies

Show comparison table:

Strategy
Relevance
Faithfulness
Citation correctness
Latency

Strategies:

Similarity
MMR
MultiQuery
BM25
Query Fusion

Use simple charts only where useful.

Do not create fake evaluation results.

Use placeholder/sample data only for the design prototype and clearly label it as sample data.

==================================================
25. EMPTY STATES
==================================================

Create professional empty states for:

- No knowledge bases
- No sources
- No conversations
- No evaluation data
- No retrieval results

Example:

"No sources yet"

"Add documents or YouTube videos to start asking questions."

CTA:

"+ Add Source"

==================================================
26. ERROR STATES
==================================================

Design error states for:

- Upload failed
- Unsupported file
- YouTube transcript unavailable
- Processing failed
- AI request failed
- No relevant information
- Network error

Always provide a useful action such as:

Retry
Try Again
Go Back

==================================================
27. DESIGN SYSTEM
==================================================

Create reusable components and styles.

Buttons:

Primary
Secondary
Ghost
Destructive

Inputs:

Default
Focus
Error
Disabled

Cards:

Knowledge Base
Source
Citation
Evaluation result

Badges:

Ready
Processing
Failed
Pending

Chat:

User message
AI message
Citation

Dialogs:

Create Knowledge Base
Add Source
Delete confirmation

==================================================
28. RESPONSIVE REQUIREMENTS
==================================================

Create responsive variants for EVERY major page.

Desktop:

1440px

Tablet:

768px–1024px

Mobile:

375px–390px

Important mobile behavior:

SIDEBAR:
Desktop → fixed sidebar
Mobile → slide-out drawer

KNOWLEDGE BASE:
Desktop → full workspace
Mobile → stacked layout

CHAT:
Desktop → large conversation area
Mobile → full-width conversation

CHAT INPUT:
Desktop → centered/max-width
Mobile → fixed/accessible bottom input

SOURCES:
Desktop → list/table
Mobile → stacked source cards

RAG PLAYGROUND:
Desktop → controls + results
Mobile → controls stacked above results

EVALUATION:
Desktop → comparison table
Mobile → responsive cards or horizontally scrollable table

Never allow horizontal overflow on normal pages.

==================================================
29. ACCESSIBILITY
==================================================

Design with accessibility in mind.

Use:

- Clear contrast
- Visible focus states
- Readable typography
- Appropriate button sizes
- Clear labels
- Meaningful icons
- Do not rely only on color to communicate status

Mobile touch targets should be comfortable.

==================================================
30. DESIGN OUTPUT
==================================================

Create the COMPLETE UI/UX design system and all pages.

Create:

1. Landing
2. Login
3. Signup
4. Dashboard
5. Knowledge Bases
6. Knowledge Base Chat
7. Knowledge Base Sources
8. Source Details
9. Add Source modal
10. Create Knowledge Base modal
11. Settings
12. RAG Playground
13. Retrieval Inspector
14. RAG Evaluation

Also create:

- Empty states
- Loading states
- Error states
- Success states
- Responsive versions
- Mobile navigation
- Dialogs
- Drawers
- Toasts

==================================================
31. IMPORTANT DESIGN RULE
==================================================

Do NOT make the product visually complicated.

The most important screens are:

1. Knowledge Base
2. Sources
3. Chat

The Chat screen should receive the most design attention.

The user should understand the product within seconds.

The interface should communicate:

"My sources are here.
I can ask questions here.
The AI tells me where the answer came from."

Advanced RAG functionality should be available when needed without cluttering the main experience.

==================================================
32. FINAL DESIGN GOAL
==================================================

The final design should look like a real production SaaS application that could be developed with:

Next.js
JavaScript
Tailwind CSS
shadcn/ui
FastAPI
LangChain
LlamaIndex
Chroma

The design should be realistic and implementable.

Do not design components that would be extremely difficult to implement in Next.js.

Prioritize:

CLARITY
USABILITY
RESPONSIVENESS
CONSISTENCY
SIMPLICITY
PROFESSIONALISM

The final product should feel like:

"An intelligent private knowledge workspace powered by RAG."

NOT:

"A generic AI chatbot."

Build the complete responsive frontend design based strictly on this specification.